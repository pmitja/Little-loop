import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesError, PurchasesPackage } from 'react-native-purchases';
import { useEntitlementStore } from '@/stores/entitlementStore';

/**
 * RevenueCat wrapper per PLAN §12, with the same dev-bypass pattern as Clerk/API:
 * no API key (or Expo Go without the native module) → a mock offering whose
 * "purchase" simply flips the cached entitlement, so the paywall and every
 * free-limit gate can be exercised before the RevenueCat project is wired.
 */
const REVENUECAT_KEY =
  // Test Store keys (test_…) are one key for both platforms; the App Store /
  // Play keys that ship to production are per-store, hence the fallback.
  process.env.EXPO_PUBLIC_REVENUECAT_KEY ||
  (Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY) ||
  '';

export const ENTITLEMENT_ID = 'premium';

export interface Plan {
  id: 'monthly' | 'yearly';
  productId: string;
  priceString: string;
  /** Numeric price in the plan's own currency — only for comparing the two plans. */
  price: number;
  /** e.g. "$2.92 / mo" — only on yearly. */
  subline: string;
  /** RevenueCat package identifier when live; mock plans carry their id. */
  rcPackageId: string;
}

const MOCK_PLANS: Plan[] = [
  {
    id: 'monthly',
    productId: 'll_premium_monthly',
    priceString: '$4.99',
    price: 4.99,
    subline: 'per month',
    rcPackageId: '$rc_monthly',
  },
  {
    id: 'yearly',
    productId: 'll_premium_yearly',
    priceString: '$34.99',
    price: 34.99,
    subline: '$2.92 / mo',
    rcPackageId: '$rc_annual',
  },
];

/**
 * What the yearly plan saves against 12× monthly, as a whole percent — the
 * "SAVE n%" badge. Null unless both plans are present and yearly is cheaper,
 * so a store that returns only one package can't render a nonsense badge.
 */
export function yearlySavingsPercent(plans: Plan[]): number | null {
  const monthly = plans.find((p) => p.id === 'monthly');
  const yearly = plans.find((p) => p.id === 'yearly');
  if (!monthly || !yearly || monthly.price <= 0) return null;
  const percent = Math.round((1 - yearly.price / (monthly.price * 12)) * 100);
  return percent > 0 ? percent : null;
}

type RC = typeof import('react-native-purchases').default;
type RCUI = typeof import('react-native-purchases-ui').default;

function loadNativeModule(): RC | null {
  if (!REVENUECAT_KEY) return null;
  try {
    return (require('react-native-purchases') as typeof import('react-native-purchases')).default;
  } catch {
    // Native module absent (Expo Go) — fall back to the mock flow.
    return null;
  }
}

const Purchases = loadNativeModule();
export const purchasesLive = Purchases !== null;

let configured = false;

/** Idempotent SDK init; call before any purchase/restore. */
export async function configurePurchases(clerkUserId?: string | null): Promise<void> {
  if (!Purchases) return;
  if (!configured) {
    if (__DEV__) await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: REVENUECAT_KEY });
    // Renewals, expirations, billing issues and purchases made on the user's
    // other devices only reach us through this listener — every other sync
    // point below is tied to an action taken in this app.
    Purchases.addCustomerInfoUpdateListener(syncEntitlement);
    configured = true;
  }
  if (clerkUserId) {
    const { customerInfo } = await Purchases.logIn(clerkUserId);
    syncEntitlement(customerInfo);
  }
}

function syncEntitlement(customerInfo: CustomerInfo) {
  useEntitlementStore.getState().setPremium(ENTITLEMENT_ID in customerInfo.entitlements.active);
}

/**
 * The live packages behind the plans getPlans() last returned, so purchasePlan()
 * buys the exact object the user saw a price for instead of re-fetching the
 * offering and matching it back up by identifier.
 */
const packageCache = new Map<Plan['id'], PurchasesPackage>();

/** Current offering as displayable plans (localized prices when live). */
export async function getPlans(): Promise<Plan[]> {
  if (!Purchases) return MOCK_PLANS;
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const plans: Plan[] = [];
  packageCache.clear();
  for (const pkg of packages) {
    const isYearly = pkg.packageType === 'ANNUAL';
    const isMonthly = pkg.packageType === 'MONTHLY';
    if (!isYearly && !isMonthly) continue;
    const id = isYearly ? 'yearly' : 'monthly';
    packageCache.set(id, pkg);
    plans.push({
      id,
      productId: pkg.product.identifier,
      priceString: pkg.product.priceString,
      price: pkg.product.price,
      subline: isYearly
        ? `${pkg.product.pricePerMonthString ?? ''} / mo`.trim()
        : 'per month',
      rcPackageId: pkg.identifier,
    });
  }
  return plans.length > 0 ? plans : MOCK_PLANS;
}

/** 'pending' = the store has the purchase but hasn't settled it (Ask to Buy, SCA). */
export type PurchaseResult = 'purchased' | 'cancelled' | 'pending' | 'failed';

export async function purchasePlan(plan: Plan): Promise<PurchaseResult> {
  if (!Purchases) {
    // Dev bypass: pretend the store sheet succeeded.
    useEntitlementStore.getState().setPremium(true);
    return 'purchased';
  }

  let pkg = packageCache.get(plan.id);
  if (!pkg) {
    await getPlans();
    pkg = packageCache.get(plan.id);
  }
  if (!pkg) return 'failed';

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    syncEntitlement(customerInfo);
    return ENTITLEMENT_ID in customerInfo.entitlements.active ? 'purchased' : 'failed';
  } catch (e) {
    const { code } = e as PurchasesError;
    if (code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    // Parental approval / bank challenge outstanding. The customer info
    // listener flips the entitlement if and when the store settles it.
    if (code === Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    // Already owned on this store account (reinstall, or a second device) —
    // the purchase is a no-op but a restore makes it ours again.
    if (code === Purchases.PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      return (await restorePurchases().catch(() => false)) ? 'purchased' : 'failed';
    }
    return 'failed';
  }
}

/** Restore purchases; returns whether premium is now active. */
export async function restorePurchases(): Promise<boolean> {
  if (!Purchases) {
    return useEntitlementStore.getState().premium;
  }
  const customerInfo = await Purchases.restorePurchases();
  syncEntitlement(customerInfo);
  return ENTITLEMENT_ID in customerInfo.entitlements.active;
}

/**
 * Detach the RevenueCat identity on sign-out, so the next parent to sign in on
 * this device starts anonymous rather than inheriting the previous entitlement.
 */
export async function logOutPurchases(): Promise<void> {
  if (!Purchases) {
    useEntitlementStore.getState().clearPremium();
    return;
  }
  await Purchases.logOut();
  useEntitlementStore.getState().clearPremium();
}

function loadUiModule(): RCUI | null {
  if (!Purchases) return null;
  try {
    return (require('react-native-purchases-ui') as typeof import('react-native-purchases-ui'))
      .default;
  } catch {
    return null;
  }
}

/**
 * RevenueCat's Customer Center — cancel, change plan, request a refund, restore.
 * Its contents are configured in the RevenueCat dashboard, not here.
 * Returns false when the SDK isn't live, so callers can fall back.
 */
export async function presentCustomerCenter(): Promise<boolean> {
  const RevenueCatUI = loadUiModule();
  if (!RevenueCatUI) return false;
  await RevenueCatUI.presentCustomerCenter({
    callbacks: {
      // A restore done inside the sheet has to reach our cache too.
      onRestoreCompleted: ({ customerInfo }) => syncEntitlement(customerInfo),
    },
  });
  return true;
}

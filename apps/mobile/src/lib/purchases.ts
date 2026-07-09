import { Platform } from 'react-native';
import { useEntitlementStore } from '@/stores/entitlementStore';

/**
 * RevenueCat wrapper per PLAN §12, with the same dev-bypass pattern as Clerk/API:
 * no API key (or Expo Go without the native module) → a mock offering whose
 * "purchase" simply flips the cached entitlement, so the paywall and every
 * free-limit gate can be exercised before the RevenueCat project is wired.
 */
const REVENUECAT_KEY =
  (Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY) ?? '';

export const ENTITLEMENT_ID = 'premium';

export interface Plan {
  id: 'monthly' | 'yearly';
  productId: string;
  priceString: string;
  /** e.g. "$2.92/mo · save 42%" — only on yearly. */
  subline: string;
  trialDays: number;
  /** RevenueCat package identifier when live; mock plans carry their id. */
  rcPackageId: string;
}

const MOCK_PLANS: Plan[] = [
  {
    id: 'monthly',
    productId: 'll_premium_monthly',
    priceString: '$4.99',
    subline: 'per month',
    trialDays: 0,
    rcPackageId: '$rc_monthly',
  },
  {
    id: 'yearly',
    productId: 'll_premium_yearly',
    priceString: '$34.99',
    subline: '$2.92/mo · save 42%',
    trialDays: 7,
    rcPackageId: '$rc_annual',
  },
];

type RC = typeof import('react-native-purchases').default;

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
    Purchases.configure({ apiKey: REVENUECAT_KEY });
    configured = true;
  }
  if (clerkUserId) {
    const { customerInfo } = await Purchases.logIn(clerkUserId);
    syncEntitlement(customerInfo);
  }
}

function syncEntitlement(customerInfo: { entitlements: { active: Record<string, unknown> } }) {
  useEntitlementStore.getState().setPremium(ENTITLEMENT_ID in customerInfo.entitlements.active);
}

/** Current offering as displayable plans (localized prices when live). */
export async function getPlans(): Promise<Plan[]> {
  if (!Purchases) return MOCK_PLANS;
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const plans: Plan[] = [];
  for (const pkg of packages) {
    const isYearly = pkg.packageType === 'ANNUAL';
    const isMonthly = pkg.packageType === 'MONTHLY';
    if (!isYearly && !isMonthly) continue;
    plans.push({
      id: isYearly ? 'yearly' : 'monthly',
      productId: pkg.product.identifier,
      priceString: pkg.product.priceString,
      subline: isYearly
        ? `${pkg.product.pricePerMonthString ?? ''} / mo`.trim()
        : 'per month',
      trialDays: isYearly ? 7 : 0,
      rcPackageId: pkg.identifier,
    });
  }
  return plans.length > 0 ? plans : MOCK_PLANS;
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'failed';

export async function purchasePlan(plan: Plan): Promise<PurchaseResult> {
  if (!Purchases) {
    // Dev bypass: pretend the store sheet succeeded.
    useEntitlementStore.getState().setPremium(true);
    return 'purchased';
  }
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find((p) => p.identifier === plan.rcPackageId);
    if (!pkg) return 'failed';
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    syncEntitlement(customerInfo);
    return ENTITLEMENT_ID in customerInfo.entitlements.active ? 'purchased' : 'failed';
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return 'cancelled';
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

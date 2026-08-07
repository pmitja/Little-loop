import { Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';
import { storage } from './storage';

/**
 * App Store rating prompt.
 *
 * Apple only shows the system sheet three times per user per year and gives us
 * no signal about whether it appeared, so a raw requestReview() call is easy to
 * waste. This module spends those calls deliberately: only after the parent has
 * had a few good moments, only once per app version, and never twice inside the
 * cooldown. Guideline 1.1.7 forbids a custom star prompt of our own, so there is
 * no pre-prompt here — the only dialog is Apple's.
 */

const APP_STORE_ID = '6792684159';
const STORAGE_KEY = 'review-prompt';
/** Good moments (a video approved and added) before the first ask. */
const HAPPY_MOMENTS_REQUIRED = 3;
/** Every later ask needs this many more on top. */
const HAPPY_MOMENTS_BETWEEN = 8;
const COOLDOWN_DAYS = 120;
/** Let the success navigation settle before Apple's sheet slides over it. */
const PROMPT_DELAY_MS = 1200;

interface ReviewState {
  happyMoments: number;
  lastPromptedAt: number | null;
  /** Apple resets its own quota per version; never ask twice on the same one. */
  lastPromptedVersion: string | null;
}

const EMPTY: ReviewState = { happyMoments: 0, lastPromptedAt: null, lastPromptedVersion: null };

const appVersion = Constants.expoConfig?.version ?? '0.0.0';

async function read(): Promise<ReviewState> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<ReviewState>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

async function write(state: ReviewState): Promise<void> {
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A rating prompt is never worth surfacing an error for.
  }
}

function isDue(state: ReviewState): boolean {
  if (state.lastPromptedVersion === appVersion) return false;
  const asksSoFar = state.lastPromptedAt ? 1 : 0;
  const threshold = HAPPY_MOMENTS_REQUIRED + asksSoFar * HAPPY_MOMENTS_BETWEEN;
  if (state.happyMoments < threshold) return false;
  if (state.lastPromptedAt && Date.now() - state.lastPromptedAt < COOLDOWN_DAYS * 86_400_000) {
    return false;
  }
  return true;
}

/**
 * Record a moment where the parent just got what they came for, and ask for a
 * rating if enough of them have stacked up. Safe to call from any success path;
 * it never throws and never blocks the caller.
 *
 * Only call this from parent-facing screens — the phone is handed to a child in
 * child mode, and a rating sheet there reaches the wrong person.
 */
export function recordHappyMoment(): void {
  void (async () => {
    const state = await read();
    const next = { ...state, happyMoments: state.happyMoments + 1 };
    if (!isDue(next)) {
      await write(next);
      return;
    }
    if (!(await StoreReview.isAvailableAsync().catch(() => false))) {
      await write(next);
      return;
    }
    // Written before the request: if the sheet does appear we must not ask
    // again, and Apple never tells us either way.
    await write({ ...next, lastPromptedAt: Date.now(), lastPromptedVersion: appVersion });
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, PROMPT_DELAY_MS);
  })();
}

/**
 * The explicit "Rate LittleLoop" tap. This one leaves the app for the store's
 * write-a-review page — the system sheet is silently dropped once the user is
 * out of quota, which would make the row look broken.
 */
export async function openStoreReviewPage(): Promise<void> {
  const url =
    Platform.OS === 'ios'
      ? `itms-apps://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`
      : `market://details?id=${Constants.expoConfig?.android?.package ?? 'app.littleloop.mobile'}`;
  const fallback =
    Platform.OS === 'ios'
      ? `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`
      : `https://play.google.com/store/apps/details?id=${Constants.expoConfig?.android?.package ?? 'app.littleloop.mobile'}`;
  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(fallback).catch(() => {});
  }
}

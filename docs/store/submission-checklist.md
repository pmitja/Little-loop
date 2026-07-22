# Store submission checklist

Status as of 2026-07-12. Covers Apple App Store + Google Play. Items marked
**[code]** are done in the repo; **[you]** needs a console, an account, or a
hosted URL and cannot be done from the codebase.

---

## 1. In-app requirements (the ones that get you auto-rejected)

| Requirement | Rule | Status |
| --- | --- | --- |
| In-app account deletion | Apple 5.1.1(v) | **[code] done** — Settings → "Delete account & data". Was written but never wired to any screen. |
| Terms (EULA) + Privacy links on the purchase screen | Apple 3.1.2 | **[code] done** — paywall footer links to both. |
| Terms + Privacy reachable from Settings | Apple 3.1.2 / Play | **[code] done** — Settings → About. `legal.tsx` existed but nothing linked to it. |
| Restore purchases | Apple 3.1.1 | **[code] done** — on the paywall *and* Settings → Subscription. A reinstalling subscriber lands in Settings as "free" and may never open the paywall. |
| Manage / cancel subscription | Apple 3.1.2 / Play | **[code] done** — Settings → "Manage subscription" opens RevenueCat's Customer Center (cancel, change plan, refund). Only shown to subscribers, which is correct. |
| Auto-renew disclosure: title, length, price, renewal terms | Apple 3.1.2 | **[code] done** — paywall footer. |
| No free trial anywhere | product decision | **[code] done** — removed from copy and never configured on the products. |

## 2. RevenueCat: production wiring **[you]**

Today the project (`proj49e1b278`) has **only a Test Store app**. Test Store
cannot ship. Before release:

1. Create the IAP products in **App Store Connect** and **Play Console** using the
   same identifiers already used in RevenueCat: `ll_premium_monthly` ($4.99),
   `ll_premium_yearly` ($34.99). No introductory offer / free trial.
2. Add an **App Store app** and a **Play Store app** in RevenueCat, with credentials:
   - Apple: In-App Purchase Key (.p8) + App Store Connect shared secret.
   - Google: Play service-account JSON, granted financial permissions.
3. Attach the store products to the existing entitlement `premium` and to the
   `default` offering's `$rc_monthly` / `$rc_annual` packages.
4. Put the resulting public SDK keys in `apps/mobile/.env` **and** in EAS
   (`eas env:create`), since production builds bundle them at build time:
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_…`)
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_…`)
   Leave `EXPO_PUBLIC_REVENUECAT_KEY` (the `test_…` key) **unset** in production —
   it takes precedence over the per-store keys and would ship a fake store.
5. **Webhook** — still unconfigured. Point it at
   `https://<api-host>/api/v1/webhooks/revenuecat` with the shared secret in the
   Authorization header, matching `REVENUECAT_WEBHOOK_SECRET` in the API env.
   Until this exists, `subscription_status` in Postgres is never written; the app
   works off the on-device entitlement, but you have no server-side record of
   renewals, cancellations, or billing issues.

## 3. Kids / families policy — the highest-risk area **[you]**

This is a children's app, so both stores apply their strictest track. Decide
deliberately, because it constrains the SDKs you may ship:

- **Apple Kids Category — decided.** Per PLAN.md: do **not** enroll. List as a
  parental-control/family utility, age rating 4+. The parent installs, configures,
  and PIN-gates the app; the child only uses a supervised sub-mode. This sidesteps
  Apple's no-third-party-analytics rule entirely, so Sentry is not a problem on iOS.
- **Google Play Families — same call needed, and it's not just a policy-text
  problem.** A developer's app was rejected for bundling `@sentry/react-native`
  while enrolled in Play's Families program — not because Sentry sends prohibited
  data (it doesn't; `sendDefaultPii: false` avoids the AAID/IMEI/MAC identifiers
  Play's data-practices policy actually bans), but because Play's automated **SDK
  Index** scanner flags the native `io.sentry:sentry-android` library in the
  compiled AAB regardless of behavior, and there's no dispute path once flagged
  ([forum thread](https://forum.sentry.io/t/sentry-sdk-not-allowed-in-google-play-families-program/13339),
  [SDK Index entry](https://play.google.com/sdks/details/io-sentry-sentry-android)).
  Gating Sentry off via `EXPO_PUBLIC_SENTRY_DSN` (as `monitoring.ts` already does)
  does **not** help here — that's a JS-level no-op; the native library still ships
  in the Android binary either way.
  `docs/store/data-safety.md` already documents the intended answer — target
  audience **"Parents"**, not children — which, if Play's questionnaire accepts it
  given the PIN-gated design, avoids the Families program the same way the Apple
  decision avoids Kids Category. Confirm this holds when you actually fill out
  Play Console's Target Audience & Content questionnaire; if Play forces children
  into the target audience anyway, Sentry becomes a real blocker on Android and
  would need to come out of the Android build specifically (a build-flavor
  change, not a config flag).
- **COPPA.** The app collects nothing from children (no search, no comments, no
  links out in child mode) — say so explicitly in the review notes.

## 4. Hosted URLs

Both stores require these as **public web URLs**; in-app screens don't satisfy them.
The in-app copy lives in `apps/mobile/src/app/(parent)/legal.tsx` — keep them identical.

- Privacy policy URL (Apple + Play) — **[code] done**: `apps/api/src/app/privacy/page.tsx`,
  served at `/privacy`.
- **Account deletion URL** (Play requirement — a way to request deletion from
  *outside* the app, in addition to the in-app flow) — **[code] done**:
  `apps/api/src/app/delete-account/page.tsx`, served at `/delete-account`.
- Terms of Use / EULA URL (Apple; standard Apple EULA is acceptable if you don't have your own) **[you]**.
- Support URL / contact email **[you]**.
- **[you]** Neither page resolves until `littleloopapp.com` is attached as a
  custom domain to the `apps/api` Vercel project — no domain wiring exists in
  the repo (`vercel.json` has no domain config), so register the domain,
  confirm/add it in the Vercel dashboard, and deploy.

## 5. Store metadata **[you]**

- **Apple:** App Privacy "nutrition labels" (declare Google sign-in email, RevenueCat
  purchase data, Sentry diagnostics); age rating; screenshots for every required
  device size; subscription group + localized display name and duration; review notes
  with a **demo account** (reviewers cannot sign up past a PIN gate blindly) and an
  explanation of YouTube embedded playback.
- **Play:** Data safety form (`docs/store/data-safety.md` has the source of truth);
  content rating questionnaire; target audience; store listing assets.
- Paid Apps agreement + banking/tax must be active in **both** consoles, or IAPs
  will not load at review time — a very common cause of "purchases don't work" rejections.

## 6. YouTube compliance **[you]**

Playback uses the official embedded player under `youtube-nocookie`. Do not strip or
overlay the player, disclose that videos may include platform ads (already in the
Terms text), and keep the channel-title attribution. Expect a reviewer question here;
answer it pre-emptively in the review notes.

## 7. Build

- iOS cannot be built locally on this Mac (Xcode 16.2 vs Expo SDK 54 — see
  the Xcode toolchain note). Use EAS: `eas build -p ios --profile production`.
- `appVersionSource: remote` is set in `eas.json`, so EAS owns build numbers.

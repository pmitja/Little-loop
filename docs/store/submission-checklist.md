# Store submission checklist

Status as of 2026-07-24. Covers Apple App Store + Google Play. Items marked
**[code]** are done in the repo; **[you]** needs a console, an account, or a
hosted URL and cannot be done from the codebase.

**Where things stand:** the iOS path is essentially clear — auth, billing, the
hosted pages and the production env are all wired and verified against live
services. What is left for iOS is store paperwork (§5) and the build itself
(§7). Android is further behind: no submit config, no Play credentials, and the
Sentry/Families question in §3 is still open.

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
| Sign in with Apple | Apple 4.8 | **[code] done** — mandatory because we offer Google. Native `expo-apple-authentication` sheet on iOS (not the web flow), see §2b. |

## 2. RevenueCat: production wiring

**iOS: done.** Project `proj49e1b278` now has a real **App Store app**
(`app1539a9b855`, bundle `app.littleloop.mobile`) alongside the old Test Store,
with the App Store Connect API key and the subscription key both configured.
`ll_premium_monthly` / `ll_premium_yearly` are attached to the `default`
offering's `$rc_monthly` / `$rc_annual` packages and to the `premium`
entitlement. The production SDK key `appl_IkcnQWRSITHixsLELZawPaENcgM` is set as
`EXPO_PUBLIC_REVENUECAT_IOS_KEY` in the EAS `production` environment and matches
the key RevenueCat reports for that app.

The webhook exists ("LittleLoop API (Vercel)") on the eight subscription-lifecycle
event types. It still points at `https://little-loop-api.vercel.app/...` rather
than the custom domain; both hosts answer, so this is cosmetic, but repointing it
at `https://www.littleloopapp.com/api/v1/webhooks/revenuecat` keeps one canonical
origin.

**Still open:**

- `REVENUECAT_API_KEY` is **not set** in the API env. Without it the server-side
  read-through fallback is dead, so a purchase whose webhook is delayed (or that
  predates webhook setup) will not grant the entitlement until the next webhook
  lands. Webhooks remain the primary path either way.
- **Android [you]** — no Play Store app in RevenueCat, no Play service-account
  JSON with financial permissions, no `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
  (`goog_…`) in the EAS production environment. The IAP products also still need
  creating in Play Console under the same identifiers.
- `EXPO_PUBLIC_REVENUECAT_KEY` (the `test_…` key) must stay **unset** in
  production — it takes precedence over the per-store keys and would ship a fake
  store. Verified unset today; `scripts/validate-production-env.mjs` fails the
  build if it reappears.

## 2b. Sign in with Apple **[code] done, live**

Apple guideline 4.8 makes this mandatory alongside the Google button. Shipped as
the **native** flow: `expo-apple-authentication` presents the system sheet and
the identity token goes to `signIn.social({ idToken })` — the parent never leaves
the app. Shared helper: `apps/mobile/src/features/auth/socialSignIn.ts`.

Apple Developer config: Services ID `app.littleloop.auth`, team `N8AZ384DPB`,
Sign in with Apple key `VZSJF2N6WM`, capability enabled on App ID
`app.littleloop.mobile`. The five `APPLE_*` env vars are set in Vercel for
Production and Preview; the provider is skipped entirely unless all five exist.
Apple's client secret is an ES256 JWT minted per request in `betterAuth.ts` — no
manual rotation despite Apple's six-month cap on that token.

Verified in production: `POST /api/auth/sign-in/social {"provider":"apple"}`
returns an `appleid.apple.com/auth/authorize` URL with
`client_id=app.littleloop.auth` and the `www` redirect URI, which also proves the
`.p8` is readable and signs correctly in the deployed runtime.

Two consequences worth remembering: Apple accounts arrive with **no display
name** (the identity token never carries one), and with "Hide My Email" the
address is an `@privaterelay.appleid.com` relay — which family sharing will show
to other caregivers.

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
- Support URL / contact email — `support@littleloopapp.com`, `/support` is live.
- **Domain: done.** `littleloopapp.com` is attached to the `little-loop-api`
  Vercel project and both pages return 200.

  The canonical host is **`www.littleloopapp.com`** — the bare domain 308s to it.
  Every URL registered with a third party (OAuth redirect URIs, Apple return
  URLs, the RevenueCat webhook, store listing links) must use the `www` form,
  because these services do not follow redirects. `BETTER_AUTH_URL` is set to the
  `www` origin to match.

## 5. Store metadata **[you]**

- **iPad — deferred to 1.1, decided 2026-07-24.** `supportsTablet` stays `false`
  for the 1.0 submission, so no iPad screenshots are required. This is a quality
  call, not an availability one: iPhone-only apps still install and run on iPad
  in a scaled window under a "Designed for iPhone" label. Enabling the flag alone
  would be worse than that — only 2 of 66 components read window dimensions, no
  list uses `numColumns`, and everything but the player is portrait-locked, so a
  native iPad build would render as a stretched single-column phone layout.
  Doing it properly means multi-column grids, wider max-widths, landscape
  support, and 13" iPad screenshots.
- **Apple categories — decided 2026-07-24:** Primary **Utilities**, Secondary
  **Education**. Chosen to stay consistent with the §3 decision to present as a
  parental-control utility rather than a children's content app; that framing is
  the argument if a reviewer asks why the app is not in the Kids Category. Do not
  pick **Kids** as the primary category — selecting it *is* how you enter the Kids
  Category track.
- **Apple:** App Privacy "nutrition labels" (declare Google **and Apple** sign-in email, RevenueCat
  purchase data, Sentry diagnostics); age rating; screenshots for every required
  device size; subscription group + localized display name and duration; review notes
  with a **demo account** (reviewers cannot sign up past a PIN gate blindly) and an
  explanation of YouTube embedded playback.
- **Play:** Data safety form (`docs/store/data-safety.md` has the source of truth);
  content rating questionnaire; target audience; store listing assets.
- **Apple business setup — verified 2026-07-24.** Paid Apps and Free Apps
  agreements Active, Slovenian bank account Active (EUR → USD), W-8BEN and the
  Certificate of Foreign Status Active, Digital Services Act Active. The account
  is registered as an **individual**, not an entity — W-8BEN rather than
  W-8BEN-E — so any further compliance form must be filled consistently.
  **Outstanding: DAC7 shows "Missing Info"**, and Apple's own banner says this can
  block submitting new apps, not just payouts. Needs the TIN, the s.p.
  registration number, and date/place of birth.
- The Play side of this is untouched: no merchant account, no banking or tax
  setup, so Android IAPs cannot load at review time — a very common cause of
  "purchases don't work" rejections.

## 6. YouTube compliance **[you]**

Playback uses the official embedded player under `youtube-nocookie`. Do not strip or
overlay the player, disclose that videos may include platform ads (already in the
Terms text), and keep the channel-title attribution. Expect a reviewer question here;
answer it pre-emptively in the review notes.

## 7. Build

- iOS cannot be built locally on this Mac (Xcode 16.2 vs Expo SDK 54 — see
  the Xcode toolchain note). Use EAS: `eas build -p ios --profile production`.
- `appVersionSource: remote` is set in `eas.json`, so EAS owns build numbers.
  `submit.production.ios.ascAppId` is `6792684159`; **there is no
  `submit.production.android` block and no Play service-account key**, so
  `eas submit -p android` cannot run yet.
- The EAS `production` environment is verified to satisfy
  `scripts/validate-production-env.mjs` (wired as `eas-build-pre-install`, so a
  bad env fails the build rather than shipping):
  `EXPO_PUBLIC_API_URL=https://www.littleloopapp.com/api/v1`,
  `EXPO_PUBLIC_INVITE_URL=https://www.littleloopapp.com/invite`,
  `EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_…`. An **Android** production build will
  fail this check until `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` is added.
- `EXPO_PUBLIC_SENTRY_DSN` is **not** set in the production environment, so
  release builds ship with crash reporting inert. Deliberate or not, decide
  before submitting — on Android leaving it unset is the safer read given §3.
- Sign in with Apple was enabled on the App ID after the last provisioning
  profile was issued, so let EAS regenerate credentials on the next build rather
  than reusing a cached profile.

# Store data forms — prepared answers

_Phase 5 store-readiness. Fill these into App Store Connect (App Privacy) and
Play Console (Data safety) verbatim unless the integrations change._

## Apple App Privacy ("privacy nutrition label")

**Data used to track you:** None. (No cross-app tracking, no IDFA — do not
show the ATT prompt.)

**Data linked to you:**
- Contact info → Email address (Google **or Apple** sign-in; app functionality).
  With Apple's "Hide My Email" this is an `@privaterelay.appleid.com` relay
  address, but it is still an email address for labelling purposes.
- Contact info → **Name** (app functionality). Verified against the database, not
  assumed: better-auth's `user` row stores `name` and `image` from the identity
  provider, and both are populated for the existing Google account. The parent's
  first name is shown in the app. Apple accounts arrive without a name, but the
  label must reflect what we *can* receive. The avatar URL in `image` is covered
  by "Other user content" below rather than as Photos — we never touch a photo
  library, we store a URL the provider hands us.
- Identifiers → User ID (better-auth user id, RevenueCat app-user id; app functionality)
- Purchases → Purchase history (RevenueCat subscription status; app functionality)
- User content → Other user content (child nickname/avatar/settings, approved
  video list, and Premium family watch activity; app functionality)

**Data not linked to you:**
- Diagnostics → Crash data, performance data (Sentry; app functionality).
  Configured with `sendDefaultPii: false`.
  **Declare this only if Sentry actually ships.** `EXPO_PUBLIC_SENTRY_DSN` is not
  set in the EAS `production` environment, and `monitoring.ts` no-ops without a
  DSN, so as things stand a release build collects no diagnostics at all and this
  line should be omitted. Decide the DSN before filling the form.

**Not collected:** location, contacts, photos, browsing history, search
history, health, financial info, messages, audio.

## Google Play Data safety

- Collects data: **Yes** — Email address (account management, required),
  User IDs (app functionality, required), Purchase history (app functionality,
  required), Crash logs & diagnostics (app functionality, optional in effect
  but declared as collected).
- Data shared with third parties: **No** (processors — Google (sign-in),
  RevenueCat, Sentry — act on our behalf; this counts as "collected", not
  "shared", per Play policy).
- Data encrypted in transit: **Yes.**
- Users can request deletion: **Yes** — in-app (Settings → Delete account &
  data) and via support@littleloopapp.com (the address the hosted pages actually
  publish; there is no privacy@ mailbox). Deletion URL for the form:
  https://www.littleloopapp.com/delete-account — the `www` host is canonical and
  the bare domain only 308s to it.
- Target audience: **Parents.** The app is used by children under parental
  supervision in a locked mode that collects nothing; declare under Families
  policy accordingly and complete the Teacher/Families questionnaire with
  "app is designed for parents; child mode collects no data".

## App Review notes (both stores)

- Demo login: **there is none, and none can exist.** Auth is social-only
  (Sign in with Apple / Google) — there is no email-and-password path to hand a
  reviewer, so the old `review@littleloopapp.com` credentials were never real.
  Tell the reviewer instead: *"Tap **Continue with Apple** on the first screen
  and use any Apple ID, including the review account — it creates the parent
  account in one step. Then set any 4-digit parent PIN when prompted; that PIN is
  chosen by the user at setup and is stored only on the device."*
  Leave the demo-account fields in App Store Connect **empty** and put this in
  the notes; supplying fake credentials that fail is itself a rejection.
- Flow to review the lock: Dashboard → "Start Child Mode" → gate → Start.
  Exit requires the PIN the reviewer set during onboarding (padlock, top right).
  Hardware back on Android shows the "Ask a parent" modal by design.
- Video playback uses YouTube's official embedded IFrame player against
  youtube-nocookie.com with the documented player parameters; we do not
  modify, overlay, or strip the player's content, and we state in-app that
  videos may include platform ads.
- Account deletion: Settings → Delete account & data (double confirmation).
- Subscriptions: `ll_premium_monthly` $4.99, `ll_premium_yearly` $34.99, no free
  trial, via RevenueCat. Restore Purchases is on the paywall.

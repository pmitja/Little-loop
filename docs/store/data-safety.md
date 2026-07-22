# Store data forms — prepared answers

_Phase 5 store-readiness. Fill these into App Store Connect (App Privacy) and
Play Console (Data safety) verbatim unless the integrations change._

## Apple App Privacy ("privacy nutrition label")

**Data used to track you:** None. (No cross-app tracking, no IDFA — do not
show the ATT prompt.)

**Data linked to you:**
- Contact info → Email address (Google sign-in; app functionality)
- Identifiers → User ID (better-auth user id, RevenueCat app-user id; app functionality)
- Purchases → Purchase history (RevenueCat subscription status; app functionality)
- User content → Other user content (child nickname/avatar/settings, approved
  video list, and Premium family watch activity; app functionality)

**Data not linked to you:**
- Diagnostics → Crash data, performance data (Sentry; app functionality).
  Configured with `sendDefaultPii: false`.

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
  data) and via privacy@littleloopapp.com. Deletion URL for the form:
  https://littleloopapp.com/delete-account
- Target audience: **Parents.** The app is used by children under parental
  supervision in a locked mode that collects nothing; declare under Families
  policy accordingly and complete the Teacher/Families questionnaire with
  "app is designed for parents; child mode collects no data".

## App Review notes (both stores)

- Demo login: `review@littleloopapp.com` / password supplied in the review notes
  field at submission time. Parent PIN for the demo build: **1234**.
- Flow to review the lock: Dashboard → "Start Child Mode" → gate → Start.
  Exit requires the PIN (padlock, top right). Hardware back on Android shows
  the "Ask a parent" modal by design.
- Video playback uses YouTube's official embedded IFrame player against
  youtube-nocookie.com with the documented player parameters; we do not
  modify, overlay, or strip the player's content, and we state in-app that
  videos may include platform ads.
- Account deletion: Settings → Delete account & data (double confirmation).
- Subscriptions: `ll_premium_monthly` $4.99, `ll_premium_yearly` $34.99, no free
  trial, via RevenueCat. Restore Purchases is on the paywall.

# LittleLoop — Build Phases

Companion to `PLAN.md`. Six phases, each ends in something runnable and reviewable. Screen numbers (sNN) refer to the design file `littleloop-parent-controlled-kids-playlist-app/project/LittleLoop.dc.html`.

```
Phase 0 ─ Foundation ─► Phase 1 ─ Design system + Auth/Onboarding
        ─► Phase 2 ─ Parent core (playlists + YouTube)
        ─► Phase 3 ─ Child mode + player + timer
        ─► Phase 4 ─ Monetization + activity
        ─► Phase 5 ─ Hardening + store launch
```

---

## Phase 0 — Foundation (≈1 week)

**Goal:** clean monorepo where app, API, and DB run locally and deploy from CI.

**Scope**
- pnpm workspaces + Turborepo: `apps/mobile`, `apps/api`, `packages/shared`, `packages/db` (PLAN §3).
- Expo app scaffold (TypeScript, Expo Router), runs on iOS simulator + Android emulator.
- Next.js API scaffold deployed to Vercel Hobby; `/api/v1/health` live.
- **Rotate the Neon password** (it was exposed in chat), then Drizzle schema (PLAN §7) + first migration applied to Neon; seed script.
- Clerk project wired: Expo provider on mobile, JWT verification helper on API.
- `POST /users/sync` + device registration working end to end (sign in on device → row in Neon).
- CI: lint, typecheck, unit tests on PR. `.env.example` for all vars (PLAN §20).

**Exit criteria:** fresh clone → `pnpm i && pnpm dev` → app boots, signs in with Clerk, user appears in Neon; CI green.

---

## Phase 1 — Design system, onboarding, PIN, profile (≈1.5 weeks)

**Goal:** everything up to an empty playlist, pixel-matched to the design.

**Scope**
- `theme/tokens.ts` (colors/radii/type from the design), Nunito fonts loaded.
- All design-system components (PLAN §14): Button, Card, ScreenContainer, ParentHeader, PINKeypad + PINDots, ChildAvatar (6 SVG avatars), EmptyState, SettingsRow, SectionLabel, custom TabBar. Internal `/gallery` dev screen for visual sign-off.
- Screens: splash s01, onboarding pager s02–s04 (skip + dots + persistence), Clerk sign-up/sign-in themed screens, PIN setup + confirm s05 (SecureStore hash, PLAN §11), Face ID opt-in, child profile creation s06 (`POST /child-profiles`), empty playlist s07.
- State: Zustand stores + MMKV persistence (appStore, lockStore), TanStack Query + authed API client.

**Exit criteria:** first-install flow runs start to finish on device: splash → onboarding → sign-up → PIN → child profile → empty playlist; relaunch resumes correctly; s01–s07 visually match the design.

---

## Phase 2 — Parent core: playlist CRUD + YouTube (≈1.5 weeks)

**Goal:** a parent can build, preview, and manage an approved playlist.

**Scope**
- `extractYouTubeId` in `packages/shared` with full URL fixture tests (PLAN §9).
- API: `POST /videos/preview` (YouTube Data API + validation + `video_metadata` caching), playlist video endpoints — add (409 duplicate), remove, reorder (PLAN §8).
- Screens: add video s08, preview & approve s09, playlist management s11 (drag reorder via `react-native-draggable-flatlist`, remove with confirmation), parent dashboard s10 (greeting, stats card, action grid, coral Start Child Mode card), settings s18 shell (PIN change, Face ID toggle, time-limit row, static links).
- Edge cases from PLAN §15: invalid link, duplicate, private/unavailable, non-embeddable, quota exceeded, offline add disabled.

**Exit criteria:** paste a real YouTube link → preview with title/channel/duration/thumbnail → approve → appears in playlist → reorder and remove work and persist; dashboard reflects live counts; s08–s11 + s18 match design.

---

## Phase 3 — Child mode, player, timer (≈2 weeks) · the product's core promise

**Goal:** hand the phone to a child safely.

**Scope**
- Child-mode state machine + navigator swap; persisted flag restores into child mode after kill (PLAN §10).
- Screens: child mode gate s12, child home s13 (oversized cards, TimerBadge, dimmed padlock), child player s14 (WebView + IFrame API bridge, custom coral controls, up-next card), landscape fullscreen s14b, LockedModal s15, time-for-a-break s16.
- WebView lockdown: navigation interception, touch overlay, end-state takeover, `youtube-nocookie` params (PLAN §9).
- PIN unlock modal (reuses keypad) with 5-attempt lockout; Android back interception; gesture disabling; ChildModeHeader + dark TimerBadge.
- Timer: per-child daily limit, 1 Hz tick while playing, 2-minute warning, T=0 → pause + s16; watch-session API (start/heartbeat/end) + local reconciliation after app kill (PLAN §13).
- Guided Access / screen pinning tip sheet.

**Exit criteria:** full loop on device — gate → child home → play video → back press shows LockedModal → PIN exits; timer counts only during playback, warns at 2 min, ends at 0 with s16; killed app relaunches into child mode; taps on the embedded player never escape to YouTube UI.

---

## Phase 4 — Monetization + activity (≈1 week)

**Goal:** free limits enforced, premium purchasable, activity visible.

**Scope**
- RevenueCat: SDK init, `logIn(clerkUserId)`, offerings; paywall s19 (plan cards, trial copy, restore); webhook → `subscription_status` (PLAN §12).
- Free-limit gates client + server (1 profile / 1 playlist / 10 videos → 402 → paywall); expiration behavior (keep content, block adds).
- Entitlement store with offline cache; Settings upgrade banner.
- Activity screen s17: today vs limit, 7-day bars, most watched, session list from `GET /activity` (free tier: local session data, per the "stored only on this device" copy).

**Exit criteria:** sandbox purchase unlocks 2nd profile/11th video; restore works on reinstall; webhook updates Neon; s17 + s19 match design.

---

## Phase 5 — Hardening + store launch (≈1.5 weeks)

**Goal:** ship v1.0.

**Scope**
- Full edge-case matrix (PLAN §15), Sentry, security events, API rate limiting, nightly video-availability re-check (Vercel cron), forgot-PIN email reset flow.
- Testing per PLAN §19: unit suites complete, API ownership/limit tests, Maestro E2E flows (onboarding, add video, child-mode lock, timer, paywall), manual child-lock matrix on both platforms.
- Account deletion (Apple requirement), privacy policy, data-safety forms.
- Store assets from s20, app icon/splash, review notes (demo login + PIN), TestFlight + Play internal track → submission.

**Exit criteria:** E2E suite green, manual lock matrix passes on iOS + Android, builds submitted to both stores.

---

## Deferred (post-1.0)

Advanced time schedules, multiple playlists UI, premium avatar pack, "+15 min today" grant, activity cloud sync, offline mutation queue, PostHog analytics, Next.js admin dashboard, additional video providers.

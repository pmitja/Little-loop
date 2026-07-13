# LittleLoop — Technical Implementation Plan

**Version 1.0 · 2026-07-08**
Source of truth for UI: `littleloop-parent-controlled-kids-playlist-app/project/LittleLoop.dc.html` (screens s01–s20 + s14b). All screens must be implemented 1:1 with the design.

> ⚠️ **Security note before anything else:** the Neon connection string was shared in plaintext in chat. Treat it as compromised — rotate the password in the Neon console before launch, and only ever store it in `.env` files (git-ignored) / Vercel env vars. This plan references it only as `DATABASE_URL`.

---

## 1. Product interpretation

LittleLoop is a **whitelist-only video player** with two hard-separated modes in one app:

- **Parent Mode** (default): authenticated parent manages child profiles, builds playlists by pasting video links, previews and explicitly approves each video, sets daily watch limits, and reviews activity. Cream background (`#FFF9F1`), white cards, sky-blue CTAs (`#5BAEF7`), 4-tab bottom nav (Home / Playlist / Activity / Settings).
- **Child Mode** (explicitly entered, PIN-gated exit): a single scrollable column of oversized video cards from the approved playlist and a distraction-free player. Warm gradient background, coral accents (`#FF8A7A`), zero chrome, no tabs, no links, no settings. Every attempted exit or protected interaction shows the "Ask a parent" locked modal (s15); exiting requires the parent PIN or biometrics.

Technically this means:

1. **The child surface renders only server/local data the parent approved.** The playlist is the entire universe of content. There is no search input, no query API reachable from child screens, no deep-link handling while child mode is active.
2. **Playback uses the official YouTube IFrame embed inside a WebView**, locked down: navigation interception, no related-video taps, custom native controls overlaying the iframe. We never download or rehost video.
3. **Child mode is an app-level state machine**, not just a route: `childMode.active === true` swaps the entire navigator, disables gestures back to parent routes, and re-locks on background/foreground.
4. **Watch time is metered locally and synced to the server** — daily limit countdown, 2-minute warning, and the "Time for a break" screen (s16).
5. **Monetization is entitlement-gated feature limits** (free: 1 profile / 1 playlist / 10 videos) enforced both client-side (UX) and server-side (authoritative), driven by RevenueCat.

Wording rules baked into all copy: "video link", "approved video", "embedded player — approved source only". Never "YouTube app", never "ad-free".

## 2. Architecture overview

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Expo React Native app      │  HTTPS │  Next.js (App Router) on     │
│  - Expo Router              │◄──────►│  Vercel — /api/v1/* route    │
│  - Zustand + MMKV cache     │        │  handlers (REST, zod)        │
│  - expo-secure-store (PIN)  │        │  - Drizzle ORM               │
│  - react-native-webview     │        │  - Clerk JWT verification    │
│  - RevenueCat SDK           │        │  - YouTube Data API proxy    │
│  - Clerk Expo SDK           │        │  - RevenueCat webhook        │
└──────────┬──────────────────┘        └──────┬───────────────────────┘
           │                                   │
           │ oEmbed/IFrame embed               │ SQL (pooled, ssl)
           ▼                                   ▼
   YouTube embedded player            Neon Postgres (eu-central-1)
   (youtube-nocookie.com)
```

**Choices and cost rationale (all effectively $0 until real traction):**

| Concern | Choice | Why / cost |
|---|---|---|
| Backend | **Next.js 15 App Router API routes on Vercel Hobby** | Free tier, zero ops, same repo later hosts the admin dashboard. NestJS adds servers and cost for no benefit at this scale. |
| DB | **Neon Postgres + Drizzle ORM** | Provided. Use the **pooled** connection string with `@neondatabase/serverless` driver (HTTP) — required for Vercel serverless. Free tier covers MVP. |
| Auth | **Clerk (Expo SDK + backend JWT verification)** | Free to 10k MAU, prebuilt email/Apple/Google sign-in, no auth code to maintain. |
| Subscriptions | **RevenueCat** | Free below $2.5k MTR. Client SDK for paywall + server webhook for authoritative entitlements. |
| Video metadata | **YouTube Data API v3, called only from the backend** | Free 10k units/day quota; `videos.list` costs 1 unit → ~10k adds/day. API key never ships in the app. |
| Playback | **YouTube IFrame Player API in `react-native-webview`** | Only compliant option; `youtube-nocookie.com` privacy-enhanced mode. |
| Local storage | **MMKV** (state persistence, playlist cache) + **expo-secure-store** (PIN hash, biometric flag) | MMKV is fast and simple; SQLite is unnecessary for this data volume. |
| Analytics | **PostHog (EU cloud, free tier) — parent-mode only, no child-mode events with identifiers** | See §16. Optional for MVP. |
| Errors | **Sentry free tier** | Crash visibility. |

**Offline model:** the mobile app is read-through cached. Playlist + metadata + settings persist in MMKV; child mode works offline for UI (video playback itself needs network). Mutations require network (MVP); a write queue is a "later" item.

## 3. Repository structure

Single **monorepo** with pnpm workspaces + Turborepo:

```
little-loop/
├── apps/
│   ├── mobile/                  # Expo app
│   │   ├── app/                 # Expo Router routes (see §4)
│   │   ├── src/
│   │   │   ├── components/      # design-system components (§14)
│   │   │   ├── features/        # playlist/, child-mode/, timer/, paywall/, activity/
│   │   │   ├── stores/          # Zustand stores (§6)
│   │   │   ├── lib/             # api client, mmkv, secure-store, revenuecat, clerk
│   │   │   └── theme/           # tokens.ts (colors, radii, spacing, typography)
│   │   ├── assets/              # fonts (Nunito), avatars, icon, splash
│   │   ├── app.config.ts
│   │   └── package.json
│   └── api/                     # Next.js backend (later also admin dashboard)
│       ├── app/api/v1/...       # route handlers
│       ├── src/
│       │   ├── db/              # drizzle client
│       │   ├── services/        # youtube.ts, entitlements.ts, sessions.ts
│       │   ├── auth.ts          # Clerk verification helper
│       │   └── validation/      # zod schemas (re-export from packages/shared)
│       ├── drizzle.config.ts
│       └── package.json
├── packages/
│   ├── shared/                  # @littleloop/shared — zod schemas, API types, constants
│   │   └── src/{schemas,types,constants}/   # FREE_LIMITS, video-id parsing, etc.
│   └── db/                      # @littleloop/db — Drizzle schema + migrations
│       ├── src/schema.ts
│       └── migrations/
├── design/                      # the handoff bundle (read-only reference)
├── e2e/                         # Maestro flows
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

Shared zod schemas in `packages/shared` are used by both the API (validation) and the app (types + client-side validation), so request/response contracts can't drift.

## 4. Mobile app screen map (1:1 with design)

Expo Router file-based routes. Route groups define the four zones; `(child)` is rendered by a **separate navigator swap**, not a sibling stack (see §10).

| # | Design screen | Route file | Zone |
|---|---|---|---|
| s01 | Splash | `app/index.tsx` (bootstrap + redirect; native splash via `expo-splash-screen`) | public |
| s02 | Onboarding · Value | `app/(onboarding)/welcome.tsx` (pager page 1) | public onboarding |
| s03 | Onboarding · No browsing | same pager, page 2 | public onboarding |
| s04 | Onboarding · Child mode | same pager, page 3 | public onboarding |
| — | Sign in / Sign up (needed before data sync; Clerk prebuilt style-matched screens) | `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx` | auth |
| s05 | Parent PIN setup | `app/(onboarding)/pin-setup.tsx` (+ confirm step in-component) | onboarding (also reused from settings) |
| s06 | Child profile creation | `app/(onboarding)/child-profile.tsx` (reused as `app/(parent)/profiles/new.tsx`) | onboarding / parent |
| s07 | Empty first playlist | `app/(parent)/(tabs)/playlist.tsx` — empty state variant | parent |
| s08 | Add video link | `app/(parent)/add-video.tsx` (modal presentation) | parent |
| s09 | Video preview & approval | `app/(parent)/review-video.tsx` (modal) | parent |
| s10 | Parent dashboard | `app/(parent)/(tabs)/index.tsx` | parent |
| s11 | Playlist management | `app/(parent)/(tabs)/playlist.tsx` — populated variant (drag-reorder) | parent |
| s12 | Child mode entry gate | `app/(parent)/child-mode-gate.tsx` | parent |
| s13 | Child mode home | `app/(child)/index.tsx` | child |
| s14 | Child video player | `app/(child)/player.tsx` | child |
| s14b | Fullscreen player (landscape) | same route, orientation-driven layout | child |
| s15 | Locked action modal | `components/LockedModal.tsx` (overlay, not a route) | child |
| s16 | Time for a break | `app/(child)/times-up.tsx` | child |
| s17 | Activity | `app/(parent)/(tabs)/activity.tsx` | parent |
| s18 | Settings | `app/(parent)/(tabs)/settings.tsx` | parent |
| s19 | Paywall | `app/paywall.tsx` (modal, reachable from parent zone) | subscription |
| s20 | App Store preview | marketing asset only — produced at store-readiness milestone, not an app screen | — |
| — | PIN unlock (exit child mode / re-auth) | `app/pin-unlock.tsx` (modal over any zone; reuses s05 keypad UI) | shared |

Also from the design: tab bar order/icons are Home, Playlist, Activity, Settings (s10/s11/s17/s18); the "Preview Child Mode" button on s11 routes to the s12 gate.

## 5. Navigation flows

- **First install:** native splash → `index.tsx` reads MMKV `onboardingComplete` → false → `(onboarding)/welcome` pager (s02–s04, Skip jumps to end) → `(auth)/sign-up` → `pin-setup` (enter + confirm + offer Face ID) → `child-profile` (s06) → playlist empty state (s07).
- **Returning user:** splash → session valid → `(parent)/(tabs)` dashboard (s10). If `childMode.active` was persisted `true` (app killed during child mode), restore **into child mode**, not parent mode.
- **Login on new device:** sign-in → server sync pulls profiles/playlists → if no local PIN, require PIN re-entry setup (PIN is per-device; see §11) → dashboard.
- **First video:** s07 "Add Video" → s08 paste link → "Preview Video" calls `POST /videos/preview` → s09 preview card + approval checkbox → "Add to Playlist" → back to s11 populated list.
- **Entering child mode:** dashboard coral card or s11 "Preview Child Mode" → s12 gate (shows avatar, video count, limit) → "Start Child Mode" → store flips, navigator swaps to `(child)`, timer starts.
- **Exiting child mode:** child taps padlock (s13 top-right) or "Parent unlock" (s15/s16) → `pin-unlock` modal → correct PIN or Face ID → store flips back → parent dashboard. Wrong PIN ×5 → 30 s cooldown.
- **Timer ending:** at T−2 min the TimerBadge turns amber and pulses + gentle toast; at T=0 player pauses, navigate to s16 `times-up` — child mode remains active; only "Parent unlock" leads anywhere.
- **Paywall triggers:** attempting 11th video, 2nd playlist, or 2nd child profile → `paywall` modal (s19); also Settings "Upgrade" banner. Purchase success → entitlement refresh → retry the gated action.
- **Restore purchases:** s19 "Restore Purchases" → `Purchases.restorePurchases()` → entitlement update + confirmation toast.

## 6. State management plan

**Zustand stores (client), persisted to MMKV where noted:**

```ts
// stores/authStore.ts — thin wrapper over Clerk hooks; not persisted (Clerk handles tokens)
interface AuthState { status: 'loading'|'signedOut'|'signedIn'; userId?: string }

// stores/appStore.ts — persisted
interface AppState {
  onboardingComplete: boolean;
  activeChildProfileId: string | null;
}

// stores/lockStore.ts — PIN/child-mode state; persisted (except transient fields)
interface LockState {
  pinSet: boolean;
  biometricEnabled: boolean;
  childMode: { active: boolean; enteredAt: number | null };
  failedAttempts: number;         // persisted
  lockoutUntil: number | null;    // persisted
}

// stores/timerStore.ts — persisted per child per day
interface TimerState {
  dateKey: string;                    // 'YYYY-MM-DD' in device tz
  secondsWatchedToday: Record<string, number>; // childProfileId -> seconds
  activeSession: { id: string; videoId: string|null; startedAt: number } | null;
}

// stores/entitlementStore.ts — persisted (offline grace)
interface EntitlementState {
  isPremium: boolean;
  expiresAt: string | null;
  lastVerifiedAt: number;
}
```

**Server state** via **TanStack Query** (playlists, videos, profiles, activity, settings), with MMKV as the query persister so the child home and parent lists render instantly offline. Zustand holds *device/UI truth*; TanStack Query holds *server truth*; never duplicate server entities into Zustand.

Cached playlist videos: query cache keyed `['playlist', playlistId, 'videos']`, persisted; thumbnails cached by `expo-image`.

## 7. Database schema (Neon Postgres + Drizzle)

`packages/db/src/schema.ts` (abridged — all tables get `created_at`/`updated_at` timestamptz defaults):

```ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  revenuecatAppUserId: text('revenuecat_app_user_id').unique(),
});

export const childProfiles = pgTable('child_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  nickname: text('nickname').notNull(),          // nickname only — no PII, no birthdate
  ageRange: text('age_range', { enum: ['2-4','5-7','8-10'] }).notNull(),
  avatar: text('avatar').notNull().default('bear'), // bear|fox|bunny|dino|star|rocket (+premium)
  dailyLimitMinutes: integer('daily_limit_minutes'),          // null = no limit
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, t => [index('idx_child_profiles_user').on(t.userId)]);

export const playlists = pgTable('playlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  childProfileId: uuid('child_profile_id').notNull()
    .references(() => childProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('My playlist'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, t => [index('idx_playlists_child').on(t.childProfileId)]);

// Global cache of provider metadata — one row per video across all users
export const videoMetadata = pgTable('video_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull().default('youtube'),
  providerVideoId: text('provider_video_id').notNull(),
  title: text('title').notNull(),
  channelTitle: text('channel_title').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  embeddable: boolean('embeddable').notNull().default(true),
  madeForKids: boolean('made_for_kids'),
  status: text('status', { enum: ['available','unavailable'] }).notNull().default('available'),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex('uq_video_provider').on(t.provider, t.providerVideoId)]);

export const playlistVideos = pgTable('playlist_videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  playlistId: uuid('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  videoMetadataId: uuid('video_metadata_id').notNull().references(() => videoMetadata.id),
  position: integer('position').notNull(),
  approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
  approvedByUserId: uuid('approved_by_user_id').notNull().references(() => users.id),
}, t => [
  uniqueIndex('uq_playlist_video').on(t.playlistId, t.videoMetadataId),  // no duplicates
  index('idx_playlist_videos_playlist_pos').on(t.playlistId, t.position),
]);

export const parentSettings = pgTable('parent_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  pinSet: boolean('pin_set').notNull().default(false),   // flag only; hash lives on-device
  pinRecoveryHash: text('pin_recovery_hash'),            // argon2 hash for email-verified reset (§11)
  biometricEnabled: boolean('biometric_enabled').notNull().default(false),
});

export const watchSessions = pgTable('watch_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  childProfileId: uuid('child_profile_id').notNull()
    .references(() => childProfiles.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').references(() => devices.id),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  totalSeconds: integer('total_seconds').notNull().default(0),
  videosWatched: jsonb('videos_watched').$type<{videoMetadataId: string; seconds: number}[]>()
    .notNull().default([]),
  endReason: text('end_reason', { enum: ['parent_exit','time_limit','app_closed','unknown'] }),
}, t => [index('idx_sessions_child_started').on(t.childProfileId, t.startedAt)]);

export const subscriptionStatus = pgTable('subscription_status', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  isPremium: boolean('is_premium').notNull().default(false),
  productId: text('product_id'),
  store: text('store', { enum: ['app_store','play_store','promo'] }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  lastEventType: text('last_event_type'),
  lastEventAt: timestamp('last_event_at', { withTimezone: true }),
});

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  installId: text('install_id').notNull(),        // random uuid from the app install
  platform: text('platform', { enum: ['ios','android'] }).notNull(),
  appVersion: text('app_version'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex('uq_device_install').on(t.userId, t.installId)]);

export const securityEvents = pgTable('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  deviceId: uuid('device_id'),
  type: text('type', { enum: ['pin_failed','pin_lockout','pin_reset','child_mode_enter',
    'child_mode_exit','video_approved','video_removed'] }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [index('idx_security_events_user_time').on(t.userId, t.createdAt)]);
```

Free-limit enforcement happens in API transactions (count checks), not DB constraints, since limits depend on entitlement.

## 8. API design

REST under `/api/v1`. Auth: `Authorization: Bearer <Clerk JWT>` verified server-side; every query is scoped to the resolved `users.id` (ownership enforced on all child resources). All bodies validated with zod schemas from `@littleloop/shared`. Errors: `{ error: { code: string, message: string } }` with proper status codes.

| Method & path | Purpose | Notes / validation |
|---|---|---|
| `POST /users/sync` | Upsert user after Clerk sign-in; registers device | body `{ installId, platform, appVersion }` → `{ user, entitlement, childProfiles }` |
| `GET /child-profiles` / `POST /child-profiles` | list / create | create: `{ nickname: 1–30 chars, ageRange, avatar, dailyLimitMinutes? 5–240 }`; **402 `LIMIT_REACHED`** if free & already has 1 |
| `PATCH /child-profiles/:id` / `DELETE` | update / soft-delete | |
| `GET /playlists?childProfileId=` / `POST /playlists` | list / create | free: 1 playlist per account → 402 |
| `PATCH /playlists/:id` / `DELETE` | rename / soft-delete | |
| `GET /playlists/:id/videos` | ordered videos + metadata | powers both s11 and child home |
| `POST /videos/preview` | resolve a pasted link | `{ url }` → parse ID → YouTube API → `{ providerVideoId, title, channelTitle, durationSeconds, thumbnailUrl, embeddable }`. 422 `INVALID_LINK`, 404 `VIDEO_UNAVAILABLE`, 503 `QUOTA_EXCEEDED` |
| `POST /playlists/:id/videos` | approve & add | `{ providerVideoId }` (server re-fetches/uses cached metadata — client never submits titles). 409 `DUPLICATE_VIDEO`, 402 `LIMIT_REACHED` (>10 free). Writes `video_approved` event |
| `DELETE /playlists/:id/videos/:playlistVideoId` | remove | |
| `PUT /playlists/:id/videos/order` | reorder | `{ orderedIds: string[] }` — must be a permutation of current set; positions rewritten in one tx |
| `POST /watch-sessions` | start session | `{ childProfileId, installId }` → `{ sessionId, secondsWatchedToday, dailyLimitMinutes }` (server computes today's total for anti-bypass) |
| `PATCH /watch-sessions/:id` | heartbeat / end | `{ totalSeconds, videosWatched, endReason? }` — monotonic `totalSeconds`, capped at wall-clock elapsed +10% |
| `GET /activity?childProfileId=&range=7d` | activity screen data | `{ todayMinutes, weekByDay[7], mostWatched, sessions[] }` |
| `GET /subscription` | current entitlement | reads `subscription_status` |
| `POST /webhooks/revenuecat` | RevenueCat events | verified via `Authorization` header secret; idempotent upsert into `subscription_status` |
| `PUT /settings/pin` | set/replace recovery hash + flags | `{ pinRecoveryHash, biometricEnabled }` — server never sees the raw PIN (client hashes with argon2/bcrypt before sending) |
| `POST /settings/pin/reset-request` → `POST /settings/pin/reset-confirm` | forgot-PIN flow | email code via Clerk verification; confirm clears `pin_set` so device can re-setup |

Example — add video:

```http
POST /api/v1/playlists/8f2.../videos
{ "providerVideoId": "dQw4w9WgXcQ" }

201 { "playlistVideo": { "id":"...", "position":8,
      "video": { "title":"Ocean Animals for Kids", "channelTitle":"Happy Learning TV",
                 "durationSeconds":504, "thumbnailUrl":"https://i.ytimg.com/..." } } }
```

## 9. YouTube integration

**Link → ID:** accept `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `music.youtube.com`, embed URLs; regex + URL parsing in `@littleloop/shared` (`extractYouTubeId(url): string | null`, heavily unit-tested). Reject playlists/channels/live URLs with a specific message ("Please paste a link to a single video").

**Metadata (backend only):** `GET https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id={id}&key=...`. Validate: item exists; `status.embeddable === true`; `status.privacyStatus === 'public'` (warn on unlisted, block private); not a live broadcast; not age-restricted (`contentDetails.contentRating.ytRating !== 'ytAgeRestricted'`). Parse ISO-8601 duration → seconds; pick best thumbnail (`maxres`→`high`). Upsert into `video_metadata`. Quota: 1 unit/lookup, 10k/day — cache hits skip the API entirely.

**Playback:** a local HTML document loaded in `react-native-webview` hosting the **IFrame Player API** against `https://www.youtube-nocookie.com/embed/{id}` with `playsinline=1&rel=0&controls=0&modestbranding=1&fs=0&disablekb=1&iv_load_policy=3&origin=...`. Native controls (s14: coral play/pause, prev/next, progress bar) drive the player via `postMessage` bridge; player events (time updates, state changes, errors) come back the same way for the progress bar and watch-second counting.

**Lockdown inside the WebView:**
- `onShouldStartLoadWithRequest`: allow only the initial document + youtube-nocookie iframe; **block every other navigation** (video title tap, logo tap, "Watch on YouTube").
- A transparent native `View` overlays the WebView except where our controls are, so raw touches never reach the iframe UI; taps on it trigger the LockedModal if appropriate or just no-op.
- `rel=0` still shows *same-channel* end-screen suggestions — we cover the end state: on `ENDED` event immediately show our own native "next video" takeover (per s14 "Up next" card) hiding the iframe.
- `setSupportMultipleWindows={false}`, `javaScriptCanOpenWindowsAutomatically={false}`, no `allowsLinkPreview`.

**Compliance notes:** we must not claim ads are removed (YouTube may serve ads in embeds — say nothing about ads, or in FAQ: "Videos play through the official embedded player and may include ads from the video platform"). We must not overlay elements *while claiming* to alter YouTube's UI in marketing; the ToS requires not interfering with player functionality — keeping default `controls=0` + our own transport controls via the official API is the accepted pattern used by kid-player apps, but document it for review and be ready to fall back to `controls=1`. No downloading, no background audio-only playback, attribution stays (channel title shown on preview). Use "video link"/"approved video" language everywhere; include "YouTube is a trademark of Google LLC; LittleLoop is not affiliated" in settings/about.

## 10. Child mode lock model

- **Entry:** explicit, from the s12 gate. `lockStore.childMode.active = true` (persisted synchronously to MMKV *before* navigation) → root layout renders the `(child)` navigator exclusively. Parent routes are unmounted — there is no back stack into them.
- **Exit:** only through `pin-unlock` (PIN keypad or Face ID). Success → `active=false`, navigate to dashboard, end watch session (`end_reason='parent_exit'`).
- **Background/foreground:** on `AppState` → background, pause player and timestamp; on foreground while `childMode.active`, resume child mode directly (never flash parent UI — root layout checks the persisted flag before first render). If the app is killed and relaunched, same restore path.
- **Accidental navigation:** Android hardware back → intercepted (`BackHandler`) → LockedModal. All gestures disabled on child screens (`gestureEnabled: false`). Deep links ignored while active. `pin-unlock` from child mode shows shuffled-position hint? No — keep standard keypad (design s05), but the keypad requires deliberate taps and 5-fail lockout.
- **LockedModal (s15):** shown for any protected interaction: padlock icon, blocked WebView tap-through, back gesture, "Parent unlock" from s16. "OK" dismisses; "Parent unlock" opens PIN.
- **What we cannot fully prevent (document honestly in-app for parents):** the child can press home / swipe to app switcher and use the rest of the device — recommend **iOS Guided Access** and **Android screen pinning** with an in-app tip sheet ("Keep your child in LittleLoop: enable Guided Access"). We cannot block notifications, control-center, or force-quit. Kiosk-style single-app mode is impossible for a store app.

## 11. PIN and biometric design

- **Setup (s05):** 4-digit PIN entered twice (enter → confirm). Stored **on-device only** as a salted hash: `expo-crypto` PBKDF2/SHA-256 (or argon2 via `react-native-argon2` later) with random salt, in **expo-secure-store** (Keychain/Keystore). Raw PIN never persists, never logged, never sent to the server in raw form.
- **Verification:** hash-compare in memory; 5 failed attempts → 30 s lockout (exponential: 30 s, 2 min, 5 min), attempts + lockout persisted so relaunch doesn't reset them; `pin_failed`/`pin_lockout` security events synced when online.
- **Biometrics:** `expo-local-authentication`. Face ID/Touch ID/fingerprint offered after PIN setup (s05 footer link) and toggleable in Settings (s18). Biometric success is equivalent to correct PIN. PIN remains the fallback (biometrics can fail/be unenrolled).
- **Forgot PIN:** because a child could tap this, the reset is deliberately parent-weighted: "Forgot PIN" → requires **Clerk email verification code** → server `reset-confirm` clears `pin_set` → app forces new PIN setup. Never display or email the PIN itself.
- **Server vs local:** local PIN is authoritative for the lock UX (works offline, instant). Server stores only `pin_set`, `biometric_enabled`, and a client-side-hashed `pinRecoveryHash` (optional, enables "same PIN across devices" later). Tradeoff accepted: a 4-digit PIN on a device the child physically holds is a *speed bump for children*, not cryptographic security — the threat model is a curious 5-year-old, not an attacker.

## 12. Subscription and paywall logic

- **Products:** `ll_premium_monthly` $4.99, `ll_premium_yearly` $34.99, no free trial (yearly anchored as "BEST VALUE", per s19). One RevenueCat entitlement: `premium`.
- **Free limits** (constants in `@littleloop/shared`): `{ childProfiles: 1, playlists: 1, videosPerPlaylist: 10, avatars: 6 basic }`. Premium: unlimited profiles/playlists/videos, advanced schedules, cloud sync of settings, extra avatars, activity insights (week+ history).
- **Integration:** `react-native-purchases`; `Purchases.logIn(clerkUserId)` so the RevenueCat app-user-id == our user; entitlement read from `customerInfo.entitlements.active.premium`. Paywall screen is fully custom (s19) using `getOfferings()` for localized prices.
- **When shown:** hitting any free limit (client checks first for instant UX; server 402 is the backstop), Settings upgrade banner, optionally once post-onboarding (soft, dismissible).
- **Restore:** s19 link → `restorePurchases()`; also automatic on `logIn`.
- **Webhook sync:** RevenueCat → `POST /webhooks/revenuecat` (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE) → upsert `subscription_status`. Server-side limit checks read this table — client can't spoof entitlement.
- **Offline:** last-known entitlement cached in MMKV; honored offline indefinitely for *reading* content (never lock a child out of already-approved videos), but new gated *writes* require server confirmation anyway.
- **Edge cases:** expiration with over-limit data → nothing is deleted; existing content stays watchable/removable, **adding** is blocked until under limit or re-subscribed. Cancellation, grace period (honor `currentPeriodEnd`), family-shared purchases (RevenueCat handles), sandbox vs production environments split by RevenueCat project config.

## 13. Timer and watch session logic

- **Daily limit:** per child profile (`dailyLimitMinutes`, null = unlimited). Day boundary = device-local midnight; `timerStore.dateKey` resets counts.
- **Session lifecycle:** entering child mode → `POST /watch-sessions` (server returns authoritative `secondsWatchedToday` — prevents "reinstall/clear-data to reset the clock" when online). Foreground ticking: 1 Hz interval counts only while player state is `PLAYING`. Heartbeat `PATCH` every 60 s and on pause/exit/background with cumulative `totalSeconds` and per-video seconds.
- **Warning & end:** at `remaining <= 120s` → TimerBadge (amber pill, s13/s14) pulses + one-time gentle overlay "2 minutes left!". At 0 → pause player via bridge → navigate to s16 `times-up` → end session (`time_limit`). Parent unlock from s16 offers "+15 min today" or exit.
- **Bypass resistance:** server recomputes today's total from sessions (client seconds capped to wall-clock delta); killing the app mid-session → unsynced seconds persisted in MMKV and reconciled on next launch (session closed as `app_closed` with local total); changing device clock affects local midnight only — server uses `started_at` UTC for activity reporting. Accept that a fully offline device can be clock-gamed; note it, don't over-engineer.
- **Activity (s17)** is rendered from `GET /activity`: today minutes vs limit, 7-day bar chart, most-watched video, session list ("Today, 4:10 PM · 22 min · 3 videos").

## 14. Component design system

`apps/mobile/src/theme/tokens.ts` from the design file:

```ts
export const colors = {
  bg: '#FFF9F1', canvas: '#F3EDE3', card: '#FFFFFF', ink: '#172033',
  muted: '#667085', subtle: '#98A2B3', border: '#E7EBF1',
  primary: '#5BAEF7', primaryDark: '#2E7FD1', primaryTint: '#EAF4FE',
  coral: '#FF8A7A', coralGrad: ['#FF9A8B','#FF8A7A'], coralTint: '#FFF0EF',
  green: '#6DD6A0', greenDark: '#3FA872', greenTint: '#F1FBF6',
  amber: '#FFB84D', amberText: '#B27B1E', amberTint: '#FFF3D9', amberDark: '#FFCC66',
  red: '#EF6F6C', playerBg: '#111B31',
  nightGrad: ['#1C2B4E','#33456F','#43567F'],
};
export const radii = { input: 18, card: 20, cardLg: 24, cardXl: 28, pill: 28 };
// Type: Nunito 400/600/700/800/900 (design's stand-in for SF Pro Rounded — ship Nunito)
```

Components (all typed, in `src/components/`):

| Component | Key props | Notes |
|---|---|---|
| `Button` | `variant: 'primary'\|'coral'\|'outline'\|'ghost'`, `size`, `loading`, `icon` | 56 px pill, shadow per design (`0 8 20 rgba(91,174,247,.35)`); coral uses gradient (`expo-linear-gradient`) |
| `Card` | `radius?, padding?, style` | white bg + soft shadow wrapper |
| `VideoCard` | `video, variant: 'child'\|'parent-row'\|'preview'`, `onPress, onRemove, dragHandleProps?` | child: full-width 170 px thumb + big play circle (s13); parent-row: 86×56 thumb, drag handle, red remove (s11); preview: s09 card |
| `PlaylistCard` | `name, count, onPress` | dashboard "Manage Playlist" tile |
| `ChildAvatar` | `avatar: AvatarId, size, selected?` | the 6 designed avatars as SVG (`react-native-svg`), selectable grid variant (s06) |
| `PINKeypad` | `onDigit, onDelete, disabled` + `PINDots({length, filled, error})` | 76 px white circles, 3-col grid (s05); shake animation on error |
| `LockedModal` | `visible, onOk, onParentUnlock` | s15: blurred backdrop, padlock, "Ask a parent" |
| `PaywallPlanCard` | `plan, price, sublabel, selected, badge?` | s19; "BEST VALUE" coral badge |
| `TimerBadge` | `minutesLeft, variant: 'light'\|'dark'`, `warning` | amber clock pill (s13 light, s14 dark); pulses when `warning` |
| `ParentHeader` | `title, subtitle?, onBack?, right?` | 36 px white circular back button + 24 px title (s08/s09/s12) |
| `ChildModeHeader` | `childName, minutesLeft, onLockTap` | avatar + "{name}'s Videos" + dimmed padlock (s13) |
| `EmptyState` | `illustration, title, body, cta, secondary?` | s07 |
| `SettingsRow` | `icon, iconBg, label, value?, chevron?, toggle?` | s18 rows, grouped in `SettingsGroup` |
| `ScreenContainer` | `mode: 'parent'\|'child'\|'dark'`, `scroll?, padded?` | safe areas + per-mode background (cream / warm gradient / `#111B31`) |
| `TabBar` | (custom `tabBar` for the parent tabs) | matches s10 icon set + active states |
| `SectionLabel` | `children` | the uppercase 12.5 px letter-spaced labels used everywhere |

## 15. Data validation and edge cases

| Case | Handling |
|---|---|
| Invalid link | client-side parse fails → inline error under input ("That doesn't look like a video link"); server 422 as backstop |
| Duplicate video | server 409 → toast "Already in {name}'s playlist" |
| Private/deleted/unavailable | preview returns 404 `VIDEO_UNAVAILABLE` with reason; nightly job (Vercel cron) re-checks `video_metadata.lastCheckedAt > 7d`, flags `status='unavailable'` → parent list shows a warning badge; child home **hides** unavailable videos |
| Non-embeddable video | preview blocks with "This video can't be played inside apps — it can only be watched on the platform's own site" |
| YouTube quota exceeded | 503 → "Video preview is temporarily busy — try again in a few minutes"; metadata cache reduces incidence |
| No internet | cached playlist renders; add-video disabled with offline notice; player shows friendly retry state; timer keeps counting locally |
| Expired subscription | see §12 — never delete, block adds over limit |
| Playlist/profile limit | 402 → paywall |
| Child has no videos | child gate warns parent ("Add at least one video first"); child home shows friendly empty illustration, no CTAs |
| Wrong PIN | dot shake + haptic; 5 fails → cooldown countdown shown |
| App killed during session | persisted partial seconds reconciled on next launch (§13) |
| Player error (`onError` from iframe: 100/101/150) | mark video for re-check, auto-advance to next approved video with a soft "Skipping this one" note |
| Clock/timezone change | dateKey recomputed; server activity uses UTC timestamps |

## 16. Privacy, safety, and compliance

- **Data minimization:** child profile = nickname + age *range* + avatar only. No child accounts, no child emails, no birthdates, no photos. The child is never the data subject of tracking.
- **COPPA / GDPR-K posture:** the *parent* is the user; the app is used by children under parental supervision. Still: App Store **Kids Category is a judgment call** — Kids Category imposes no-third-party-analytics/ads rules and review scrutiny; recommended: **do not enroll in Kids Category**; list as a parental-control/family utility (age rating 4+), while meeting Google Play **Families Policy** "designed for families" requirements since children use it. Declare target audience honestly on Play ("parents and children"), which triggers Families Policy: no ads SDKs, no PII from child flows, approved SDK list only.
- **No third-party ad SDKs. Ever.** Analytics: PostHog EU or none for v1; fire events only from parent-mode screens, disable session recording, no advertising IDs. Child-mode emits zero analytics beyond first-party watch sessions (which are a product feature shown to the parent, "stored only on this device" per s17 copy — so for free tier keep activity **local-only**, and make cloud sync of activity an explicit premium opt-in to keep that copy truthful).
- **Privacy policy** (required by both stores + YouTube API ToS): enumerate data collected (parent email via Clerk, playlist contents, watch durations, purchase state), processors (Clerk, Neon, Vercel, RevenueCat, Google/YouTube API), retention, deletion. In-app account deletion (Apple requirement): Settings → delete account → cascade delete + Clerk user deletion + RevenueCat GDPR delete.
- **YouTube API compliance:** show data fresh (we re-check ≤30 days per ToS metadata caching rules — our 7-day recheck satisfies it), don't aggregate for competing datasets, display attribution (channel title), link out is *not* required for embeds but never claim ownership. Include YouTube ToS acceptance implicitly ("videos play via the platform's embedded player, subject to its terms").
- **App Review notes (both stores):** provide a demo login + demo PIN in review notes; explain the PIN gate (reviewers must be able to exit child mode); explain that the app only plays parent-added embedded videos, no browsing; screenshot set per s20.
- **Wording to avoid:** "ad-free", "YouTube for kids", "official", "blocks all inappropriate content" (we don't scan content — the parent approves), "kid-safe YouTube". Use: "parent-approved videos only", "video link", "embedded player".

## 17. MVP scope (v1.0)

**Must-have:** onboarding (s02–s04), Clerk auth, PIN setup + biometric (s05), 1 child profile (s06), playlist with add/preview/approve/remove/reorder (s07–s09, s11), dashboard (s10), child mode gate/home/player/locked modal (s12–s15), daily timer + break screen (s16), settings (s18), paywall + RevenueCat with free limits (s19), backend API + Neon schema, WebView lockdown, unavailable-video handling.

**Should-have:** activity screen (s17) with local session data, fullscreen landscape player (s14b), Guided Access / screen pinning tip sheet, Sentry, restore-into-child-mode after kill, forgot-PIN email reset.

**Could-have:** avatar pack (premium), playlist rename, "+15 min today" parent grant, nightly availability re-check cron, PostHog analytics.

**Later:** multiple playlists per child UI polish, advanced time schedules (per-weekday), multi-device cloud sync of activity, Next.js admin dashboard, offline mutation queue, Android tablet layouts, additional providers (Vimeo).

## 18. Implementation roadmap

> **See `PHASES.md`** for the execution breakdown: 6 sequential phases (0–5) with scope, tasks, and exit criteria per phase. The milestones below map onto them: Phase 0 = M0, Phase 1 = M1–M2, Phase 2 = M3–M4, Phase 3 = M5–M6, Phase 4 = M7 (+ s17), Phase 5 = M8–M9.

| # | Milestone (≈1 wk each) | Contents |
|---|---|---|
| M0 | **Project setup** | monorepo, Expo app scaffold, Next.js API scaffold, Neon + Drizzle migrations, Clerk wired both sides, CI (typecheck, lint, test), env plumbing |
| M1 | **Design system** | tokens, fonts, all §14 components with Storybook-style gallery screen, ScreenContainer + custom TabBar |
| M2 | **Auth + onboarding** | s01–s06 flows, PIN secure storage, `users/sync`, device registration |
| M3 | **Playlist CRUD + YouTube preview** | s07–s09, s11 incl. drag reorder (`react-native-draggable-flatlist`), `/videos/preview`, metadata caching |
| M4 | **Parent dashboard + settings** | s10, s18, child-profile editing, time-limit setting |
| M5 | **Child mode + player** | s12–s15, navigator swap, WebView player + bridge + lockdown, LockedModal, Android back handling |
| M6 | **Timer + sessions + activity** | timer store, warning, s16, watch-session API, s17 |
| M7 | **Subscriptions** | RevenueCat, s19 paywall, free-limit gates client+server, webhook |
| M8 | **Hardening + testing** | edge cases (§15), Sentry, security events, rate limiting (Upstash free tier or simple per-user counters), load-test preview endpoint |
| M9 | **Store readiness** | app icons/splash, s20 screenshots, privacy policy + nutrition labels, review notes, TestFlight/internal track, submission |

## 19. Testing plan

- **Unit (Vitest, `packages/shared` + app logic):** `extractYouTubeId` (≥20 URL fixtures incl. shorts/music/embed/invalid/playlist), ISO-8601 duration parsing, free-limit calculators, timer reducer (tick/pause/day-rollover/warning threshold), PIN hash/verify/lockout state machine.
- **API (Vitest + route-handler invocation against a Neon branch DB):** every endpoint: auth required, ownership enforced (user A can't touch user B's playlist), limit 402s, duplicate 409, reorder permutation validation, webhook idempotency + signature check, session seconds capping.
- **Integration:** add-video happy path (mocked YouTube API), preview error mapping (private/quota/non-embeddable), entitlement change → limit behavior.
- **Mobile E2E (Maestro):** onboarding→PIN→profile→empty playlist; add+approve video; enter child mode→play→locked modal on back→PIN exit; wrong PIN ×5 lockout; timer expiry → s16 (with a debug 1-minute limit); paywall on 11th video; restore purchases (sandbox).
- **Subscription cases (manual + RevenueCat sandbox):** initial purchase, cancellation, renewal, expiration, restore on fresh install, offline entitlement.
- **Child-lock manual matrix:** Android hardware back, iOS swipe-back, app switcher kill/relaunch, deep link while locked, WebView tap on video title/logo/end screen, rotation to s14b.

## 20. Sprint 1 backlog (2 weeks — M0 + M1 + start of M2)

**User stories**
1. *As a developer, I can clone the repo, run `pnpm i`, `pnpm dev`, and get the Expo app + API + DB running locally.* — AC: README steps work on a clean machine; CI green on PR (lint, typecheck, unit tests).
2. *As a parent, I see the branded splash and 3-screen onboarding exactly as designed.* — AC: s01–s04 pixel-match (colors, Nunito weights, pager dots, Skip); swipe + button navigation; completion persisted (relaunch skips onboarding).
3. *As a parent, I can create an account and sign in.* — AC: Clerk email sign-up/sign-in themed to the design; `POST /users/sync` creates the user + device row in Neon; session survives relaunch.
4. *As a parent, I can set a 4-digit PIN with confirmation.* — AC: s05 pixel-match; enter+confirm mismatch shows shake+retry; hash stored in SecureStore only; Face ID opt-in prompt appears when hardware supports it.
5. *As a developer, I have the full design system available.* — AC: all §14 components implemented with the tokens file; internal `/gallery` dev screen renders every component variant for visual sign-off.

**Tasks**
- Repo: pnpm workspaces + turbo; `apps/mobile` (`pnpm create expo` w/ TS, Expo Router), `apps/api` (`create-next-app`), `packages/shared`, `packages/db`; shared tsconfig/eslint/prettier; GitHub Actions CI.
- DB: Drizzle schema (§7), `drizzle-kit generate` + migrate against Neon; seed script.
- API: Clerk JWT middleware helper, zod error envelope, `POST /users/sync`, health route; deploy to Vercel with env vars.
- Mobile: load Nunito via `expo-font`; tokens; ScreenContainer; Button/Card/PINKeypad/ChildAvatar/EmptyState/SettingsRow/ParentHeader/TabBar; onboarding pager; Clerk provider + sign-in/up screens; PIN setup screen + SecureStore service; MMKV + Zustand persistence setup; TanStack Query + API client with auth token injection.
- E2E: Maestro installed, first flow (onboarding completes).

**Dependencies to install**
- Mobile: `expo-router zustand react-native-mmkv @tanstack/react-query @clerk/clerk-expo expo-secure-store expo-local-authentication expo-crypto expo-linear-gradient react-native-svg expo-image react-native-webview react-native-purchases react-native-draggable-flatlist expo-font expo-splash-screen expo-haptics @shopify/flash-list sentry-expo`
- API: `drizzle-orm @neondatabase/serverless drizzle-kit zod @clerk/backend`
- Shared/dev: `zod typescript vitest turbo eslint prettier`

**Environment variables** (`.env.example`)
```
# apps/api
DATABASE_URL=            # Neon pooled connection string (ROTATE the leaked one first)
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
YOUTUBE_API_KEY=
REVENUECAT_WEBHOOK_AUTH= # shared secret for webhook Authorization header

# apps/mobile (EXPO_PUBLIC_*)
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=
EXPO_PUBLIC_SENTRY_DSN=
```

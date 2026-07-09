# LittleLoop

Parent-controlled kids playlist app. See `PLAN.md` (architecture) and `PHASES.md` (roadmap).

## Layout

- `apps/mobile` — Expo app (SDK 57, TypeScript, Expo Router)
- `apps/api` — Next.js API (`/api/v1/*` route handlers, Clerk JWT auth)
- `packages/shared` — `@littleloop/shared`: zod schemas, constants, types
- `packages/db` — `@littleloop/db`: Drizzle schema, migrations, seed (Neon)

## Getting started

```sh
pnpm install
cd apps/mobile
npx expo start        # add EXPO_OFFLINE=1 if not logged in to an Expo account
```

Environment: copy `.env.example` → `apps/mobile/.env`. Without
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` the app runs in a local dev-bypass mode
(no real sign-in); without `EXPO_PUBLIC_API_URL` child profiles are stored
locally on the device.

Runs in Expo Go (persistence falls back to AsyncStorage there); a dev build
uses MMKV.

## Checks

```sh
pnpm -r typecheck
pnpm -r test
```

Dev component gallery: navigate to `/gallery` inside the app.
# Little-loop

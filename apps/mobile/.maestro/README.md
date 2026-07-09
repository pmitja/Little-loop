# Maestro E2E flows (PLAN §19)

Run against a dev build (not Expo Go) with the dev bypasses active — no
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` / `EXPO_PUBLIC_API_URL` / RevenueCat keys —
so sign-in and purchases are simulated and flows are deterministic.

```sh
maestro test .maestro/01-onboarding.yml       # first-install through empty playlist
maestro test .maestro/02-add-video.yml        # paste link → preview → approve
maestro test .maestro/03-child-mode-lock.yml  # gate → child home → PIN exit
maestro test .maestro/04-timer.yml            # limit reached → times-up screen
maestro test .maestro/05-paywall.yml          # 11th video → paywall → simulated purchase
```

Notes
- `01` must run first on a clean install; the others assume its end state
  (PIN `1234`, profile "Mila", onboarding complete).
- `04` expects a 5-minute limit set via Settings → Time limits and uses a
  real playing video, so it is the slowest flow (~6 min); it exists for the
  release checklist, not the inner loop.
- The child-mode WebView player itself still needs the manual lock matrix on
  physical devices (touch shield, Guided Access, app pinning).

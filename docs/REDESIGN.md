# LittleLoop Redesign Spec

Agent-executable spec for redesigning the mobile app (`apps/mobile`). Derived from two Mobbin research passes; visual reference mockups live in [`design-redesign-concept.html`](../design-redesign-concept.html), pattern research in [`design-research-report.html`](../design-research-report.html). Open both in a browser before starting — every screen below has a pixel mockup there.

**Stack context:** Expo SDK 57 / RN 0.86, expo-router route groups, tokens in `apps/mobile/src/theme/tokens.ts`, shared components in `apps/mobile/src/components/`. Fonts: Nunito (loaded in root layout). Do not introduce new UI libraries; build with RN primitives + existing deps (`expo-linear-gradient`, `expo-haptics`, `expo-local-authentication`).

---

## 1. Design principles (apply to every task)

1. **Two worlds, one wall.** The child world is saturated, playful, nearly text-free. The parent world is papery, calm, data-first. The only crossing between them is the PIN gate. Never render parent UI (tabs, paywall, settings entry points other than the gated pill) inside `(child)` routes.
2. **Constraint is the product.** No search, no browse, no autoplay into unapproved content, no kid-reachable escape hatches. When in doubt, remove.
3. **Recognition over reading.** Child-facing surfaces communicate with artwork, color, and the owl mascot — not labels. Parent-facing rows state their current value inline.
4. **Calm boundaries.** Limits are framed warmly ("All done for today!") and are final for the child. Extension/override always requires the PIN.
5. **Summary before detail.** Parent screens lead with one hero number/fact, then the breakdown.

---

## 2. Design tokens — update `src/theme/tokens.ts`

Extend/adjust the existing token file. Keep existing keys working (migrate usages screen-by-screen; delete dead keys at the end).

### 2.1 Colors

| Token | Value | Use |
|---|---|---|
| `child.sky` | `#4EC3E0` | Child-world primary ground (gradients start) |
| `child.skyDeep` | `#1E93B5` | Child-world accents, active states in parent nav |
| `child.sun` | `#FFC93E` | Time meter, premium banner gradient, highlights |
| `child.coral` | `#FF6B57` | Play button, primary child CTA, today-bar in charts |
| `child.grass` | `#6BCB77` | Approved/LIVE states, positive deltas, toggles ON |
| `child.plum` | `#7C5CBF` | Profile picker / paywall ground |
| `child.cream` | `#FFF8EC` | Child-world card surface |
| `parent.paper` | `#F4F1EB` | Parent screen background |
| `parent.night` | `#2A3B5C` | Parent ink, active chips, dark CTAs |
| `parent.card` | `#FFFFFF` | Parent cards |
| `parent.hairline` | `#F0EBE1` | Row separators inside cards |
| `parent.muted` | `#8A8090` | Secondary text, inactive values |
| `player.bg` | `#1B2233` | Player screen ground (keep close to existing `playerBg`) |
| `state.review` | bg `#FFC93E` / text `#7A5C00` | REVIEW badge |
| `state.live` | bg `#6BCB77` / text `#FFFFFF` | LIVE badge |

Keep `radii` (`card: 20` fits the mockups; add `tile: 16`, `navPill: 18`). Keep `spacing.screenX: 24`. Keep Nunito font map.

### 2.2 Toggle, badge, icon-slot constants

```ts
export const controls = {
  iconSlot: 30,      // settings row leading icon: 30×30, radius 10 — SAME EVERYWHERE
  toggleW: 51, toggleH: 31,        // RN Switch default; do not restyle per screen
  navBadge: 16,      // coral count badge on tab icons
  minTouchChild: 64, // min touch target in (child) routes
  minTouchParent: 44,
} as const;
```

---

## 3. Layout rules (hard requirements — the flex bug)

Learned the hard way in the HTML concept; these are non-negotiable in RN too:

1. **Row anatomy is always: fixed leading slot → flexible text column → fixed trailing accessory.** Leading icon container: exact `width/height: controls.iconSlot`, never `flex: 1`. Text column: `flex: 1, minWidth: 0`. Trailing (chevron / value / Switch): fixed intrinsic size.
2. Row titles use `numberOfLines={1}` + `ellipsizeMode="tail"`. Never let "Bedtime cut-off" wrap mid-word.
3. Group section headers are Fredoka-voice headings (Nunito 800, 15px, `parent.night`) — **not** small uppercase micro-labels. Update `SectionLabel.tsx` accordingly.
4. Sibling spacing via container `gap`, not per-child margins.
5. Wide content scrolls in its own container; screens never scroll horizontally.

---

## 4. Component work — `src/components/`

### 4.1 Update existing

| Component | Change |
|---|---|
| `TabBar.tsx` | Duolingo tile pattern: floating white bar (radius 18, soft shadow), 3 tabs **Today · Playlist · Settings**, active tab = tinted rounded square (`#DCEFF6` bg, `child.skyDeep` icon+label), inactive = `#A79DAB`. Coral count badge (Telegram-style) on Playlist when videos are pending review (`state.review` count from playlist store). Parent-side only. |
| `SettingsRow.tsx` | Enforce §3 row anatomy. Props: `icon` (emoji or node) + `iconBg`, `title`, optional `value` (right-aligned, `parent.muted`, e.g. "45 min ›"), optional `toggle` (controlled Switch), optional `onPress` → chevron. 30×30 icon slot, radius 10. |
| `SectionLabel.tsx` | Restyle per §3.3. |
| `VideoCard.tsx` | Child grid tile: 2-up, aspect ~16/11.5, radius 16, artwork-dominant, tiny bottom-left title pill (white 75% bg), bottom-right play chip. Whole tile is the touch target (≥64pt). |
| `TimerBadge.tsx` | Child home meter: white pill, ⏰ + progress bar (`grass→sun` gradient fill) + "25 min left". Also compact variant for the player top bar ("⏰ 25 min left" pill, `child.sun` text on dark). |
| `ParentHeader.tsx` | Large Fredoka-voice title (Nunito 800 ~24px) + trailing slot; used by all `(parent)` screens. |
| `PINKeypad.tsx` | Keep. Ensure: 4 boxed digit cells, "Use Face ID" (via `expo-local-authentication`) and "Forgot PIN?" links always visible; 30s cooldown after 3 wrong attempts. |

### 4.2 New components

| Component | Spec |
|---|---|
| `IdentityCard.tsx` | Telegram-pattern settings header: 34px circle avatar (initial on `parent.night`), name (11→16px scale up for RN: Nunito 700), sub "email · Manage account", chevron. One tap → account screen. |
| `ChildSwitcher.tsx` | Horizontal chips: `🦊 Mia` per child + dashed `＋` chip. Active = `parent.night` bg / white text; inactive = white bg / `parent.muted`. Selecting scopes everything below it. `＋` chip is where the free profile cap surfaces (routes to `add-child` or paywall). Used on Today tab + Settings tab. |
| `PremiumBanner.tsx` | Todoist-pattern first-card upsell: `sun→#FFAF3E` gradient (LinearGradient), ⭐, "Upgrade to Premium" + one-line description, chevron. Rendered only in parent Settings; never modal, never in child mode. |
| `OptionList.tsx` | Duolingo goal-picker: white card of rows `[bold value] [muted nickname] [✓]`; selected row = `#EAF6FA` bg + 3px `child.skyDeep` left inset bar. Single-select. |
| `FactsPanel.tsx` | TikTok Family-Pairing explainer: white card of icon + plain-sentence rows with bolded facts ("Mia's limit is **45 min a day**…"). Data-driven from actual settings values — never hardcoded copy. |
| `OwlBubble.tsx` | Mascot 🦉 + speech bubble (white, radius 12, bottom-left corner 3px). Used in limit editor, onboarding, PIN gate header, break screen. One mascot everywhere. |
| `UpNextCard.tsx` | Player: "UP NEXT IN {CHILD}'S PLAYLIST" micro-label + row card (thumb, title, green "✓ parent-approved"). Only ever shows the next *approved* playlist item; renders nothing at end of playlist. |
| `WeekBars.tsx` | 7-bar week chart: bars `#E4DCCF`, heavier days `child.skyDeep`, today `child.coral`, radius 5 top. No axes, no legend. |
| `StatusBadge.tsx` | REVIEW (`state.review`) / LIVE (`state.live`) pills for playlist rows. |

---

## 5. Screen-by-screen tasks

Work through in this order. Each screen lists: route file, spec, acceptance criteria (AC).

### 5.1 Child Home — `src/app/(child)/index.tsx`

Mockup: concept §01. Sky→cream vertical split ground (LinearGradient), greeting "Hi, {name}! ☀️" + avatar, `TimerBadge` meter, then **one 2-column grid of `VideoCard`s. Nothing else.**

- Exit is a single low-contrast "🔒 Grown-ups" pill at the bottom → PIN gate. Remove any visible settings gear from child mode (current build has one top-left — delete it).
- AC: no search/browse/tabs/scroll-rails; every tappable ≥64pt; gear gone; grid shows only approved videos for the active child.

### 5.2 Profile Picker — `src/app/whos-watching.tsx`

Mockup §02. Plum gradient, "Who's watching?", big animal-avatar tiles (66px faces, white ring), dashed "Add a child", corner "🔒 Grown-ups" chip → PIN gate.

- AC: avatars are characters, not photos; grown-up entry visibly locked; add-child hits profile cap → paywall context.

### 5.3 PIN Gate — `src/app/pin-unlock.tsx` (+ `(parent)/child-mode-gate.tsx`)

Mockup §03. Cream ground, `OwlBubble` "Grown-ups only!", scope line ("Enter your PIN to leave Child Mode and open settings."), 4 boxed cells, keypad, "Use Face ID" + "Forgot PIN?" always visible.

- AC: gates BOTH child-mode exit and settings; biometrics optional fast path with PIN fallback; email reset path exists; 3-strikes → 30s cooldown; copy states scope.

### 5.4 Break Screen — `src/app/(child)/times-up.tsx`

Mockup §04. Sunset gradient (`#FFB88A → #FF8A6B → plum`), glowing moon 🌙, "All done for today, {name}!", celebration stats (minutes watched, videos enjoyed), footer "🔒 Grown-ups can add more time".

- AC: **zero child-tappable controls** — no dismiss, no snooze, no "5 more minutes". Only PIN unlocks more time. Respect reduced-motion for the glow animation.

### 5.5 Player — `src/app/(child)/player.tsx`

Mockup §05 (portrait + landscape). Dark `player.bg`. Top: `‹` back (→ child grid) + compact `TimerBadge`. YouTube embed fully wrapped — no comments/channel/share/up-next from YouTube; title is plain text, never a link. Track row with times. Controls: ⏮ / big coral ⏸ (66pt) / ⏭ — prev/next move through the **approved playlist only**. Bottom: `UpNextCard`.

- Landscape (`expo-screen-orientation`): same triad centered over tap-anywhere scrim, controls autofade 3s, ✕ returns to portrait grid.
- AC: video end → next approved item or back to grid (playlist end = dead end, no autoplay beyond playlist); no YouTube chrome reachable; controls ≥64pt.

### 5.6 Parent Today tab — `src/app/(parent)/(tabs)/index.tsx` (+ merge `activity.tsx` here)

Mockup §06. Paper ground. `ParentHeader` "Today" + `ChildSwitcher`. Cards in order: hero number ("45 min", delta vs. limit in `grass`), `WeekBars` (last 7 days), "Watched today" list (thumb, title, duration · finished), single CTA "Adjust daily limit" (night bg) → time-limit screen.

- AC: hero number readable in <1s; insight → control (CTA present); all data scoped to `ChildSwitcher` selection. If `activity.tsx` becomes redundant, fold it in and delete the route.

### 5.7 Parent Playlist tab — `src/app/(parent)/(tabs)/playlist.tsx`

Mockup §06. Header "{Child}'s playlist" + honest counter "6 of 10 videos · Free". Hero element = paste field (dashed `child.skyDeep` border, "Paste a YouTube link…"). Rows: thumb, title, meta, `StatusBadge` REVIEW/LIVE. New links land as REVIEW → `review-video.tsx` approval flow → LIVE.

- AC: paste-first (field above the list); REVIEW items never appear in child mode; counter reflects entitlements; hitting the cap routes to paywall with context.

### 5.8 Parent Settings tab — `src/app/(parent)/(tabs)/settings.tsx`

Mockup §07 (rebuilt version). Order: `ParentHeader` "Settings" → `IdentityCard` → `ChildSwitcher` → `PremiumBanner` → group **"Mia's rules"** (`SettingsRow`: Daily limit `45 min ›`, Bedtime cut-off `7:30 PM ›`, Playlist `6 videos ›`) → group **"Safety"** (PIN & Face ID `On ›`, Kid-proof exit toggle) → account/help row.

- AC: every navigable row shows its current value; rules rows re-scope when switcher changes; icon slots uniform 30×30 (§3).

### 5.9 Daily Limit — `src/app/(parent)/time-limit.tsx`

Mockup §07. `OwlBubble` "How long can {name} watch each day?" → `OptionList` presets: `20 min · Short & sweet / 45 min · Just right / 60 min · Movie day / 90 min · Rainy Sunday` → toggles group: Weekends (+30 min Sat/Sun), Bedtime cut-off (7:30 PM), 5-minute warning → CTA "Save for {name}".

- AC: presets replace any free stepper/dial; 5-min warning fires a gentle in-player heads-up before the break screen.

### 5.10 PIN & Safety — `src/app/(parent)/change-pin.tsx` (or new `safety.tsx` route)

Mockup §07. `FactsPanel` first ("What's protected right now" — limit, kid-proof exit, approved-only playback, from live values), then controls group: Change PIN `•••• ›`, Face ID toggle, Reset PIN by email.

- AC: facts render from real store/settings values; changing a value elsewhere updates the sentence.

### 5.11 Paywall — `src/app/paywall.tsx`

Mockup §08. Plum gradient, owl, **trigger as headline** ("{Child}'s playlist is full — 10 of 10 videos"), 4 plain checkmarks (incl. "Everything in Free, forever"), monthly vs yearly cards (yearly outlined `sun` + SAVE badge, percent derived from the live prices), "Subscribe now" CTA, equal-weight "Not now" + "Restore purchase".

- AC: accepts a `trigger` param and renders it; only ever shown at a cap or from the Settings banner — never on launch, **never in `(child)` routes**; "Not now" always present.

### 5.12 Onboarding — `src/app/(onboarding)/*`

Mockup §09. Four steps, progress dots: **welcome (promise)** → **child-profile** → **first video paste** (add this step — reuse add-video form) → **pin-setup**. Owl carries through. Each screen: one idea, one illustration, one primary CTA, quiet secondary.

- AC: flow ends on the populated child grid ready to hand over — not a signup wall or empty state.

---

## 6. Copy rules

- Child-facing: first names, warmth, zero system language. "All done for today, Mia!" not "Daily limit reached."
- Parent-facing: plain, specific, value-forward. Buttons say what happens ("Save for Mia", "Subscribe now").
- The wall explains itself: every PIN prompt states what the PIN protects.
- Facts over promises on safety surfaces (FactsPanel pattern).

## 7. Verification checklist (run after each screen)

- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass.
- [ ] Screen matches its concept mockup section (open `design-redesign-concept.html` side-by-side).
- [ ] §3 layout rules hold (no stretched icon slots, no wrapping row titles).
- [ ] No parent UI reachable from `(child)` routes without the PIN gate.
- [ ] Touch targets: ≥64pt child, ≥44pt parent.
- [ ] Haptics (`expo-haptics`) on: PIN digits, toggle flips, video tile press.
- [ ] Works on smallest supported viewport (iPhone SE width) without horizontal scroll.

## 8. Pattern sources (for context, not re-research)

Child grid: Netflix Kids, Tubi · Profiles: Spotify Kids, Disney+ locks · PIN: HBO Max Kid-Proof Exit, Netflix keypad · Break: Instagram daily limit (with the escape hatch deliberately removed) · Player: Headspace/Quibi triad · Settings hub: Telegram/Cosmos identity card, Todoist premium banner, Cosmos value-labels · Limits: Duolingo/Py/Noom goal presets · Safety: TikTok Family Pairing facts · Nav: Duolingo active tile + Telegram badge.

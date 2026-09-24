import * as Device from 'expo-device';

// Tablets are held farther away and have room to spare, so type, icons and the
// control boxes around them all go up a notch there. deviceType is a
// synchronous native constant, so this resolves once at module load.
const TABLET_SCALE = 1.15;
const isTabletDevice = Device.deviceType === Device.DeviceType.TABLET;

/** Icons, glyphs and touch targets grow with the text on tablets. */
export const uiScale = isTabletDevice ? TABLET_SCALE : 1;

/** Rounds so scaled icon boxes stay on whole points. */
export const scaleUi = (value: number): number => Math.round(value * uiScale);

export const colors = {
  child: { sky: '#4EC3E0', skyDeep: '#16708B', sun: '#FFC93E', coral: '#C94735', grass: '#6BCB77', plum: '#7C5CBF', cream: '#FFF8EC' },
  parent: { paper: '#F4F1EB', night: '#2A3B5C', card: '#FFFFFF', hairline: '#E7E1D8', muted: '#6F6675' },
  player: { bg: '#1B2233' },
  state: { review: { bg: '#FFF0C7', text: '#765400' }, live: { bg: '#EEEAE3', text: '#4F4655' } },
  bg: '#F4F1EB',
  canvas: '#F3EDE3',
  card: '#FFFFFF',
  ink: '#2A3B5C',
  muted: '#6F6675',
  subtle: '#667085',
  border: '#E7EBF1',
  primary: '#4EC3E0',
  primaryDark: '#1E93B5',
  primaryTint: '#EAF6FA',
  coral: '#C94735',
  coralGrad: ['#D54B3B', '#BE3D2E'] as const,
  coralTint: '#FFF0EF',
  green: '#6BCB77',
  greenDark: '#287A4C',
  greenTint: '#F1FBF6',
  amber: '#FFC93E',
  amberText: '#765400',
  amberTint: '#FFF3D9',
  amberDark: '#FFCC66',
  red: '#EF6F6C',
  playerBg: '#1B2233',
  nightGrad: ['#1C2B4E', '#33456F', '#43567F'] as const,
  dotInactive: '#D0D5DD',
} as const;

export const radii = {
  input: 18,
  card: 20,
  cardLg: 24,
  cardXl: 28,
  pill: 28,
  tile: 16,
  navPill: 18,
} as const;

// Touch targets and icon slots follow the tablet bump so the chrome stays in
// proportion with the larger type (see uiScale below).
export const controls = {
  iconSlot: scaleUi(30),
  toggleW: 51,
  toggleH: 31,
  navBadge: scaleUi(16),
  minTouchChild: scaleUi(64),
  minTouchParent: scaleUi(44),
} as const;

export const spacing = {
  screenX: 24,
  gap: 12,
} as const;

// Nunito stands in for SF Pro Rounded (per design). Loaded in the root layout.
export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

// Keep the default UI comfortably readable while preserving the user's
// additional Dynamic Type / font-size setting from iOS and Android; tablets get
// the extra bump from TABLET_SCALE on top.
export const typography = {
  scale: isTabletDevice ? 1.1 * TABLET_SCALE : 1.1,
} as const;

export type FontWeight = keyof typeof fonts;

/**
 * A Txt size that renders at exactly `points` on this device. Tablet-only
 * layouts are drawn 1:1 in the iPad design, so they opt out of the tablet
 * type bump rather than being scaled twice.
 */
export const exactType = (points: number): number => points / typography.scale;

export const shadows = {
  // 0 8 20 rgba(91,174,247,.35) — primary button
  primaryButton: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  // navy primary CTA — a soft lift rather than a coloured glow
  navyButton: {
    shadowColor: colors.parent.night,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  // 0 10 24 rgba(255,138,122,.35) — coral CTA
  coralButton: {
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  // soft card shadow — 0 3 10..12 rgba(23,32,51,.05/.06)
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  // hero card — 0 10 30 rgba(23,32,51,.07)
  cardLg: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 4,
  },
} as const;

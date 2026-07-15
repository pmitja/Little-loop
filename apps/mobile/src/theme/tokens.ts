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

export const controls = { iconSlot: 30, toggleW: 51, toggleH: 31, navBadge: 16, minTouchChild: 64, minTouchParent: 44 } as const;

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

export type FontWeight = keyof typeof fonts;

export const shadows = {
  // 0 8 20 rgba(91,174,247,.35) — primary button
  primaryButton: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
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

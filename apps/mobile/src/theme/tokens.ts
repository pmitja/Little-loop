export const colors = {
  bg: '#FFF9F1',
  canvas: '#F3EDE3',
  card: '#FFFFFF',
  ink: '#172033',
  muted: '#667085',
  subtle: '#98A2B3',
  border: '#E7EBF1',
  primary: '#5BAEF7',
  primaryDark: '#2E7FD1',
  primaryTint: '#EAF4FE',
  coral: '#FF8A7A',
  coralGrad: ['#FF9A8B', '#FF8A7A'] as const,
  coralTint: '#FFF0EF',
  green: '#6DD6A0',
  greenDark: '#3FA872',
  greenTint: '#F1FBF6',
  amber: '#FFB84D',
  amberText: '#B27B1E',
  amberTint: '#FFF3D9',
  amberDark: '#FFCC66',
  red: '#EF6F6C',
  playerBg: '#111B31',
  nightGrad: ['#1C2B4E', '#33456F', '#43567F'] as const,
  dotInactive: '#D0D5DD',
} as const;

export const radii = {
  input: 18,
  card: 20,
  cardLg: 24,
  cardXl: 28,
  pill: 28,
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

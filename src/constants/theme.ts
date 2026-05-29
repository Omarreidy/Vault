import { Platform } from 'react-native';

export const COLORS = {
  // Backgrounds — warm white, never cold
  background: '#FAFAF7',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  sheetBg: '#F4F1EC',

  // Borders — barely there
  border: 'rgba(0,0,0,0.07)',
  borderMid: 'rgba(0,0,0,0.12)',

  // Gold — the hero color. Rich, warm, unmistakable.
  gold: '#C9A96E',
  goldLight: '#E8C98A',
  goldDark: '#9A7A3A',
  goldGlow: 'rgba(201,169,110,0.15)',
  goldGlowStrong: 'rgba(201,169,110,0.3)',

  // Status
  green: '#00A878',
  greenBg: 'rgba(0,168,120,0.08)',
  red: '#C0392B',

  // Text — deep warm black, never cold
  text: '#0D0C0A',
  textSub: '#3A3830',
  textDim: '#8A8478',
  textMuted: '#C4BEB4',

  // Tier accent colors
  tierBronze: '#9B6A2F',
  tierSilver: '#8A8A9A',
  tierGold: '#C9A96E',
  tierPlatinum: '#7A7A9A',
  tierBlack: '#1A1A1A',
};

export const TIERS = {
  BRONZE:   { name: 'Bronze',   color: '#9B6A2F', glow: 'rgba(155,106,47,0.2)',  minScore: 0,   maxScore: 199  },
  SILVER:   { name: 'Silver',   color: '#8A8A9A', glow: 'rgba(138,138,154,0.2)', minScore: 200, maxScore: 449  },
  GOLD:     { name: 'Gold',     color: '#C9A96E', glow: 'rgba(201,169,110,0.3)', minScore: 450, maxScore: 699  },
  PLATINUM: { name: 'Platinum', color: '#7A7A9A', glow: 'rgba(122,122,154,0.2)', minScore: 700, maxScore: 899  },
  BLACK:    { name: 'Black',    color: '#1A1A1A', glow: 'rgba(0,0,0,0.15)',      minScore: 900, maxScore: 1000 },
};

export const DISPLAY_FONT = Platform.select({
  web: '"Cormorant Garamond", "Didot", "Bodoni MT", Georgia, serif',
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

export const FONTS = {
  display: DISPLAY_FONT,
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 17,
    xl: 22,
    xxl: 30,
    hero: 88,
  },
  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  tracking: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1.5,
    widest: 3,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 36,
  xxl: 56,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 999,
};

// Floating card shadow — the key to the premium feel
export const CARD_SHADOW = {
  shadowColor: '#9A8060',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
  elevation: 6,
};

export const CARD_SHADOW_STRONG = {
  shadowColor: '#6A5030',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.16,
  shadowRadius: 40,
  elevation: 12,
};

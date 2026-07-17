// Brand tokens ported from the VAULT app (src/constants/theme.ts).
// Keep in sync with the app — this is the single source of truth for the site.

export const COLORS = {
  // Light world (the app)
  cream: '#FAFAF7',
  creamDeep: '#F4F1EC',
  ink: '#0D0C0A',
  inkSub: '#3A3830',
  inkDim: '#8A8478',
  inkMuted: '#C4BEB4',

  // Dark world (the vault)
  night: '#08080C',
  nightSoft: '#111010',
  nightBorder: '#1E1C1A',
  parchment: '#E8E0D5',
  parchmentDim: '#B0A99F',
  parchmentFaint: '#6B6560',

  // Gold
  gold: '#C9A96E',
  goldLight: '#E8C98A',
  goldDark: '#9A7A3A',
  goldDeep: '#B8934A',
  goldGlow: 'rgba(201,169,110,0.15)',
  goldGlowStrong: 'rgba(201,169,110,0.3)',

  // Status
  rise: '#00A878',
  fall: '#C0392B',
} as const;

export const TIERS = [
  { name: 'Bronze', color: '#9B6A2F', glow: 'rgba(155,106,47,0.2)', minScore: 0, maxScore: 199 },
  { name: 'Silver', color: '#8A8A9A', glow: 'rgba(138,138,154,0.2)', minScore: 200, maxScore: 449 },
  { name: 'Gold', color: '#C9A96E', glow: 'rgba(201,169,110,0.3)', minScore: 450, maxScore: 699 },
  { name: 'Platinum', color: '#7A7A9A', glow: 'rgba(122,122,154,0.2)', minScore: 700, maxScore: 899 },
  { name: 'Black', color: '#1A1A1A', glow: 'rgba(0,0,0,0.15)', minScore: 900, maxScore: 1000 },
] as const;

export const APP_STORE_URL: string | null = null; // TODO: insert App Store link when live

export const SITE = {
  name: 'VAULT',
  domain: 'https://getsvault.com',
  tagline: 'Your Financial Operating System',
  supportEmail: 'support@getvault.app',
} as const;

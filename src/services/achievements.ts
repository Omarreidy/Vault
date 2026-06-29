export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
  rarity: 'common' | 'rare' | 'legendary';
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1',  title: 'First Step',        description: 'Join VAULT',                  icon: '◈',  unlocked: false, rarity: 'common'    },
  { id: 'a2',  title: 'On The Board',      description: 'Take your first wealth move', icon: '◉',  unlocked: false, rarity: 'common'    },
  { id: 'a3',  title: 'Silver Standard',   description: 'Reach Silver tier',           icon: '◇',  unlocked: false, rarity: 'common'    },
  { id: 'a4',  title: 'Gold Standard',     description: 'Reach Gold tier',             icon: '◆',  unlocked: false, rarity: 'rare'      },
  { id: 'a5',  title: 'Streak Starter',    description: '7-day streak',                icon: '🔥', unlocked: false, rarity: 'common'    },
  { id: 'a6',  title: '10K Club',          description: 'Save $10,000',                icon: '◑',  unlocked: false, rarity: 'rare'      },
  { id: 'a7',  title: 'Platinum Standard', description: 'Reach Platinum tier',         icon: '◎',  unlocked: false, rarity: 'rare'      },
  { id: 'a8',  title: 'Month Warrior',     description: '30-day streak',               icon: '⚡', unlocked: false, rarity: 'rare'      },
  { id: 'a9',  title: 'Debt Slayer',       description: 'Pay off $5,000 in debt',      icon: '⛓',  unlocked: false, rarity: 'rare'      },
  { id: 'a10', title: 'The Black Card',    description: 'Reach Black tier',            icon: '■',  unlocked: false, rarity: 'legendary' },
  { id: 'a11', title: '100K Club',         description: 'Net worth over $100,000',     icon: '◐',  unlocked: false, rarity: 'legendary' },
  { id: 'a12', title: 'Centurion',         description: '100-day streak',              icon: '◉',  unlocked: false, rarity: 'legendary' },
];

import AsyncStorage from '@react-native-async-storage/async-storage';

const UNLOCK_KEY = '@vault_achievement_unlocks_v1';

export interface AchievementContext {
  streak: number;
  score: number;          // velocity score total (0–1000)
  movesActed: number;     // lifetime moves taken
  plaidConnected: boolean;
  savings?: number;       // from Plaid
  netWorth?: number;      // from Plaid
  debtPaid?: number;      // cumulative credit-debt reduction tracked over time
}

// Minimal shape of the bank summary the achievement logic needs.
export interface PlaidLike {
  checking?: number;
  savings?: number;
  investments?: number;
  creditDebt?: number;
}

// Liquid cash = what a person would call "money in the bank" (checking + savings).
// This is what "10K Club / Save $10,000" should measure — NOT just the savings
// subtype, otherwise $12k sitting in a checking account never counts.
export function liquidCash(p?: PlaidLike | null): number | undefined {
  if (!p) return undefined;
  return (p.checking ?? 0) + (p.savings ?? 0);
}

export function netWorthOf(p?: PlaidLike | null): number | undefined {
  if (!p) return undefined;
  return (p.checking ?? 0) + (p.savings ?? 0) + (p.investments ?? 0) - (p.creditDebt ?? 0);
}

// Single source of truth for building the achievement context from real data.
// Every screen (Profile, Score, the bank-connected celebration) uses this so the
// unlock results can never drift apart.
export function buildAchievementContext(args: {
  streak: number;
  score: number;
  movesActed: number;
  plaidConnected: boolean;
  plaid?: PlaidLike | null;
}): AchievementContext {
  return {
    streak: args.streak ?? 0,
    score: args.score ?? 0,
    movesActed: args.movesActed ?? 0,
    plaidConnected: args.plaidConnected,
    savings: liquidCash(args.plaid),
    netWorth: netWorthOf(args.plaid),
  };
}

// Pure evaluation: given real context, which achievements are unlocked + their progress.
export function evaluateAchievements(ctx: AchievementContext): Achievement[] {
  const has = (n?: number, t = 0) => typeof n === 'number' && n >= t;
  const calc = (id: string): { unlocked: boolean; progress?: number; target?: number } => {
    switch (id) {
      case 'a1':  return { unlocked: true }; // joined VAULT
      case 'a2':  return { unlocked: ctx.movesActed >= 1, progress: Math.min(ctx.movesActed, 1), target: 1 };
      case 'a3':  return { unlocked: ctx.score >= 200, progress: Math.min(ctx.score, 200), target: 200 };
      case 'a4':  return { unlocked: ctx.score >= 450, progress: Math.min(ctx.score, 450), target: 450 };
      case 'a5':  return { unlocked: ctx.streak >= 7, progress: Math.min(ctx.streak, 7), target: 7 };
      case 'a6':  return { unlocked: ctx.plaidConnected && has(ctx.savings, 10000), progress: Math.min(ctx.savings ?? 0, 10000), target: 10000 };
      case 'a7':  return { unlocked: ctx.score >= 700, progress: Math.min(ctx.score, 700), target: 700 };
      case 'a8':  return { unlocked: ctx.streak >= 30, progress: Math.min(ctx.streak, 30), target: 30 };
      case 'a9':  return { unlocked: ctx.plaidConnected && has(ctx.debtPaid, 5000), progress: Math.min(ctx.debtPaid ?? 0, 5000), target: 5000 };
      case 'a10': return { unlocked: ctx.score >= 900, progress: Math.min(ctx.score, 900), target: 900 };
      case 'a11': return { unlocked: ctx.plaidConnected && has(ctx.netWorth, 100000), progress: Math.min(ctx.netWorth ?? 0, 100000), target: 100000 };
      case 'a12': return { unlocked: ctx.streak >= 100, progress: Math.min(ctx.streak, 100), target: 100 };
      default:    return { unlocked: false };
    }
  };

  return ACHIEVEMENTS.map(a => {
    const r = calc(a.id);
    return { ...a, unlocked: r.unlocked, progress: r.progress, target: r.target };
  });
}

// Evaluates achievements AND persists the first-unlock timestamp for each, so the
// "Recent achievements" view can sort by when they were actually earned.
export async function getAchievements(ctx: AchievementContext): Promise<Achievement[]> {
  const evaluated = evaluateAchievements(ctx);
  let unlocks: Record<string, string> = {};
  try {
    const raw = await AsyncStorage.getItem(UNLOCK_KEY);
    if (raw) unlocks = JSON.parse(raw);
  } catch {}

  let changed = false;
  const now = new Date().toISOString();
  for (const a of evaluated) {
    if (a.unlocked && !unlocks[a.id]) { unlocks[a.id] = now; changed = true; }
  }
  if (changed) {
    try { await AsyncStorage.setItem(UNLOCK_KEY, JSON.stringify(unlocks)); } catch {}
  }

  return evaluated.map(a => ({
    ...a,
    unlockedAt: a.unlocked && unlocks[a.id] ? new Date(unlocks[a.id]) : undefined,
  }));
}

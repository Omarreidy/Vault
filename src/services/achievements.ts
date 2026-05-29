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
  // Unlocked
  { id: 'a1', title: 'First Step',       description: 'Joined VAULT',              icon: '◈', unlocked: true,  unlockedAt: new Date(2026,0,15), rarity: 'common' },
  { id: 'a2', title: 'On The Board',     description: 'Took your first wealth move', icon: '◉', unlocked: true,  unlockedAt: new Date(2026,0,16), rarity: 'common' },
  { id: 'a3', title: 'Silver Standard',  description: 'Reached Silver tier',        icon: '◇', unlocked: true,  unlockedAt: new Date(2026,1,3),  rarity: 'common' },
  { id: 'a4', title: 'Gold Standard',    description: 'Reached Gold tier',          icon: '◆', unlocked: true,  unlockedAt: new Date(2026,4,1),  rarity: 'rare'   },
  { id: 'a5', title: 'Streak Starter',   description: '7-day streak',               icon: '🔥', unlocked: true, unlockedAt: new Date(2026,3,20), rarity: 'common' },
  { id: 'a6', title: '10K Club',         description: 'Saved $10,000',              icon: '◑', unlocked: true,  unlockedAt: new Date(2026,3,15), rarity: 'rare'   },

  // Locked — in progress
  { id: 'a7', title: 'Platinum Standard',description: 'Reach Platinum tier',        icon: '◎', unlocked: false, progress: 647, target: 700, rarity: 'rare'      },
  { id: 'a8', title: 'Month Warrior',    description: '30-day streak',              icon: '⚡', unlocked: false, progress: 23,  target: 30,  rarity: 'rare'      },
  { id: 'a9', title: 'Debt Slayer',      description: 'Pay off $5,000 in debt',     icon: '⛓', unlocked: false, progress: 3200, target: 5000, rarity: 'rare'    },

  // Locked — not started
  { id: 'a10', title: 'The Black Card',  description: 'Reach Black tier',           icon: '■', unlocked: false, rarity: 'legendary' },
  { id: 'a11', title: '100K Club',       description: 'Net worth over $100,000',    icon: '◐', unlocked: false, rarity: 'legendary' },
  { id: 'a12', title: 'Centurion',       description: '100-day streak',             icon: '◉', unlocked: false, rarity: 'legendary' },
];

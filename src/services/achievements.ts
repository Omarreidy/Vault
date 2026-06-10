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

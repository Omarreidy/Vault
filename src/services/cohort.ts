export interface CohortMember {
  id: string;
  name: string;
  initials: string;
  tier: string;
  streak: number;
  movesCompleted: number;       // total moves completed
  mutualMoves: number;          // moves you've both completed
  weeklyMoves: number;          // moves this week
  relativeScore: number;        // delta vs user score (positive = ahead)
  isMe: boolean;
  joinedWeeksAgo: number;
}

export interface CohortMilestone {
  label: string;
  progress: number;             // 0–1
  description: string;
  reward: string;
}

export interface CohortStats {
  totalMembers: number;
  avgStreak: number;
  totalMovesThisWeek: number;
  topMover: string;
}

// Cohort matched on: Gold tier · $70–120K income · Build wealth goal · Ages 25–34
// User sits in the middle — ahead of 2, behind 3 — maximises aspiration + protection
export const COHORT: CohortMember[] = [
  {
    id: 'c1',
    name: 'Casey W.',
    initials: 'CW',
    tier: 'Gold',
    streak: 45,
    movesCompleted: 14,
    mutualMoves: 5,
    weeklyMoves: 4,
    relativeScore: +24,
    isMe: false,
    joinedWeeksAgo: 9,
  },
  {
    id: 'c2',
    name: 'Jordan K.',
    initials: 'JK',
    tier: 'Gold',
    streak: 31,
    movesCompleted: 11,
    mutualMoves: 6,
    weeklyMoves: 3,
    relativeScore: +11,
    isMe: false,
    joinedWeeksAgo: 7,
  },
  {
    id: 'c3',
    name: 'Alex M.',
    initials: 'AM',
    tier: 'Gold',
    streak: 18,
    movesCompleted: 9,
    mutualMoves: 4,
    weeklyMoves: 2,
    relativeScore: +4,
    isMe: false,
    joinedWeeksAgo: 6,
  },
  {
    id: 'me',
    name: 'You',
    initials: 'AX',
    tier: 'Gold',
    streak: 23,
    movesCompleted: 8,
    mutualMoves: 0,
    weeklyMoves: 3,
    relativeScore: 0,
    isMe: true,
    joinedWeeksAgo: 5,
  },
  {
    id: 'c4',
    name: 'Riley P.',
    initials: 'RP',
    tier: 'Gold',
    streak: 11,
    movesCompleted: 7,
    mutualMoves: 3,
    weeklyMoves: 2,
    relativeScore: -13,
    isMe: false,
    joinedWeeksAgo: 5,
  },
  {
    id: 'c5',
    name: 'Morgan L.',
    initials: 'ML',
    tier: 'Gold',
    streak: 7,
    movesCompleted: 5,
    mutualMoves: 2,
    weeklyMoves: 1,
    relativeScore: -26,
    isMe: false,
    joinedWeeksAgo: 4,
  },
];

// Shared cohort milestone — everyone working toward the same goal
export const COHORT_MILESTONE: CohortMilestone = {
  label: 'COHORT GOAL · MAY',
  description: '40 combined moves this month',
  progress: 0.76,   // 30 of 40 done across the group
  reward: '+200 XP each when complete',
};

export const COHORT_STATS: CohortStats = {
  totalMembers: 6,
  avgStreak: 22,
  totalMovesThisWeek: 15,
  topMover: 'Casey W.',
};

export function getCohortRank(): number {
  const sorted = [...COHORT].sort((a, b) => b.relativeScore - a.relativeScore);
  return sorted.findIndex(m => m.isMe) + 1;
}

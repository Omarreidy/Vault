export interface LeaderboardEntry {
  rank: number;
  initials: string;
  tier: string;
  score: number;
  weeklyChange: number;
  isMe: boolean;
}

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1,   initials: 'MK', tier: 'Gold',   score: 812, weeklyChange: +94, isMe: false },
  { rank: 2,   initials: 'JR', tier: 'Gold',   score: 798, weeklyChange: +71, isMe: false },
  { rank: 3,   initials: 'SA', tier: 'Gold',   score: 761, weeklyChange: +55, isMe: false },
  { rank: 4,   initials: 'TC', tier: 'Gold',   score: 749, weeklyChange: +88, isMe: false },
  { rank: 5,   initials: 'BL', tier: 'Gold',   score: 712, weeklyChange: +42, isMe: false },
  { rank: 47,  initials: 'AX', tier: 'Gold',   score: 647, weeklyChange: +47, isMe: true  },
  { rank: 48,  initials: 'PW', tier: 'Gold',   score: 641, weeklyChange: +29, isMe: false },
  { rank: 49,  initials: 'DM', tier: 'Gold',   score: 635, weeklyChange: +18, isMe: false },
];

export const LEADERBOARD_STATS = {
  totalMembers: 2847,
  userRank: 47,
  topPercent: 2,
  weeklyMoverRank: 12,
};

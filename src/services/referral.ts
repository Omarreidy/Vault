export interface ReferralInvite {
  id: string;
  name: string;
  initials: string;
  status: 'accepted' | 'pending';
  xpEarned: number;
  daysAgo: number;
}

export interface ReferralData {
  inviteCode: string;
  inviteLink: string;
  cohortSpotsTotal: number;
  cohortSpotsFilled: number;
  totalXpEarned: number;
  xpPerReferral: number;
  invites: ReferralInvite[];
}

export const REFERRAL: ReferralData = {
  inviteCode: 'VAULT-AX7K',
  inviteLink: 'vault.app/join/AX7K',
  cohortSpotsTotal: 5,         // 5 open spots in your cohort
  cohortSpotsFilled: 2,        // 2 accepted so far
  totalXpEarned: 150,
  xpPerReferral: 75,
  invites: [
    {
      id: 'r1',
      name: 'Jamie S.',
      initials: 'JS',
      status: 'accepted',
      xpEarned: 75,
      daysAgo: 3,
    },
    {
      id: 'r2',
      name: 'Drew M.',
      initials: 'DM',
      status: 'accepted',
      xpEarned: 75,
      daysAgo: 8,
    },
    {
      id: 'r3',
      name: 'Sam T.',
      initials: 'ST',
      status: 'pending',
      xpEarned: 0,
      daysAgo: 1,
    },
  ],
};

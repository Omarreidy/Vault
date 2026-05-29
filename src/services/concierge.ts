import { MOCK_USER } from './mockData';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const { score, tier, streakDays } = MOCK_USER;

function buildResponse(input: string): string {
  const q = input.toLowerCase();

  if (q.includes('saving') || q.includes('enough') || q.includes('save')) {
    return `Based on your accounts, you're saving about 14% of your income right now. That puts you ahead of most people your age — the average is 8–10%.\n\nTo hit Gold Platinum tier, you'd want to push that to 18–20%. The easiest lever: that $2,340 sitting in Chase checking. Move it to a high-yield savings account and you're earning 5x more on idle cash overnight.\n\nYour savings velocity score is ${score.savings}/100. You're doing well — not elite yet.`;
  }

  if (q.includes('salary') || q.includes('negotiat') || q.includes('raise') || q.includes('pay')) {
    return `This is where most people leave serious money on the table.\n\nFor your role and location, the market rate is roughly $12K above your current salary. You're 9 months in — that's prime timing. Too early looks desperate, 12+ months looks like you've accepted it.\n\nThree moves before you ask:\n1. Get a competing offer (even one you don't take)\n2. Document 2–3 specific wins with dollar impact\n3. Anchor $15K above what you actually want\n\nMost managers have budget flexibility they never volunteer. You have to make them use it.`;
  }

  if (q.includes('debt') && q.includes('invest') || q.includes('pay off') || q.includes('invest or')) {
    return `The math answer: if your debt rate is above 7%, pay it down first. Below 7%, invest the difference.\n\nThe psychology answer: carrying high-interest debt while investing feels productive but isn't — you're paying 22% on a credit card while earning 8% in the market. That's a guaranteed -14% return.\n\nYour debt velocity score is ${score.debt}/100. You're making progress. If you have any credit card debt above 18%, that's your highest-return investment right now — guaranteed, risk-free.`;
  }

  if (q.includes('tier') || q.includes('next tier') || q.includes('platinum') || q.includes('level')) {
    const pointsNeeded = tier === 'GOLD' ? 700 - score.total : 200;
    return `You're at ${score.total} points — ${pointsNeeded} away from Platinum.\n\nAt your current velocity (+${score.weeklyChange} pts/week), you'd hit Platinum in about ${Math.ceil(pointsNeeded / score.weeklyChange)} weeks.\n\nFastest ways to accelerate:\n• Take 3 Wealth Moves in a row (+24 pts)\n• Connect another financial account (+15 pts)\n• Maintain your ${streakDays}-day streak through end of month (+30 pts)\n\nPlatinum unlocks: priority concierge, exclusive partner rates, and the Platinum card in your profile.`;
  }

  if (q.includes('subscri') || q.includes('cancel') || q.includes('spending')) {
    return `I've flagged 4 subscriptions you're paying for but not using:\n\n• Adobe Acrobat — $14.99/mo (unused 4 months)\n• Duolingo Plus — $6.99/mo (last opened 67 days ago)\n• Calm — $7.99/mo (3 sessions in 6 months)\n• LinkedIn Premium — $39.99/mo (worth it only if actively job hunting)\n\nTotal: $69.96/month. That's $839/year. Cancelling all four moves your spending intelligence score up ~6 points.\n\nWant me to walk you through cancelling any of these?`;
  }

  if (q.includes('invest') || q.includes('stock') || q.includes('market') || q.includes('401k') || q.includes('roth')) {
    return `Your 401k contribution is at 4%, but your employer matches up to 6%. That gap costs you $1,200/year — free money you're leaving on the table.\n\nFirst move: bump 401k to 6%. Takes 5 minutes in your HR portal.\n\nAfter that, with your income and tax bracket, a Roth IRA makes sense — you're paying taxes now at a lower rate than you will in retirement. Max is $7,000/year ($583/month).\n\nYour investment velocity is ${score.investment}/100. Getting to employer match minimum alone would push that up 8 points.`;
  }

  if (q.includes('score') || q.includes('velocity') || q.includes('point')) {
    return `Your Wealth Velocity Score is ${score.total}/1000 — that puts you in the top ${100 - score.percentile}% of wealth builders in your age and income bracket.\n\nBreakdown:\n• Savings: ${score.savings}/100\n• Investment: ${score.investment}/100\n• Debt: ${score.debt}/100\n• Spending Intelligence: ${score.spending}/100\n\nBiggest opportunity: your investment score has the most upside. Getting employer match alone would add ~8 points. Maxing a Roth IRA on top of that could push you 20+ points over the next 90 days.`;
  }

  if (q.includes('mortgage') || q.includes('house') || q.includes('rent') || q.includes('buy')) {
    return `The rent vs. buy math depends heavily on how long you plan to stay.\n\nRule of thumb: if you're staying less than 5 years, renting usually wins — transaction costs alone (3–6% to buy, 6–10% to sell) eat your equity.\n\nIf you're staying 7+ years and can put 20% down without draining your emergency fund, buying starts to make sense.\n\nKey number most people ignore: your PITI payment (principal, interest, taxes, insurance) shouldn't exceed 28% of gross income. What's your current rent-to-income ratio? That'll tell us where you stand.`;
  }

  if (q.includes('emergency') || q.includes('fund') || q.includes('rainy day') || q.includes('cushion')) {
    return `3 months expenses = minimum. 6 months = solid. 9–12 months = if your income is variable or your job has risk.\n\nYour current liquid savings covers about 2.3 months at your spending rate — you're a little light.\n\nPriority order:\n1. Hit $1,000 emergency buffer (you're past this)\n2. Get to 3 months expenses (~$9,800 for you)\n3. Then aggressively invest beyond that\n\nThe $2,340 in your Chase checking is the low-hanging fruit — move it to your HYSA and you're closer to that 3-month target.`;
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hey. I've been watching your numbers.\n\nYou're at ${score.total} points this week, up ${score.weeklyChange} from last week. ${streakDays}-day streak is solid — don't break it.\n\nYour biggest open opportunity right now: the $2,340 sitting idle in checking. That alone is worth $140/year if you move it tonight.\n\nWhat do you want to dig into?`;
  }

  return `Good question. Based on your current profile — ${score.total} velocity score, ${tier} tier, ${streakDays}-day streak — here's my read:\n\nYou're in the top ${100 - score.percentile}% of wealth builders your age. The gap between where you are and where you want to be is mostly behavioral, not income-based.\n\nThe three highest-leverage moves for you right now:\n1. Move idle checking balance to HYSA (15 min, +$140/yr)\n2. Increase 401k to employer match (5 min, +$1,200/yr)\n3. Cancel 4 unused subscriptions (20 min, +$840/yr)\n\nThat's $2,180/year from 40 minutes of work. Want to walk through any of these?`;
}

export async function askConcierge(
  messages: ConversationMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const response = buildResponse(lastUserMessage?.content || '');

  // Stream character by character with realistic typing cadence
  for (let i = 0; i < response.length; i++) {
    onChunk(response[i]);
    await new Promise(resolve =>
      setTimeout(resolve, response[i] === '\n' ? 40 : Math.random() * 12 + 8)
    );
  }
}

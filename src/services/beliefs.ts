export type BeliefResponse = 'agree' | 'neutral' | 'disagree';

export interface BeliefQuestion {
  id: string;
  statement: string;               // the limiting belief as stated
  reframe: string;                 // the counter-truth shown after answering
  reframeDetail: string;           // one-line data point that backs the reframe
  dimension: 'scarcity' | 'identity' | 'timing' | 'risk' | 'worthiness';
}

export type ArchetypeKey = 'scarcity' | 'protector' | 'builder' | 'investor' | 'sovereign';

export interface BeliefArchetype {
  key: ArchetypeKey;
  name: string;
  tagline: string;
  description: string;
  strength: string;
  blindspot: string;
  nextMove: string;
}

export interface BeliefResult {
  mindsetScore: number;       // 0–100
  archetype: BeliefArchetype;
  dimensionScores: Record<BeliefQuestion['dimension'], number>;
  limitingCount: number;      // how many limiting beliefs flagged
}

export const BELIEF_QUESTIONS: BeliefQuestion[] = [
  {
    id: 'b1',
    statement: 'Wealth is mostly about luck — being in the right place at the right time.',
    reframe: 'Luck is prepared opportunity.',
    reframeDetail: '88% of self-made millionaires attribute wealth to habits, not luck. (Corley, 2016)',
    dimension: 'scarcity',
  },
  {
    id: 'b2',
    statement: 'I\'m not the type of person who is good with money.',
    reframe: 'Financial skill is learned, not inherited.',
    reframeDetail: 'Money habits are 90% behavior — zero correlation with IQ. (Housel, 2020)',
    dimension: 'identity',
  },
  {
    id: 'b3',
    statement: 'I\'ll start investing seriously once I have more money.',
    reframe: 'Time in the market beats timing the market — always.',
    reframeDetail: '$100/mo from 25 vs $500/mo from 35 → the early starter wins by $180K at 65.',
    dimension: 'timing',
  },
  {
    id: 'b4',
    statement: 'Investing feels too risky — I could lose everything.',
    reframe: 'Not investing is the riskiest move of all.',
    reframeDetail: 'Cash loses 2–3% to inflation every year. $50K in savings loses $1,500/yr in real value.',
    dimension: 'risk',
  },
  {
    id: 'b5',
    statement: 'Rich people got there by taking advantage of others.',
    reframe: 'Wealth compounds fastest when you create value, not extract it.',
    reframeDetail: '74% of US millionaires are first-generation — built from zero without inherited advantage.',
    dimension: 'scarcity',
  },
  {
    id: 'b6',
    statement: 'I don\'t deserve to be wealthy — it feels selfish.',
    reframe: 'Wealth gives you options. Options give you freedom to help.',
    reframeDetail: 'Wealthy households donate 3.4x more to charity per capita than average households.',
    dimension: 'worthiness',
  },
  {
    id: 'b7',
    statement: 'The economy is too broken — the system won\'t let me get ahead.',
    reframe: 'The gap is real. So is the path through it.',
    reframeDetail: 'Median net worth of consistent savers doubles every 7 years regardless of economic cycles.',
    dimension: 'scarcity',
  },
  {
    id: 'b8',
    statement: 'I\'m too far behind to ever catch up financially.',
    reframe: 'Compounding doesn\'t care about your past — only your next move.',
    reframeDetail: 'Someone starting at 35 with $0 but saving 20% of $80K income reaches $1M by 62.',
    dimension: 'timing',
  },
];

export const ARCHETYPES: Record<ArchetypeKey, BeliefArchetype> = {
  scarcity: {
    key: 'scarcity',
    name: 'Scarcity Thinker',
    tagline: 'You see the walls more than the doors.',
    description: 'You\'re cautious with money — sometimes to a fault. External forces feel bigger than your own agency. That caution protects you from bad bets but can also keep you from great ones.',
    strength: 'You never over-extend. You think before you act.',
    blindspot: 'You mistake safety for progress. The real risk is staying still.',
    nextMove: 'Take one small irreversible step — open the HYSA. Momentum rewires belief faster than reading.',
  },
  protector: {
    key: 'protector',
    name: 'The Protector',
    tagline: 'You guard what you have — now learn to grow it.',
    description: 'Security is your north star. You\'re responsible, consistent, and allergic to risk. That\'s valuable. But preservation without growth means inflation quietly wins.',
    strength: 'Discipline. You don\'t blow money. That\'s rare.',
    blindspot: 'You conflate risk with danger. Calculated risk is the engine of wealth.',
    nextMove: 'Automate $200/mo into an index fund. Set it, forget it. Let compounding do the believing for you.',
  },
  builder: {
    key: 'builder',
    name: 'The Builder',
    tagline: 'You know wealth is built. Now build faster.',
    description: 'You believe in the process — habits, systems, consistency. You\'re not waiting for a windfall; you\'re stacking bricks. The mindset is right. The execution just needs calibrating.',
    strength: 'Long-term thinking. You play the game most people don\'t start.',
    blindspot: 'You can under-bet on yourself. Raise the stakes when your track record earns it.',
    nextMove: 'Increase your savings rate by 3% this month. Small but compounding. Builders compound everything.',
  },
  investor: {
    key: 'investor',
    name: 'The Investor',
    tagline: 'Money is a tool. You\'re learning to wield it.',
    description: 'You understand that money works for you — not the other way around. You think in returns, timelines, and opportunity cost. You just need to execute more consistently.',
    strength: 'You see past the transaction to the system underneath.',
    blindspot: 'Analysis can become paralysis. A decent plan executed beats a perfect plan delayed.',
    nextMove: 'Max one tax-advantaged account this year. The structure matters more than the pick.',
  },
  sovereign: {
    key: 'sovereign',
    name: 'The Sovereign',
    tagline: 'You\'ve already decided you\'ll be wealthy.',
    description: 'Your relationship with money is settled. You don\'t wonder if — you wonder when and how. Limiting beliefs have been replaced by questions of execution. This is the rarest mindset profile.',
    strength: 'Identity-level certainty. You act like the person you\'re becoming.',
    blindspot: 'Confidence without feedback loops can drift into overconfidence. Stay calibrated.',
    nextMove: 'Your next move is leverage — income streams, assets, people. You\'re ready for that chapter.',
  },
};

export function scoreBelief(response: BeliefResponse): number {
  // agree with a limiting belief = low score, disagree = high
  if (response === 'disagree') return 100;
  if (response === 'neutral')  return 50;
  return 0;
}

export function computeBeliefResult(
  answers: Record<string, BeliefResponse>
): BeliefResult {
  const questions = BELIEF_QUESTIONS;
  const dimScores: Record<BeliefQuestion['dimension'], number[]> = {
    scarcity: [], identity: [], timing: [], risk: [], worthiness: [],
  };

  let totalScore = 0;
  let limitingCount = 0;

  questions.forEach(q => {
    const resp = answers[q.id] ?? 'neutral';
    const s = scoreBelief(resp);
    totalScore += s;
    dimScores[q.dimension].push(s);
    if (resp === 'agree') limitingCount++;
  });

  const mindsetScore = Math.round(totalScore / questions.length);

  const dimensionScores = Object.fromEntries(
    Object.entries(dimScores).map(([dim, scores]) => [
      dim,
      scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50,
    ])
  ) as Record<BeliefQuestion['dimension'], number>;

  // Archetype determined by weakest dimension + overall score
  let archetype: ArchetypeKey;
  if (mindsetScore >= 80) {
    archetype = 'sovereign';
  } else if (mindsetScore >= 65) {
    archetype = 'investor';
  } else if (mindsetScore >= 50) {
    archetype = 'builder';
  } else if (dimensionScores.scarcity < 40) {
    archetype = 'scarcity';
  } else {
    archetype = 'protector';
  }

  return {
    mindsetScore,
    archetype: ARCHETYPES[archetype],
    dimensionScores,
    limitingCount,
  };
}

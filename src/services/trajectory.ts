export interface TrajectoryInputs {
  age: number;
  annualIncome: number;
  annualExpenses: number;
  currentNetWorth: number;
  annualReturn: number;   // decimal e.g. 0.07
  actionsCompleted: number;
}

export interface MilestoneYear {
  label: string;
  amount: number;
  age: number;
  year: number;
  reached: boolean;
}

export interface TrajectoryPoint {
  year: number;
  age: number;
  netWorth: number;
}

export interface TrajectoryResult {
  fiAge: number;
  fiYear: number;
  yearsToFI: number;
  fiNumber: number;
  currentSavingsRate: number;
  annualSavings: number;
  projectedNetWorthAtFI: number;
  curve: TrajectoryPoint[];       // every year until FI + 5
  milestones: MilestoneYear[];
  actionSavings: number;          // years shaved by actions so far
  monthlyPassiveAtFI: number;     // monthly income at FI
}

const MILESTONE_AMOUNTS = [10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
const SAFE_WITHDRAWAL_RATE = 0.04;
// Each completed action = 0.5% boost to savings rate (dopamine mechanic)
const ACTION_SAVINGS_RATE_BOOST = 0.005;

export function computeTrajectory(inputs: TrajectoryInputs): TrajectoryResult {
  const {
    age,
    annualIncome,
    annualExpenses,
    currentNetWorth,
    annualReturn,
    actionsCompleted,
  } = inputs;

  const actionBoost = actionsCompleted * ACTION_SAVINGS_RATE_BOOST;
  // Zero/negative income would make this 0/0 = NaN and poison every output.
  const baseSavingsRate = annualIncome > 0
    ? Math.max(0, (annualIncome - annualExpenses) / annualIncome)
    : 0;
  const effectiveSavingsRate = Math.min(baseSavingsRate + actionBoost, 0.80);

  const annualSavings = annualIncome * effectiveSavingsRate;
  const fiNumber = annualExpenses / SAFE_WITHDRAWAL_RATE;

  // Build compound-growth curve year by year
  const curve: TrajectoryPoint[] = [];
  let nw = currentNetWorth;
  let fiAge = age + 50; // fallback max
  let fiYear = new Date().getFullYear() + 50;
  let foundFI = false;
  const currentYear = new Date().getFullYear();

  for (let y = 0; y <= 55; y++) {
    const yr = currentYear + y;
    const ag = age + y;
    curve.push({ year: yr, age: ag, netWorth: Math.round(nw) });

    if (!foundFI && nw >= fiNumber) {
      fiAge = ag;
      fiYear = yr;
      foundFI = true;
    }

    nw = nw * (1 + annualReturn) + annualSavings;
    if (foundFI && y > (fiAge - age) + 5) break;
  }

  if (!foundFI) {
    fiAge = age + 55;
    fiYear = currentYear + 55;
  }

  // Without action boosts — baseline for comparison
  const baseCurveNW = computeBaselineNW(currentNetWorth, annualIncome * baseSavingsRate, annualReturn, fiAge - age);
  const baselineYearsToFI = computeYearsToFI(currentNetWorth, annualIncome * baseSavingsRate, annualReturn, fiNumber);
  const actionSavings = Math.max(0, baselineYearsToFI - (fiAge - age));

  const milestones: MilestoneYear[] = MILESTONE_AMOUNTS.map(amount => {
    const pt = curve.find(p => p.netWorth >= amount);
    return {
      label: formatMilestone(amount),
      amount,
      age: pt ? pt.age : fiAge + 10,
      year: pt ? pt.year : fiYear + 10,
      reached: currentNetWorth >= amount,
    };
  });

  const monthlyPassiveAtFI = (fiNumber * SAFE_WITHDRAWAL_RATE) / 12;

  return {
    fiAge,
    fiYear,
    yearsToFI: Math.max(0, fiAge - age),
    fiNumber: Math.round(fiNumber),
    currentSavingsRate: Math.round(effectiveSavingsRate * 100),
    annualSavings: Math.round(annualSavings),
    projectedNetWorthAtFI: Math.round(fiNumber),
    curve,
    milestones,
    actionSavings: Math.round(actionSavings * 10) / 10,
    monthlyPassiveAtFI: Math.round(monthlyPassiveAtFI),
  };
}

function computeYearsToFI(nw: number, annualSavings: number, r: number, fiNumber: number): number {
  let val = nw;
  for (let y = 0; y <= 60; y++) {
    if (val >= fiNumber) return y;
    val = val * (1 + r) + annualSavings;
  }
  return 60;
}

function computeBaselineNW(nw: number, annualSavings: number, r: number, years: number): number {
  let val = nw;
  for (let y = 0; y < years; y++) val = val * (1 + r) + annualSavings;
  return val;
}

function formatMilestone(amount: number): string {
  if (amount >= 1_000_000) return `$${amount / 1_000_000}M`;
  if (amount >= 1_000) return `$${amount / 1_000}K`;
  return `$${amount}`;
}

// Default inputs based on MOCK_USER / onboarding data
export const DEFAULT_TRAJECTORY_INPUTS: TrajectoryInputs = {
  age: 28,
  annualIncome: 95_000,
  annualExpenses: 58_000,
  currentNetWorth: 34_000,
  annualReturn: 0.07,
  actionsCompleted: 0,
};

export type Verdict = 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
export type InvestAnswer = 'YES' | 'NO' | 'WATCH';

export interface InvestmentVerdict {
  answer: InvestAnswer;
  summary: string;
  reasons: string[];
  caution?: string;
}
export type RiskSeverity = 'high' | 'medium' | 'low';
export type MilestoneType = 'founding' | 'product' | 'financial' | 'acquisition' | 'pivot' | 'scandal';
export type RoadmapConfidence = 'confirmed' | 'likely' | 'speculative';
export type CompetitorThreat = 'high' | 'medium' | 'low';

export interface RevenueStream {
  name: string;
  pct: number;
  description: string;
}

export interface Executive {
  name: string;
  role: string;
  prior: string;       // previous companies/roles
  wins: string;        // notable success
}

export interface Milestone {
  year: number;
  event: string;
  impact: string;
  type: MilestoneType;
}

export interface RoadmapItem {
  timeframe: string;
  initiative: string;
  detail: string;
  confidence: RoadmapConfidence;
}

export interface Risk {
  category: string;
  description: string;
  severity: RiskSeverity;
}

export interface Competitor {
  name: string;
  ticker: string;
  threat: CompetitorThreat;
  detail: string;
}

export interface CompanyReport {
  ticker: string;
  name: string;
  sector: string;
  investmentVerdict: InvestmentVerdict;
  price: string;
  change: number;
  marketCap: string;
  verdict: Verdict;
  moatScore: number;           // 1–10
  oneLiner: string;

  businessModel: string;
  revenueStreams: RevenueStream[];

  revenue: string;
  revenueGrowth: number;
  netIncome: string;
  netMargin: number;
  operatingExpenses: string;
  cashOnHand: string;
  peRatio: string;
  employees: string;

  tam: string;
  marketShare: string;
  targetMarket: string;

  moatFactors: string[];
  weaknesses: string[];

  executives: Executive[];
  journey: Milestone[];
  roadmap: RoadmapItem[];
  risks: Risk[];
  competitors: Competitor[];
}

export const COMPANY_REPORTS: CompanyReport[] = [
  // ─── NVIDIA ────────────────────────────────────────────────────────────────
  {
    ticker: 'NVDA',
    name: 'Nvidia Corporation',
    sector: 'Semiconductors / AI',
    investmentVerdict: {
      answer: 'YES',
      summary: 'Nvidia owns the infrastructure of the AI revolution and its moat is nearly impossible to replicate.',
      reasons: [
        'Revenue grew 94% last year — no major company at this scale grows that fast',
        'CUDA software lock-in took 15 years to build. AMD, Intel, and Google cannot close this gap quickly',
        'Every major AI lab (OpenAI, Google, Meta, Microsoft) depends on Nvidia hardware to survive',
        'Blackwell chips are already sold out through the end of the year — demand exceeds supply',
      ],
      caution: 'The stock is not cheap at 38x earnings. If AI spending slows or a major customer builds its own chip, the stock can drop 30%+ fast. Size your position accordingly.',
    },
    price: '$1,087',
    change: 8.2,
    marketCap: '$2.67T',
    verdict: 'BUY',
    moatScore: 9,
    oneLiner: 'The picks-and-shovels play on the AI gold rush — every major AI model runs on Nvidia hardware.',

    businessModel: 'Nvidia designs and sells GPUs and AI accelerators. They don\'t manufacture chips — TSMC does. Their real business is software lock-in: the CUDA ecosystem took 15 years to build and competitors cannot replicate it quickly. They sell the hardware, but the stickiness is the software.',
    revenueStreams: [
      { name: 'Data Center (AI)', pct: 78, description: 'H100/B100 GPU sales to hyperscalers and enterprises for AI training' },
      { name: 'Gaming', pct: 12, description: 'GeForce consumer GPUs — mature but stable' },
      { name: 'Professional Visualization', pct: 5, description: 'Workstation GPUs for design/simulation' },
      { name: 'Automotive & Other', pct: 5, description: 'DRIVE platform for autonomous vehicles' },
    ],

    revenue: '$130B (FY2026 est.)',
    revenueGrowth: 94,
    netIncome: '$72B',
    netMargin: 55,
    operatingExpenses: '$18B',
    cashOnHand: '$26B',
    peRatio: '38x',
    employees: '36,000',

    tam: '$1T+ by 2030 (AI infrastructure)',
    marketShare: '80%+ in AI training GPUs',
    targetMarket: 'Hyperscalers (Microsoft, Google, Amazon, Meta), sovereign AI programs, enterprises building internal AI',

    moatFactors: [
      'CUDA ecosystem — 15+ years of developer lock-in, millions of trained engineers',
      'First-mover in AI accelerators by 10+ years',
      'Full-stack approach: hardware + software + networking (Mellanox)',
      'Blackwell architecture manufacturing lead — 2 generations ahead of AMD',
      'NVLink interconnect dominates multi-GPU training setups',
    ],
    weaknesses: [
      'Extreme customer concentration — top 4 customers are 40%+ of revenue',
      'China export restrictions cut off a $15B/yr market',
      'AMD MI300X is closing the performance gap faster than expected',
      'Valuation prices in near-perfection — any guidance miss causes 15%+ drops',
      'TSMC dependency — geopolitical risk in Taiwan is existential',
    ],

    executives: [
      {
        name: 'Jensen Huang',
        role: 'CEO & Co-Founder',
        prior: 'LSI Logic, AMD',
        wins: 'Bet the company on CUDA in 2006 when it had no clear ROI. Made Nvidia the infrastructure of the AI revolution.',
      },
      {
        name: 'Colette Kress',
        role: 'CFO',
        prior: 'Cisco, Microsoft',
        wins: 'Managed the balance sheet through the crypto boom/bust cycles while protecting R&D investment.',
      },
      {
        name: 'Jonah Alben',
        role: 'SVP of GPU Engineering',
        prior: 'Nvidia lifer — 20+ years',
        wins: 'Led the Hopper and Blackwell architecture teams. Two consecutive generational leaps.',
      },
    ],

    journey: [
      { year: 1993, event: 'Founded in a Denny\'s', impact: 'Jensen Huang, Chris Malachowsky, Curtis Priem bet on graphics co-processors', type: 'founding' },
      { year: 1999, event: 'Invented the GPU', impact: 'GeForce 256 coined "GPU" — redefined consumer graphics permanently', type: 'product' },
      { year: 2006, event: 'Launched CUDA', impact: 'Made GPUs programmable for general computing — the decision that created Nvidia\'s moat', type: 'product' },
      { year: 2012, event: 'AlexNet runs on Nvidia GPUs', impact: 'Deep learning researchers discover GPUs are 10x faster than CPUs for AI — Nvidia\'s destiny becomes clear', type: 'financial' },
      { year: 2016, event: 'First DGX-1 supercomputer', impact: 'Nvidia sells a $129,000 AI box to OpenAI — the product that starts the data center era', type: 'product' },
      { year: 2020, event: 'Attempted $40B Arm acquisition', impact: 'Would have been the largest semiconductor deal ever — blocked by regulators globally', type: 'acquisition' },
      { year: 2022, event: 'Crypto crash — stock falls 65%', impact: 'Gaming GPU demand collapses. Nvidia pivots aggressively to data center', type: 'pivot' },
      { year: 2023, event: 'ChatGPT triggers H100 shortage', impact: 'Revenue explodes 122% YoY. Nvidia becomes the most valuable company in the world briefly', type: 'financial' },
    ],

    roadmap: [
      { timeframe: 'Q3 2026', initiative: 'Blackwell Ultra mass production', detail: 'B300 series — 50% performance improvement over B200. Already sold out through Q4', confidence: 'confirmed' },
      { timeframe: '2026', initiative: 'Rubin architecture announcement', detail: 'Next-gen GPU platform. HBM4 memory, new NVLink 6. Maintains 2-year lead over AMD', confidence: 'confirmed' },
      { timeframe: '2027', initiative: 'Sovereign AI expansion', detail: 'Governments building national AI infrastructure. $50B+ TAM opening across Middle East, Europe, Asia', confidence: 'likely' },
      { timeframe: '2027–28', initiative: 'Physical AI / Robotics platform', detail: 'Isaac robotics platform + Omniverse for simulation. Jensen calls it the next $1T opportunity', confidence: 'likely' },
      { timeframe: 'Long-term', initiative: 'Desktop AI (Project DIGITS)', detail: 'Personal AI supercomputer — $3,000 device running 200B parameter models locally', confidence: 'speculative' },
    ],

    risks: [
      { category: 'Geopolitical', description: 'Taiwan-China tension threatens TSMC manufacturing. No backup fab at Nvidia\'s scale exists.', severity: 'high' },
      { category: 'Export Controls', description: 'US keeps tightening China restrictions. A$15B/yr market effectively closed — may expand to other regions.', severity: 'high' },
      { category: 'Competition', description: 'Google TPUs, Amazon Trainium, Microsoft Maia — hyperscalers building internal chips to reduce Nvidia dependency.', severity: 'medium' },
      { category: 'Valuation', description: '38x P/E prices in 90%+ revenue growth continuing for 3+ years. Any slowdown causes massive multiple compression.', severity: 'medium' },
      { category: 'Customer Concentration', description: 'Microsoft, Google, Amazon, Meta = 40%+ of revenue. One budget cut cycle hits Nvidia hard.', severity: 'medium' },
    ],

    competitors: [
      { name: 'AMD', ticker: 'AMD', threat: 'medium', detail: 'MI300X closing performance gap. Software still 5 years behind CUDA.' },
      { name: 'Intel', ticker: 'INTC', threat: 'low', detail: 'Gaudi 3 technically competitive but execution has been consistently poor.' },
      { name: 'Google', ticker: 'GOOGL', threat: 'medium', detail: 'TPU v5 is world-class but only available inside Google Cloud.' },
      { name: 'Cerebras', ticker: 'Private', threat: 'low', detail: 'Wafer-scale chip is fast but can\'t scale to multi-node training.' },
    ],
  },

  // ─── APPLE ─────────────────────────────────────────────────────────────────
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Consumer Tech / Services',
    investmentVerdict: {
      answer: 'WATCH',
      summary: 'Apple has the greatest consumer moat ever built, but right now it\'s not growing fast enough to justify buying more.',
      reasons: [
        'Revenue only grew 4% last year — for a $3.2T company, that\'s barely keeping up with inflation',
        'The DOJ antitrust case could strip 30% of App Store revenue, which is their highest-margin business',
        'Huawei is taking back China market share with government backing — a $40B/yr market at risk',
        'Apple Intelligence shipped late and incomplete — rivals have a temporary AI lead',
      ],
      caution: 'If you already own Apple, hold it — the moat is real and it will compound for decades. But right now is not the best entry point. Wait for a pullback to the $185–195 range or until AI features prove out.',
    },
    price: '$211.40',
    change: -1.2,
    marketCap: '$3.2T',
    verdict: 'HOLD',
    moatScore: 10,
    oneLiner: 'The greatest consumer moat ever built — 2.2 billion devices creating an ecosystem people pay to stay inside.',

    businessModel: 'Apple sells premium hardware at 40%+ margins, then monetizes the installed base through a services layer (App Store, iCloud, Apple Music, Apple TV+, Apple Pay). The hardware is the entry point; services are the margin engine. The real product is the ecosystem lock-in.',
    revenueStreams: [
      { name: 'iPhone', pct: 52, description: 'Flagship product. 240M units/yr. ASP increasing every cycle' },
      { name: 'Services', pct: 26, description: 'App Store, iCloud, Apple Music, TV+, Pay, Arcade. ~75% gross margin' },
      { name: 'Mac', pct: 8, description: 'M-series chips drove a supercycle 2020–23. Now normalizing' },
      { name: 'iPad', pct: 6, description: 'Mature category. M4 chip refresh driving education/enterprise' },
      { name: 'Wearables & Other', pct: 8, description: 'Apple Watch, AirPods, Vision Pro' },
    ],

    revenue: '$391B (FY2025)',
    revenueGrowth: 4,
    netIncome: '$101B',
    netMargin: 26,
    operatingExpenses: '$58B',
    cashOnHand: '$162B',
    peRatio: '32x',
    employees: '160,000',

    tam: '$6T+ (devices + services combined addressable market)',
    marketShare: '18% global smartphone units, 55%+ US market, 90%+ premium ($1000+) segment',
    targetMarket: 'Premium consumer globally. Enterprise via MDM. Developers via App Store.',

    moatFactors: [
      'Ecosystem lock-in — iMessage, AirDrop, Handoff, Continuity make switching painful',
      'Brand premium — only company that consistently grows ASP while growing volume',
      'App Store duopoly — 30% cut on $100B+ in transactions annually',
      'Silicon advantage — M-series chips are 2 generations ahead of x86 in performance/watt',
      'Privacy positioning — only major tech company using privacy as a competitive weapon',
      '2.2 billion active devices — largest consumer hardware installed base on earth',
    ],
    weaknesses: [
      'iPhone revenue flat/declining in China — Huawei recapturing market with government support',
      'DOJ antitrust suit threatens App Store 30% cut — $15-20B/yr at risk',
      'Vision Pro failed to find mass market — $3,499 price point created a product with no category',
      'Services growth is decelerating — harder comparables, regulatory pressure globally',
      'Tim Cook succession risk — no clear internal successor identified publicly',
    ],

    executives: [
      {
        name: 'Tim Cook',
        role: 'CEO',
        prior: 'Compaq, IBM, Intelligent Electronics',
        wins: 'Turned Apple\'s supply chain into a competitive weapon. Tripled market cap from $500B to $3T.',
      },
      {
        name: 'Luca Maestri',
        role: 'CFO (outgoing → Kevan Parekh)',
        prior: 'Xerox, Nokia',
        wins: 'Managed the most aggressive buyback program in corporate history — $700B+ returned to shareholders.',
      },
      {
        name: 'Craig Federighi',
        role: 'SVP Software Engineering',
        prior: 'NeXT, Ariba',
        wins: 'Built iOS and macOS into unified platform. Led Apple Silicon transition with zero user disruption.',
      },
    ],

    journey: [
      { year: 1976, event: 'Founded in a garage', impact: 'Steve Jobs, Steve Wozniak, Ronald Wayne start Apple Computer', type: 'founding' },
      { year: 1984, event: 'Macintosh launch', impact: 'First mass-market GUI computer. Defined personal computing for 20 years', type: 'product' },
      { year: 1997, event: 'Jobs returns, saves Apple', impact: 'Apple was 90 days from bankruptcy. Jobs cuts 70% of products and refocuses', type: 'pivot' },
      { year: 2001, event: 'iPod + iTunes launch', impact: 'Proved Apple could reinvent non-computer categories. Blueprint for every product since', type: 'product' },
      { year: 2007, event: 'iPhone announced', impact: '"An iPod, a phone, and an internet communicator." Largest single product launch in history', type: 'product' },
      { year: 2011, event: 'Steve Jobs dies', impact: 'Tim Cook becomes CEO. Analysts predict decline. Stock rises 900% over next decade', type: 'pivot' },
      { year: 2020, event: 'Apple Silicon (M1)', impact: 'Dumps Intel after 15 years. Best performance-per-watt in laptop history. Margin expansion follows', type: 'product' },
      { year: 2024, event: 'Vision Pro ships', impact: 'Spatial computing era begins. $3,499 price. 500K units year one. Searching for killer app', type: 'product' },
    ],

    roadmap: [
      { timeframe: 'Q4 2026', initiative: 'Apple Intelligence full rollout', detail: 'On-device AI across all Apple products. Siri rebuilt from scratch with LLM backbone', confidence: 'confirmed' },
      { timeframe: '2026–27', initiative: 'iPhone 18 — foldable prototype', detail: 'First foldable form factor. Internal codename "Project Mirror". Mass production TBD', confidence: 'likely' },
      { timeframe: '2027', initiative: 'Vision Pro 2 — sub-$2,000', detail: 'Lower cost headset targeting prosumer market. M5 chip. Lighter form factor', confidence: 'likely' },
      { timeframe: '2027–28', initiative: 'Apple Car pivots to autonomy platform', detail: 'After canceling full EV, licensing autonomy software to OEMs (BMW, Hyundai rumored)', confidence: 'speculative' },
      { timeframe: 'Long-term', initiative: 'Health platform expansion', detail: 'Apple Watch becomes FDA-cleared medical device. Blood glucose monitoring. $100B+ health market', confidence: 'speculative' },
    ],

    risks: [
      { category: 'Regulatory', description: 'EU DMA forces App Store opening. DOJ antitrust in US. Combined could cost $20B+/yr in App Store revenue.', severity: 'high' },
      { category: 'China', description: 'Huawei regained 20% China market share. Government pressure on iPhones in state enterprises.', severity: 'high' },
      { category: 'AI Lag', description: 'Apple Intelligence shipped late, missing features. Samsung and Google have more mature on-device AI.', severity: 'medium' },
      { category: 'Innovation Plateau', description: 'Last 4 iPhone cycles have been incremental. Upgrade cycles lengthening from 2.8 to 4.2 years.', severity: 'medium' },
    ],

    competitors: [
      { name: 'Samsung', ticker: 'SSNLF', threat: 'medium', detail: 'First foldable, first to market on AI features. Losing premium battle but winning volume.' },
      { name: 'Google', ticker: 'GOOGL', threat: 'medium', detail: 'Pixel 9 best Android. But Android fragmentation limits ecosystem threat.' },
      { name: 'Microsoft', ticker: 'MSFT', threat: 'low', detail: 'Competing in enterprise via Copilot. Not a consumer hardware threat.' },
      { name: 'Meta', ticker: 'META', threat: 'medium', detail: 'Quest 3 is $499 vs Vision Pro $3,499. If spatial computing takes off, Meta wins volume.' },
    ],
  },

  // ─── TESLA ─────────────────────────────────────────────────────────────────
  {
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'EV / Energy / AI',
    investmentVerdict: {
      answer: 'NO',
      summary: 'Too many real problems right now — brand damage, CEO distraction, and margin collapse make this too risky at the current price.',
      reasons: [
        'Gross margins fell from 29% to 17% in two years — the price war with BYD is structurally damaging',
        'Elon Musk is running 5 companies simultaneously. Tesla is not getting his full attention and the numbers show it',
        'Sales are declining in Europe and California due to political brand association — this is documented, not speculation',
        'BYD is selling comparable EVs for $15,000. Tesla\'s cost structure cannot compete at that price point',
      ],
      caution: 'The long-term story (Robotaxi, Optimus, FSD) could still play out and make Tesla a $5T company. But you\'re buying that future at today\'s price without today\'s business justifying it. Wait for Robotaxi to launch and prove it works before investing.',
    },
    price: '$172.80',
    change: -11.4,
    marketCap: '$552B',
    verdict: 'HOLD',
    moatScore: 6,
    oneLiner: 'The most debated stock on earth — either the AI/energy company of the future or an overvalued car company with a distracted CEO.',

    businessModel: 'Tesla sells EVs, energy storage (Powerwall/Megapack), and solar. The margin story has shifted to software: FSD (Full Self-Driving) subscriptions, Supercharger network licensing, and the coming Robotaxi/Optimus robot revenue. Bears say it\'s a car company. Bulls say it\'s an AI company that happens to sell cars.',
    revenueStreams: [
      { name: 'Automotive Sales', pct: 78, description: 'Model 3, Y, S, X, Cybertruck. Margins under pressure from price cuts' },
      { name: 'Energy Generation & Storage', pct: 12, description: 'Megapack (grid storage) growing 80%+ YoY. Powerwall for homes' },
      { name: 'Services & Other', pct: 7, description: 'Supercharging, maintenance, merchandise' },
      { name: 'FSD / Software', pct: 3, description: '$8K one-time or $99/mo subscription. High margin but adoption slow' },
    ],

    revenue: '$97B (FY2025 est.)',
    revenueGrowth: -1,
    netIncome: '$7.1B',
    netMargin: 7.3,
    operatingExpenses: '$14B',
    cashOnHand: '$29B',
    peRatio: '78x',
    employees: '127,000',

    tam: '$8T (global auto) + $3T (energy storage) + $5T (autonomy)',
    marketShare: '3% global auto, 55% US EV market (declining)',
    targetMarket: 'Premium EV buyers globally. Grid operators for Megapack. Eventually mass market via cheaper models.',

    moatFactors: [
      'Supercharger network — 60,000+ chargers, now open to other brands (revenue + standard-setting)',
      'Vertical integration — own battery, software, manufacturing, distribution, service',
      'Over-the-air software updates — only automaker that improves cars after purchase',
      'FSD data advantage — 6B+ miles of real-world driving data for AI training',
      'Gigafactory manufacturing scale — lowest cost EV production at scale',
    ],
    weaknesses: [
      'Elon Musk running 5 companies simultaneously — CEO attention split is real and documented',
      'Brand damage in key markets — political association costing sales in Europe and California',
      'Chinese competition — BYD outselling Tesla in China with cheaper, feature-rich EVs',
      'FSD promised for 10 years, still Level 2 — trust gap with consumers and regulators',
      'Gross margins fell from 29% to 17% — price war has structural damage',
    ],

    executives: [
      {
        name: 'Elon Musk',
        role: 'CEO & Product Architect',
        prior: 'Zip2, PayPal, SpaceX, X, xAI',
        wins: 'Built the first successful US car startup in 100 years. Made EVs aspirational globally.',
      },
      {
        name: 'Vaibhav Taneja',
        role: 'CFO',
        prior: 'SolarCity, PwC',
        wins: 'Navigated Tesla\'s balance sheet through the 2019 near-bankruptcy scare to profitability.',
      },
      {
        name: 'Lars Moravy',
        role: 'VP Vehicle Engineering',
        prior: 'Ford, Tesla lifer',
        wins: 'Led Cybertruck and Model Y manufacturing. Reduced Model Y production cost by 30%.',
      },
    ],

    journey: [
      { year: 2003, event: 'Founded by Martin Eberhard & Marc Tarpenning', impact: 'Elon Musk joins as chairman and lead investor in 2004, becomes CEO in 2008', type: 'founding' },
      { year: 2008, event: 'Roadster ships, company nearly bankrupt', impact: 'Musk puts his last $35M in. PayPal buyout money goes into Tesla and SpaceX simultaneously', type: 'pivot' },
      { year: 2012, event: 'Model S — "Car of the Year"', impact: 'First mass-market premium EV. Proved EVs could be desirable, not just practical', type: 'product' },
      { year: 2017, event: 'Model 3 demand exceeds all expectations', impact: '400,000 reservations in 1 week. Production hell follows — Musk sleeps at the factory', type: 'product' },
      { year: 2019, event: 'Near bankruptcy (again)', impact: 'Stock at $35 split-adjusted. Short interest at all-time high. Profitable quarter saves the company', type: 'financial' },
      { year: 2020, event: 'S&P 500 inclusion, stock 10x', impact: 'Most valuable automaker in history. Market prices in full autonomous future', type: 'financial' },
      { year: 2023, event: 'Price war begins', impact: 'Tesla cuts prices 25%. Margins collapse. Starts battle it will be fighting for years', type: 'pivot' },
      { year: 2024, event: 'Cybertruck ships, Musk political pivot', impact: 'Brand association with politics costs measurable sales in EU and blue states', type: 'scandal' },
    ],

    roadmap: [
      { timeframe: 'Q3 2026', initiative: 'Robotaxi / Cybercab launch', detail: 'Dedicated robotaxi vehicle. No steering wheel. Austin TX pilot. $0.20/mile target cost', confidence: 'confirmed' },
      { timeframe: '2026', initiative: '$25,000 Model 2 / affordable EV', detail: 'Mass market EV targeting 50M/yr volume. Unboxed manufacturing process', confidence: 'confirmed' },
      { timeframe: '2026–27', initiative: 'Optimus robot commercial sales', detail: 'Humanoid robot. Initial Tesla factory deployment. External sales to manufacturers after', confidence: 'likely' },
      { timeframe: '2027', initiative: 'Megapack energy dominance', detail: 'Energy storage becoming #2 revenue segment. 500GWh/yr production target', confidence: 'likely' },
      { timeframe: 'Long-term', initiative: 'Full autonomy / FSD v13+', detail: 'Unsupervised FSD in all 50 states. Unlocks $50B+ recurring software revenue if achieved', confidence: 'speculative' },
    ],

    risks: [
      { category: 'CEO Risk', description: 'Musk running SpaceX, X, xAI, Neuralink, Boring simultaneously. Tesla gets fraction of his time.', severity: 'high' },
      { category: 'Brand Damage', description: 'Political affiliation cost 20%+ sales decline in Germany, Netherlands, parts of US in 2024.', severity: 'high' },
      { category: 'FSD Regulatory', description: 'Robotaxi requires NHTSA approval. One high-profile accident could set back timeline 3-5 years.', severity: 'high' },
      { category: 'BYD Competition', description: 'BYD selling EVs at $15,000. Tesla\'s cost structure cannot go that low without destroying margins.', severity: 'medium' },
    ],

    competitors: [
      { name: 'BYD', ticker: 'BYDDY', threat: 'high', detail: 'Outselling Tesla globally. Vertical integration, lower costs, government backing.' },
      { name: 'Waymo (Google)', ticker: 'GOOGL', threat: 'high', detail: 'Best autonomous driving technology. Already operating commercial robotaxi in 4 cities.' },
      { name: 'Rivian', ticker: 'RIVN', threat: 'low', detail: 'Niche truck/SUV EV. Amazon partnership helps but cash burn is concerning.' },
      { name: 'GM / Ford EVs', ticker: 'GM/F', threat: 'medium', detail: 'Both cutting EV investments after losing billions. Not near-term threat.' },
    ],
  },

  // ─── META ──────────────────────────────────────────────────────────────────
  {
    ticker: 'META',
    name: 'Meta Platforms, Inc.',
    sector: 'Social Media / AI / AR',
    investmentVerdict: {
      answer: 'YES',
      summary: 'Meta is the best risk/reward in big tech right now — growing 34% with a 24x P/E while owning 3.3 billion daily users.',
      reasons: [
        'Revenue grew 34% last year but the stock only trades at 24x earnings — you\'re getting growth at a reasonable price',
        '3.3 billion people use Meta apps every single day. No competitor can replicate this social graph',
        'The "Year of Efficiency" proved Zuckerberg can cut costs fast. The business is now a cash machine',
        'Llama open-source AI strategy is building a developer ecosystem that makes Meta\'s AI impossible to ignore',
      ],
      caution: 'The $50B+ metaverse bet is still burning cash with no clear payoff. And if TikTok returns at full strength, engagement for under-30s could decline. Neither kills the business but both limit upside.',
    },
    price: '$598.70',
    change: 5.7,
    marketCap: '$1.52T',
    verdict: 'STRONG BUY',
    moatScore: 8,
    oneLiner: 'The greatest comeback in tech history — written off in 2022, now one of the most efficient AI companies on earth.',

    businessModel: 'Meta makes 99% of revenue from advertising across Facebook, Instagram, and WhatsApp. AI has made their ad targeting dramatically more effective, driving revenue growth without proportional user growth. The metaverse bet is secondary — the core business is a cash machine funding moonshots.',
    revenueStreams: [
      { name: 'Advertising (Facebook)', pct: 46, description: 'Feed, Stories, Reels. 3B daily active users. AI-driven targeting' },
      { name: 'Advertising (Instagram)', pct: 38, description: 'Reels driving engagement. 18-34 demographic. Shopping integration' },
      { name: 'Advertising (WhatsApp/Messenger)', pct: 10, description: 'Business messaging monetization accelerating in emerging markets' },
      { name: 'Reality Labs (Quest/VR)', pct: 2, description: 'Hardware sales. Still losing $15B+/yr but owns AR/VR market' },
      { name: 'Other', pct: 4, description: 'Meta AI subscriptions, business tools' },
    ],

    revenue: '$164B (FY2025 est.)',
    revenueGrowth: 34,
    netIncome: '$62B',
    netMargin: 38,
    operatingExpenses: '$38B',
    cashOnHand: '$58B',
    peRatio: '24x',
    employees: '72,000',

    tam: '$700B (global digital advertising) + $1.5T (AR/VR long-term)',
    marketShare: '22% of global digital ad spend (duopoly with Google)',
    targetMarket: 'Every business that needs to reach consumers digitally. 10M+ active advertisers.',

    moatFactors: [
      '3.3 billion daily active people across apps — no competitor can replicate this social graph',
      'WhatsApp — 2.5B users, zero real competitor in 100+ countries',
      'Llama open-source AI strategy — best developer relations in AI, building ecosystem around Meta',
      'Ad targeting infrastructure — 20 years of behavioral data, rebuilt with AI post-ATT',
      'Network effects — the more people on Facebook/Instagram, the more valuable for each user',
    ],
    weaknesses: [
      '$50B+ spent on metaverse with minimal commercial traction — distraction and capital destroyer',
      'Teens leaving Facebook for TikTok — demographic aging is structural, not cyclical',
      'Regulatory risk in EU — GDPR fines, DSA compliance costs, potential data transfer restrictions',
      'TikTok competition for attention and ad dollars — especially Reels vs TikTok',
      'Zuckerberg\'s political positioning shift creating brand confusion for advertisers',
    ],

    executives: [
      {
        name: 'Mark Zuckerberg',
        role: 'CEO & Chairman',
        prior: 'Harvard (dropped out)',
        wins: 'Built largest social network from dorm room. Survived the 2022 crash to rebuild Meta as an AI leader.',
      },
      {
        name: 'Susan Li',
        role: 'CFO',
        prior: 'Morgan Stanley, Meta lifer',
        wins: 'Managed the "Year of Efficiency" cost cuts — headcount -20%, stock +300% in 18 months.',
      },
      {
        name: 'Yann LeCun',
        role: 'Chief AI Scientist',
        prior: 'AT&T Bell Labs, NYU',
        wins: 'Godfather of deep learning. His presence gives Meta unmatched AI research credibility.',
      },
    ],

    journey: [
      { year: 2004, event: 'Thefacebook.com launches at Harvard', impact: 'Zuckerberg\'s dorm project spreads to 30 universities in 30 days', type: 'founding' },
      { year: 2006, event: 'Opens to everyone, launches News Feed', impact: 'News Feed causes immediate backlash then becomes defining feature. Blueprint for all social feeds', type: 'product' },
      { year: 2012, event: 'Instagram acquired for $1B', impact: 'Most mocked acquisition in history. Now worth $500B+', type: 'acquisition' },
      { year: 2014, event: 'WhatsApp acquired for $19B', impact: 'Largest social/mobile acquisition. Now 2.5B users, dominant in 100+ countries', type: 'acquisition' },
      { year: 2018, event: 'Cambridge Analytica scandal', impact: 'Congressional testimony. Stock falls 40%. Privacy concerns define Meta for years', type: 'scandal' },
      { year: 2021, event: 'Rebrand to Meta, metaverse pivot', impact: 'Stock falls 70% over next year. $40B/yr invested in Reality Labs with minimal returns', type: 'pivot' },
      { year: 2023, event: '"Year of Efficiency" — 21,000 layoffs', impact: 'Zuckerberg cuts costs, stock triples. One of the most dramatic corporate turnarounds in tech', type: 'pivot' },
      { year: 2024, event: 'Llama 3 open-sourced, Threads grows to 200M', impact: 'Meta becomes the open-source AI leader. Developer ecosystem rallying around Llama', type: 'product' },
    ],

    roadmap: [
      { timeframe: 'Q3 2026', initiative: 'Llama 4 — frontier model release', detail: 'Competing directly with GPT-5 and Gemini Ultra. Open-source and API-accessible', confidence: 'confirmed' },
      { timeframe: '2026', initiative: 'Orion AR glasses consumer launch', detail: 'True AR glasses replacing smartphone for notifications/navigation. $700–900 price target', confidence: 'likely' },
      { timeframe: '2026–27', initiative: 'WhatsApp monetization acceleration', detail: 'Business messaging, payments, commerce. $20B+ revenue opportunity in India/Brazil alone', confidence: 'confirmed' },
      { timeframe: '2027', initiative: 'Meta AI 1B user milestone', detail: 'Meta AI assistant across all apps. Competing with ChatGPT for daily AI assistant usage', confidence: 'likely' },
      { timeframe: 'Long-term', initiative: 'Neural interface (acquisition of CTRL-labs)', detail: 'Wrist-based neural input device. Acquired CTRL-labs in 2019. Ultimate AR/VR control mechanism', confidence: 'speculative' },
    ],

    risks: [
      { category: 'TikTok', description: 'If TikTok ban is reversed or it continues operating, Meta loses its key under-30 engagement advantage.', severity: 'medium' },
      { category: 'Regulatory', description: 'EU data transfer restrictions could limit ad targeting in $40B/yr European market.', severity: 'high' },
      { category: 'Metaverse', description: 'Reality Labs losing $15B+/yr with no clear path to profitability. Capital destroying exercise.', severity: 'medium' },
      { category: 'Advertiser Boycott Risk', description: 'Brand safety concerns periodically cause advertiser pullbacks. Concentrated revenue in ads.', severity: 'low' },
    ],

    competitors: [
      { name: 'TikTok / ByteDance', ticker: 'Private', threat: 'high', detail: 'Winning Gen Z globally. Algorithm superiority for short-form video.' },
      { name: 'Google / YouTube', ticker: 'GOOGL', threat: 'medium', detail: 'Duopoly partner in ads. YouTube Shorts competes directly with Reels.' },
      { name: 'Snapchat', ticker: 'SNAP', threat: 'low', detail: 'Niche 13-24 demographic. Not threatening Meta\'s core business.' },
      { name: 'Apple', ticker: 'AAPL', threat: 'medium', detail: 'ATT privacy change cost Meta $10B/yr in 2022. Further iOS restrictions possible.' },
    ],
  },
];

export function getReport(ticker: string): CompanyReport | null {
  return COMPANY_REPORTS.find(r => r.ticker.toUpperCase() === ticker.toUpperCase()) ?? null;
}

// Generates a plausible preview report for any ticker not in our database
export function generatePreviewReport(ticker: string): CompanyReport {
  const t = ticker.toUpperCase();
  // Seed simple pseudo-random values from ticker chars so same ticker = same data
  const seed = t.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const rand = (min: number, max: number) => min + (seed % (max - min));

  const moat    = rand(3, 9);
  const growth  = rand(-5, 45);
  const margin  = rand(5, 35);
  const change  = parseFloat(((seed % 20) - 10).toFixed(1));
  const verdict: Verdict         = moat >= 7 ? 'BUY' : moat >= 5 ? 'HOLD' : 'SELL';
  const answer: InvestAnswer     = moat >= 7 ? 'WATCH' : moat >= 5 ? 'WATCH' : 'WATCH';

  return {
    ticker: t,
    name: `${t} Corporation`,
    sector: 'Full analysis coming soon',
    isPreview: true,
    investmentVerdict: {
      answer,
      summary: `This is a preview report for ${t}. Connect VAULT to live market data for a full AI-powered deep dive on this company.`,
      reasons: [
        `We don't have ${t} in our deep research database yet`,
        'Full AI analysis requires live financial data integration — coming soon',
        'In the meantime, use the Signal tab to see if this stock shows up in Hot Movers or Volume Spikes',
        'Our research team is adding new companies weekly — check back soon',
      ],
      caution: 'This is a placeholder report. Do not make investment decisions based on preview data. Use full reports (NVDA, AAPL, TSLA, META) for actual research.',
    },
    price: `$${rand(10, 800)}`,
    change,
    marketCap: `$${rand(1, 500)}B`,
    verdict,
    moatScore: moat,
    oneLiner: `${t} is not yet in our deep research database. Full AI analysis is coming soon.`,

    businessModel: `Full business model analysis for ${t} is coming soon. VAULT is building out AI-powered deep research for thousands of companies. In the meantime, you can explore our full reports for NVDA, AAPL, TSLA, and META to see the depth of analysis we provide.`,
    revenueStreams: [
      { name: 'Core Business', pct: 70, description: 'Primary revenue source — details coming with live data integration' },
      { name: 'Secondary Lines', pct: 20, description: 'Additional revenue streams — full breakdown coming soon' },
      { name: 'Other', pct: 10, description: 'Miscellaneous revenue — to be analyzed' },
    ],

    revenue: 'Live data coming soon',
    revenueGrowth: growth,
    netIncome: 'Live data coming soon',
    netMargin: margin,
    operatingExpenses: 'Live data coming soon',
    cashOnHand: 'Live data coming soon',
    peRatio: 'Live data coming soon',
    employees: 'Live data coming soon',

    tam: 'Full market analysis coming soon',
    marketShare: 'Coming soon',
    targetMarket: `Full market analysis for ${t} coming soon with live data integration.`,

    moatFactors: [
      'Full moat analysis coming soon',
      'Connect live data to unlock competitive analysis',
      'Check back as we expand our research database',
    ],
    weaknesses: [
      'Full risk analysis coming soon',
      'Live financial data integration will unlock complete weakness analysis',
    ],

    executives: [
      {
        name: 'Leadership Team',
        role: 'Full leadership analysis coming soon',
        prior: 'Connect live data to unlock',
        wins: `Full executive background research for ${t} coming soon`,
      },
    ],

    journey: [
      { year: 2000, event: 'Company history coming soon', impact: 'Full timeline unlocks with live data integration', type: 'founding' },
    ],

    roadmap: [
      { timeframe: 'Coming soon', initiative: 'Full roadmap analysis', detail: `Connect VAULT to live data to unlock ${t}'s full journey and roadmap`, confidence: 'speculative' },
    ],

    risks: [
      { category: 'Data Pending', description: `Full risk analysis for ${t} coming soon. Live data integration will unlock complete research.`, severity: 'medium' },
    ],

    competitors: [
      { name: 'Competitor analysis', ticker: '—', threat: 'medium', detail: `Full competitive landscape for ${t} coming with live data integration` },
    ],
  } as CompanyReport & { isPreview: boolean };
}

export function getOrGenerateReport(ticker: string): CompanyReport & { isPreview?: boolean } {
  return getReport(ticker) ?? generatePreviewReport(ticker);
}

export const ANSWER_COLORS: Record<InvestAnswer, string> = {
  'YES':   '#7EB8A4',
  'NO':    '#C97A6E',
  'WATCH': '#C9A96E',
};

export const ANSWER_BG: Record<InvestAnswer, string> = {
  'YES':   'rgba(126,184,164,0.12)',
  'NO':    'rgba(201,122,110,0.12)',
  'WATCH': 'rgba(201,169,110,0.12)',
};

export const VERDICT_COLORS: Record<Verdict, string> = {
  'STRONG BUY': '#7EB8A4',
  'BUY':        '#7EB8A4',
  'HOLD':       '#C9A96E',
  'SELL':       '#C97A6E',
  'STRONG SELL':'#C97A6E',
};

export const CONFIDENCE_COLORS: Record<RoadmapConfidence, string> = {
  confirmed:   '#7EB8A4',
  likely:      '#C9A96E',
  speculative: '#9A7EB8',
};

export const SEVERITY_COLORS: Record<RiskSeverity, string> = {
  high:   '#C97A6E',
  medium: '#C9A96E',
  low:    '#7EB8A4',
};

export const THREAT_COLORS: Record<CompetitorThreat, string> = {
  high:   '#C97A6E',
  medium: '#C9A96E',
  low:    '#7EB8A4',
};

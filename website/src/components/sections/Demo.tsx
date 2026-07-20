'use client';

import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import PhoneMock, { AppTabBar } from '@/components/PhoneMock';
import { TIERS } from '@/lib/brand';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

// Illustrative examples — each mirrors a real VAULT detector (idle cash,
// subscription creep, credit utilization). Never show a detector that
// doesn't exist in src/services/feed.ts.
const DEMO_MOVES = [
  {
    tag: 'SAVINGS',
    text: 'Move $4,200 of idle checking into 4.6% APY.',
    impact: '+$193/yr',
    effort: '< 1 min',
    action: 'Move it',
    pts: 9,
  },
  {
    tag: 'SPENDING',
    text: '$132/mo of subscriptions detected. Keep only the ones you use.',
    impact: '+$475/yr',
    effort: '5 min',
    action: 'Review them',
    pts: 6,
  },
  {
    tag: 'DEBT',
    text: 'Credit utilization at 42% — pay $610 to get back under 30%.',
    impact: 'Score-safe zone',
    effort: '2 min',
    action: 'Pay it down',
    pts: 4,
  },
];

const START_SCORE = 689;

const cardVariants = {
  enter: { opacity: 0, y: 40, scale: 0.94 },
  center: { opacity: 1, y: 0, scale: 1 },
  exit: (dir: number) => ({
    x: dir * 480,
    rotate: dir * 14,
    opacity: 0,
    transition: { duration: 0.45, ease: [0.32, 0, 0.67, 0] as const },
  }),
};

function tierFor(score: number) {
  return TIERS.find((t) => score >= t.minScore && score <= t.maxScore) ?? TIERS[TIERS.length - 1];
}

function ScoreTicker({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());
  const prev = useRef(value);
  if (prev.current !== value) {
    animate(mv, value, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
    prev.current = value;
  }
  return <motion.span>{rounded}</motion.span>;
}

function DemoScreen() {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(START_SCORE);
  const [exitDir, setExitDir] = useState(1);
  const [gain, setGain] = useState<{ id: number; pts: number } | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockSeen, setUnlockSeen] = useState(false);
  const dragX = useMotionValue(0);
  const dragRotate = useTransform(dragX, [-160, 160], [-9, 9]);

  const tier = tierFor(score);
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];
  const pct = Math.min(
    100,
    Math.round(((score - tier.minScore) / (tier.maxScore + 1 - tier.minScore)) * 100),
  );
  const move = DEMO_MOVES[index];
  const done = index >= DEMO_MOVES.length;

  const advance = (completed: boolean, dir: number) => {
    if (done) return;
    setExitDir(dir);
    dragX.set(0);
    if (completed) {
      const newScore = score + move.pts;
      setGain({ id: Date.now(), pts: move.pts });
      setScore(newScore);
      if (newScore >= 700 && !unlockSeen) {
        setUnlocked(true);
        setUnlockSeen(true);
        setTimeout(() => setUnlocked(false), 1800);
      }
    }
    setIndex((i) => i + 1);
  };

  const onDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const power = info.offset.x + info.velocity.x * 0.2;
    if (power > 120) advance(true, 1);
    else if (power < -120) advance(false, -1);
  };

  const platinum = useMemo(() => TIERS.find((t) => t.name === 'Platinum'), []);

  return (
    <div className="relative flex h-full flex-col bg-cream px-4 pt-14 pb-5 text-ink select-none">
      {/* Score header */}
      <div className="text-center">
        <p className="text-[8px] font-bold tracking-[0.28em] text-ink-dim">WEALTH VELOCITY</p>
        <div className="relative inline-block">
          <p className="font-display text-[44px] leading-none font-medium tracking-tight">
            <ScoreTicker value={score} />
          </p>
          <AnimatePresence>
            {gain && (
              <motion.span
                key={gain.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: -14 }}
                exit={{ opacity: 0, y: -26 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                onAnimationComplete={() => setGain(null)}
                className="absolute -right-9 top-0 text-[12px] font-bold text-rise"
              >
                +{gain.pts}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="mx-auto mt-2 flex w-full max-w-[200px] items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[8px] font-bold tracking-[0.18em]"
            style={{
              color: tier.name === 'Black' ? '#E8C98A' : tier.color,
              background: tier.glow,
            }}
          >
            {tier.name.toUpperCase()}
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-cream-deep">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          {nextTier && (
            <span className="text-[8px] text-ink-dim">{nextTier.minScore - score > 0 ? `${nextTier.minScore - score}` : '✓'}</span>
          )}
        </div>
      </div>

      {/* Card stage */}
      <div className="relative mt-5 flex-1">
        <AnimatePresence custom={exitDir} mode="popLayout">
          {!done ? (
            <motion.div
              key={index}
              custom={exitDir}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.9}
              onDragEnd={onDragEnd}
              style={{ x: dragX, rotate: dragRotate }}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="absolute inset-x-0 cursor-grab rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_16px_40px_rgba(154,128,96,0.2)] active:cursor-grabbing"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/15 px-2 py-[3px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-dark" aria-hidden="true" />
                  <span className="text-[8px] font-bold tracking-[0.18em] text-gold-dark">
                    {move.tag}
                  </span>
                </span>
                <span className="text-[9px] tracking-[0.15em] text-ink-muted">
                  {move.effort} · {index + 1} / {DEMO_MOVES.length}
                </span>
              </div>

              <p className="mt-2.5 text-[14px] leading-snug font-semibold">{move.text}</p>

              <p className="mt-3 text-[8px] font-bold tracking-[0.22em] text-ink-dim">
                POTENTIAL VALUE
              </p>
              <div className="flex items-baseline justify-between">
                <p className="font-display text-[24px] leading-tight font-medium text-gold-dark">
                  {move.impact}
                </p>
                <p className="text-[11px] font-bold text-rise">+{move.pts} pts</p>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => advance(false, -1)}
                  className="rounded-full border border-black/10 px-4 py-2 text-[10px] font-semibold text-ink-dim transition-colors hover:text-ink"
                >
                  Skip
                </button>
                <button
                  onClick={() => advance(true, 1)}
                  className="flex-1 rounded-full bg-gradient-to-r from-[#D4AA70] via-gold to-gold-deep px-4 py-2 text-[10px] font-bold text-night transition-transform active:scale-95"
                >
                  {move.action}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="end"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 rounded-2xl border border-gold/30 bg-white p-5 text-center shadow-[0_16px_40px_rgba(154,128,96,0.2)]"
            >
              <p className="font-display text-[22px] leading-tight font-medium">
                That&rsquo;s the feeling.
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-sub">
                Every morning. Real accounts, real moves, real momentum.
              </p>
              <a
                href="#download"
                className="mt-4 inline-block rounded-full bg-gradient-to-r from-[#D4AA70] via-gold to-gold-deep px-5 py-2.5 text-[12px] font-bold text-night"
              >
                Get VAULT
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AppTabBar active="Feed" />

      {/* Platinum unlock celebration */}
      <AnimatePresence>
        {unlocked && platinum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-night/90"
          >
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className="h-16 w-16 rounded-full"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${platinum.color}FF, ${platinum.color}55)`,
                boxShadow: `0 0 60px ${platinum.glow}, 0 0 100px rgba(201,169,110,0.4)`,
              }}
            />
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-5 font-display text-[26px] font-medium text-parchment"
            >
              Platinum
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[10px] font-bold tracking-[0.3em] text-gold"
            >
              TIER UNLOCKED
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Demo() {
  return (
    <section id="demo" className="relative overflow-hidden bg-night py-32 md:py-44">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[50vh]"
        style={{
          background:
            'radial-gradient(55% 50% at 50% 0%, rgba(201,169,110,0.08), transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-bold tracking-[0.4em] text-gold uppercase"
          >
            The Experience
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl font-display text-5xl leading-[1.05] font-light tracking-tight text-parchment md:text-6xl"
          >
            Don&rsquo;t take our word.
            <em className="mt-1 block text-gold-light italic">Feel it.</em>
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-md text-[16px] text-parchment-dim">
            An interactive taste of the Wealth Feed, with illustrative example moves. Drag a
            card right to act — or tap the gold button. Watch what happens at 700.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 flex justify-center"
        >
          <PhoneMock className="w-[270px] sm:w-[330px]">
            <DemoScreen />
          </PhoneMock>
        </motion.div>
      </div>
    </section>
  );
}

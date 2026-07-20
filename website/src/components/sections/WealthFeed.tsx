'use client';

import { motion, type MotionValue, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import PhoneMock, { AppTabBar } from '@/components/PhoneMock';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

// Mirrors the app's FeedMoveCard: tag pill + dot, effort, counter,
// title, POTENTIAL VALUE, Ask Concierge, Skip / action buttons.
// Illustrative examples — each mirrors a real VAULT detector (idle cash,
// subscription creep, credit utilization). Never show a detector that
// doesn't exist in src/services/feed.ts.
const MOVES = [
  {
    tag: 'SPENDING',
    title: '$132/mo of subscriptions detected. Keep only the ones you use.',
    impact: '+$475/yr',
    effort: '5 min',
    action: 'Review them',
  },
  {
    tag: 'SAVINGS',
    title: 'Move $4,200 of idle checking into 4.6% APY.',
    impact: '+$193/yr',
    effort: '< 1 min',
    action: 'Move it',
  },
  {
    tag: 'DEBT',
    title: 'Credit utilization at 42% — pay $610 to get back under 30%.',
    impact: 'Score-safe zone',
    effort: '2 min',
    action: 'Pay it down',
  },
];

const BEATS = [
  {
    title: 'Every morning, VAULT deals you a hand.',
    body: 'A fresh hand of moves each day, drawn from your connected accounts. Not tips. Not articles. Moves.',
  },
  {
    title: 'Each one specific. Each one doable.',
    body: 'Dollar amounts, timeframes, scripts — everything needed to execute in minutes, not weekends.',
  },
  {
    title: 'Swipe. Execute. Bank the points.',
    body: 'Every completed move feeds your Wealth Velocity Score. Momentum you can watch compound.',
  },
];

export function MoveCard({
  move,
  index,
  total,
  className = '',
}: {
  move: (typeof MOVES)[number];
  index: number;
  total: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_32px_rgba(154,128,96,0.14)] ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/15 px-2 py-[3px]">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-dark" aria-hidden="true" />
          <span className="text-[8px] font-bold tracking-[0.18em] text-gold-dark">{move.tag}</span>
        </span>
        <span className="text-[9px] tracking-[0.15em] text-ink-muted">
          {move.effort} · {index + 1} / {total}
        </span>
      </div>

      <p className="mt-2.5 text-[14px] leading-snug font-semibold text-ink">{move.title}</p>

      <p className="mt-3 text-[8px] font-bold tracking-[0.22em] text-ink-dim">POTENTIAL VALUE</p>
      <p className="font-display text-[24px] leading-tight font-medium text-gold-dark">
        {move.impact}
      </p>

      <p className="mt-2 text-[10px] font-medium text-gold-dark">✦ Ask Concierge about this</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-full border border-black/10 px-3.5 py-1.5 text-[10px] font-semibold text-ink-dim">
          Skip
        </span>
        <span className="flex-1 rounded-full bg-gradient-to-r from-[#D4AA70] via-gold to-gold-deep px-3.5 py-1.5 text-center text-[10px] font-bold text-night">
          {move.action}
        </span>
      </div>
    </div>
  );
}

function FeedScreen({ progress }: { progress: MotionValue<number> }) {
  // Cards peel away one by one as the visitor scrolls through the beats.
  const y0 = useTransform(progress, [0.3, 0.42], [0, -460]);
  const r0 = useTransform(progress, [0.3, 0.42], [0, -10]);
  const o0 = useTransform(progress, [0.3, 0.42], [1, 0]);
  const y1 = useTransform(progress, [0.62, 0.74], [0, -460]);
  const r1 = useTransform(progress, [0.62, 0.74], [0, 8]);
  const o1 = useTransform(progress, [0.62, 0.74], [1, 0]);

  return (
    <div className="relative flex h-full flex-col bg-cream px-4 pt-14 text-ink">
      <p className="text-center text-[9px] font-bold tracking-[0.3em] text-gold-dark">VAULT</p>
      <p className="mt-1.5 text-center text-[10px] font-semibold text-ink-sub">
        🔥 21 day streak · Tuesday
      </p>

      <div className="relative mt-5 flex-1">
        <motion.div className="absolute inset-x-0 z-30" style={{ y: y0, rotate: r0, opacity: o0 }}>
          <MoveCard move={MOVES[0]} index={0} total={3} />
        </motion.div>
        <motion.div
          className="absolute inset-x-0 z-20"
          style={{ y: y1, rotate: r1, opacity: o1, top: 16, scale: 0.97 }}
        >
          <MoveCard move={MOVES[1]} index={1} total={3} />
        </motion.div>
        <div className="absolute inset-x-0 z-10" style={{ top: 32, transform: 'scale(0.94)' }}>
          <MoveCard move={MOVES[2]} index={2} total={3} />
        </div>
      </div>

      <AppTabBar active="Feed" />
    </div>
  );
}

function Beat({
  progress,
  index,
  title,
  body,
}: {
  progress: MotionValue<number>;
  index: number;
  title: string;
  body: string;
}) {
  const start = index / BEATS.length;
  const end = (index + 1) / BEATS.length;
  const opacity = useTransform(
    progress,
    [Math.max(0, start - 0.05), start + 0.08, end - 0.08, Math.min(1, end + 0.02)],
    [index === 0 ? 1 : 0.12, 1, 1, index === BEATS.length - 1 ? 1 : 0.12],
  );

  return (
    <motion.div style={{ opacity }} className="max-w-md">
      <h3 className="font-display text-4xl leading-[1.08] font-light tracking-tight text-ink md:text-5xl">
        {title}
      </h3>
      <p className="mt-4 text-[16px] leading-relaxed text-ink-sub">{body}</p>
    </motion.div>
  );
}

export default function WealthFeed() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  return (
    <section id="features" className="bg-cream">
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-4 md:pb-0">
        <motion.div
          variants={stagger()}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
        >
          <motion.p
            variants={fadeUp}
            className="text-[11px] font-bold tracking-[0.4em] text-gold-dark uppercase"
          >
            Feature 01 — The Wealth Feed
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-4 max-w-2xl font-display text-5xl leading-[1.05] font-light tracking-tight text-ink md:text-6xl"
          >
            Your money, <em className="text-gold-dark italic">dealt daily.</em>
          </motion.h2>
        </motion.div>
      </div>

      {/* Desktop: pinned phone, beats scroll past */}
      <div ref={ref} className="relative hidden h-[280vh] md:block">
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-16 px-6">
            <div className="space-y-10">
              {BEATS.map((beat, i) => (
                <Beat key={i} progress={scrollYProgress} index={i} {...beat} />
              ))}
            </div>
            <div className="flex justify-center">
              <PhoneMock>
                <FeedScreen progress={scrollYProgress} />
              </PhoneMock>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: compact static version */}
      <div className="mx-auto max-w-6xl space-y-12 px-6 py-16 md:hidden">
        {BEATS.map((beat, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
          >
            <h3 className="font-display text-3xl leading-tight font-light text-ink">
              {beat.title}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-sub">{beat.body}</p>
          </motion.div>
        ))}
        <div className="space-y-3">
          {MOVES.map((move, i) => (
            <MoveCard key={move.tag} move={move} index={i} total={MOVES.length} />
          ))}
        </div>
      </div>
    </section>
  );
}

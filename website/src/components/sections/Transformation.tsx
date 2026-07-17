'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { type ReactNode, useRef } from 'react';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

// The psychology iceberg: dashboards work above the waterline;
// VAULT works below it. Each layer sinks deeper into the dark.
const DEPTHS = [
  {
    label: 'EMOTION',
    text: 'Money stops feeling like fear and starts feeling like a game you’re winning.',
  },
  {
    label: 'BELIEFS',
    text: '“I’m just bad with money” quietly dies somewhere around your thirtieth executed move.',
  },
  {
    label: 'IDENTITY',
    text: 'Then one day you notice it: you’ve become the kind of person whose money has momentum.',
    gold: true,
  },
];

const BEFORE = [
  'Checks the balance with one eye closed',
  'Guesses at what’s safe to spend',
  'Anxiety as permanent background noise',
  '“I’ll figure it out someday”',
];

const AFTER = [
  'Opens VAULT like a morning ritual',
  'Knows tomorrow’s move tonight',
  'Watches a score climb, week over week',
  'Someday has a date',
];

function DepthLayer({ label, text, gold }: { label: string; text: string; gold?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'start 0.45'] });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.08, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [36, 0]);

  return (
    <motion.div ref={ref} style={{ opacity, y }} className="mx-auto max-w-3xl text-center">
      <p
        className={`text-[10px] font-bold tracking-[0.4em] ${gold ? 'text-gold' : 'text-parchment-faint'}`}
      >
        {label}
      </p>
      <p
        className={`mt-4 font-display text-3xl leading-[1.2] font-light tracking-tight sm:text-4xl md:text-[44px] ${
          gold ? 'text-gold-light' : 'text-parchment'
        }`}
      >
        {text}
      </p>
    </motion.div>
  );
}

function CompareCard({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: 'before' | 'after';
}) {
  const after = variant === 'after';
  return (
    <motion.div
      variants={fadeUp}
      className={`rounded-[28px] p-9 ${
        after
          ? 'border border-gold/35 bg-cream text-ink shadow-[0_0_80px_rgba(201,169,110,0.18)]'
          : 'border border-white/[0.06] bg-night-soft text-parchment-dim'
      }`}
    >
      <p
        className={`text-[10px] font-bold tracking-[0.35em] ${
          after ? 'text-gold-dark' : 'text-parchment-faint'
        }`}
      >
        {title}
      </p>
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-[15px] leading-relaxed">
            <span
              className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
                after ? 'bg-gold-dark' : 'bg-parchment-faint/50'
              }`}
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function Transformation() {
  return (
    <section className="relative overflow-hidden bg-night">
      <div className="mx-auto max-w-6xl px-6 pt-32 md:pt-44">
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
            The Transformation
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mx-auto mt-4 max-w-3xl font-display text-5xl leading-[1.05] font-light tracking-tight text-parchment md:text-6xl"
          >
            Other apps change your charts.
            <em className="mt-1 block text-gold-light italic">VAULT changes your identity.</em>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-parchment-dim"
          >
            Psychology&rsquo;s iceberg model says behavior is the surface. Everything that lasts
            happens underneath. Dashboards stop at the waterline. We don&rsquo;t.
          </motion.p>
        </motion.div>

        {/* Above the waterline */}
        <div className="mt-24 text-center">
          <p className="text-[10px] font-bold tracking-[0.4em] text-parchment-faint">
            CONSCIOUS THOUGHTS
          </p>
          <p className="mx-auto mt-4 max-w-2xl font-display text-3xl leading-[1.2] font-light text-parchment sm:text-4xl">
            Check the balance. Feel the spike. Close the app.
            <span className="mt-2 block text-parchment-dim">
              That&rsquo;s where every other app leaves you.
            </span>
          </p>
        </div>

        {/* The waterline */}
        <div className="relative mx-auto mt-20 max-w-4xl" aria-hidden="true">
          <div className="waterline h-px w-full" />
          <p className="mt-3 text-center text-[9px] font-semibold tracking-[0.45em] text-gold/60">
            THE WATERLINE
          </p>
        </div>

        {/* The descent */}
        <div
          className="space-y-28 pt-24 pb-32 md:space-y-36"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(3,3,6,0.9) 70%)',
          }}
        >
          {DEPTHS.map((depth) => (
            <DepthLayer key={depth.label} {...depth} />
          ))}
        </div>
      </div>

      {/* Before → After */}
      <div className="mx-auto max-w-5xl px-6 pb-36 md:pb-44">
        <motion.div
          variants={stagger(0.18)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="grid gap-6 md:grid-cols-2"
        >
          <CompareCard title="BEFORE VAULT" items={BEFORE} variant="before" />
          <CompareCard title="AFTER VAULT" items={AFTER} variant="after" />
        </motion.div>
      </div>
    </section>
  );
}

'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const PILLARS = [
  {
    n: '01',
    title: 'It sees everything.',
    body: 'VAULT connects to your real accounts — read-only, bank-grade encrypted — and understands where your money actually stands. No spreadsheets. No manual entry.',
  },
  {
    n: '02',
    title: 'It scores your momentum.',
    body: 'The Wealth Velocity Score: 0 to 1,000. It measures direction, not net worth — so progress is possible from any starting point.',
  },
  {
    n: '03',
    title: 'It hands you the next move.',
    body: 'A daily feed of specific, doable money moves. And an AI concierge that answers with your numbers, not generic advice.',
  },
];

function RevealContent() {
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] font-bold tracking-[0.4em] text-gold-dark uppercase">Meet Vault</p>
      <h2 className="mt-6 font-display text-5xl leading-[1.05] font-light tracking-tight text-ink sm:text-6xl md:text-7xl">
        Not another budgeting app.
        <span className="mt-2 block">
          Your <em className="text-gold-dark italic">financial operating system.</em>
        </span>
      </h2>
      <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-ink-sub">
        VAULT turns your real accounts into one living system — watching, scoring, and moving you
        forward. Every single day.
      </p>
    </div>
  );
}

function Pillars() {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-6 pt-8 pb-36 md:grid-cols-3 md:gap-10">
      {PILLARS.map((pillar, i) => (
        <motion.div
          key={pillar.n}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.9, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-display text-4xl font-light text-gold-dark italic">{pillar.n}</p>
          <h3 className="mt-4 text-[19px] font-semibold tracking-tight text-ink">
            {pillar.title}
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-sub">{pillar.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

export default function MeetVault() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // The vault opens: two dark doors part along a glowing gold seam,
  // revealing the warm world behind. Pure translateX — GPU-composited.
  const leftDoorX = useTransform(scrollYProgress, [0.15, 0.7], ['0%', '-100%']);
  const rightDoorX = useTransform(scrollYProgress, [0.15, 0.7], ['0%', '100%']);
  const seamGlow = useTransform(scrollYProgress, [0, 0.15], [0.25, 1]);
  const contentOpacity = useTransform(scrollYProgress, [0.35, 0.65], [0, 1]);
  const contentScale = useTransform(scrollYProgress, [0.35, 0.7], [0.96, 1]);

  if (reduced) {
    return (
      <section className="bg-cream">
        <div className="py-36">
          <RevealContent />
        </div>
        <Pillars />
      </section>
    );
  }

  return (
    <section className="bg-cream">
      <div ref={ref} className="relative h-[180vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* The warm world, waiting behind the doors */}
          <div className="absolute inset-0 bg-cream" />
          <motion.div
            className="absolute inset-0"
            style={{ opacity: contentOpacity, scale: contentScale }}
          >
            <RevealContent />
          </motion.div>

          {/* Left vault door */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 bg-night"
            style={{ x: leftDoorX }}
            aria-hidden="true"
          >
            <motion.div
              className="absolute inset-y-0 right-0 w-[3px]"
              style={{
                opacity: seamGlow,
                background:
                  'linear-gradient(to bottom, transparent, #E8C98A 20%, #C9A96E 50%, #E8C98A 80%, transparent)',
                boxShadow: '0 0 40px 6px rgba(201,169,110,0.5)',
              }}
            />
          </motion.div>

          {/* Right vault door */}
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 bg-night"
            style={{ x: rightDoorX }}
            aria-hidden="true"
          >
            <motion.div
              className="absolute inset-y-0 left-0 w-[3px]"
              style={{
                opacity: seamGlow,
                background:
                  'linear-gradient(to bottom, transparent, #E8C98A 20%, #C9A96E 50%, #E8C98A 80%, transparent)',
                boxShadow: '0 0 40px 6px rgba(201,169,110,0.5)',
              }}
            />
          </motion.div>
        </div>
      </div>
      <Pillars />
    </section>
  );
}

'use client';

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useRef } from 'react';
import AppStoreButton from '@/components/AppStoreButton';
import PhoneMock from '@/components/PhoneMock';
import VaultRing from '@/components/VaultRing';
import { stagger, wordReveal } from '@/lib/motion';

const PARTICLES = [
  { left: '12%', top: '22%', size: 3, dur: 9, delay: 0 },
  { left: '22%', top: '64%', size: 2, dur: 11, delay: 1.2 },
  { left: '31%', top: '38%', size: 2, dur: 8, delay: 2.1 },
  { left: '44%', top: '18%', size: 3, dur: 12, delay: 0.6 },
  { left: '58%', top: '70%', size: 2, dur: 10, delay: 1.8 },
  { left: '66%', top: '30%', size: 3, dur: 9, delay: 3 },
  { left: '74%', top: '56%', size: 2, dur: 13, delay: 0.3 },
  { left: '84%', top: '24%', size: 2, dur: 8, delay: 2.6 },
  { left: '90%', top: '62%', size: 3, dur: 11, delay: 1.5 },
];

function HeadlineLine({ words, className = '' }: { words: string[]; className?: string }) {
  return (
    <span className={`block ${className}`}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-visible">
          <motion.span variants={wordReveal} className="inline-block will-change-transform">
            {word}
          </motion.span>
          {i < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 140]);

  // Cursor-following gold light — a fixed-size gradient moved with transforms,
  // so tracking the mouse never repaints the section.
  const GLOW = 800;
  const litRef = useRef(false);
  const mx = useMotionValue(-GLOW * 2);
  const my = useMotionValue(-GLOW * 2);
  const smx = useSpring(mx, { stiffness: 60, damping: 20 });
  const smy = useSpring(my, { stiffness: 60, damping: 20 });

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduced || e.pointerType !== 'mouse' || !sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - GLOW / 2;
    const y = e.clientY - rect.top - GLOW / 2;
    if (!litRef.current) {
      litRef.current = true;
      mx.jump(x);
      my.jump(y);
    } else {
      mx.set(x);
      my.set(y);
    }
  };

  return (
    <section
      ref={sectionRef}
      onPointerMove={onPointerMove}
      className="relative overflow-hidden bg-night"
    >
      {/* Ambient layers */}
      <motion.div
        className="pointer-events-none absolute top-0 left-0 rounded-full"
        style={{
          x: smx,
          y: smy,
          width: GLOW,
          height: GLOW,
          background:
            'radial-gradient(closest-side, rgba(201,169,110,0.09), transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 0%, rgba(201,169,110,0.13), transparent 70%)',
        }}
        aria-hidden="true"
      />
      {!reduced &&
        PARTICLES.map((p, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute rounded-full bg-gold"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: 0.25,
              animation: `drift ${p.dur}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center px-6 pt-36 pb-0 text-center">
        <motion.div
          style={{ y: textY, opacity: textOpacity }}
          variants={stagger(0.09, 0.15)}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.p
            variants={wordReveal}
            className="mb-8 text-[11px] font-bold tracking-[0.4em] text-gold uppercase"
          >
            Introducing Vault
          </motion.p>

          <h1 className="font-display text-[52px] leading-[1.02] font-light tracking-tight text-parchment sm:text-7xl md:text-[92px]">
            <HeadlineLine words={['Your', 'money', 'has']} />
            <HeadlineLine
              words={['a', 'next', 'move.']}
              className="text-gold-light italic"
            />
          </h1>

          <motion.p
            variants={wordReveal}
            className="mt-8 max-w-xl text-[17px] leading-relaxed text-parchment-dim"
          >
            VAULT reads your connected accounts, scores your momentum, and hands you your
            next money moves — every morning. Specific, doable, yours.
          </motion.p>

          <motion.div
            variants={wordReveal}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <AppStoreButton />
            <a
              href="#demo"
              className="group flex items-center gap-3 rounded-full border border-white/15 px-7 py-4 text-[15px] font-semibold text-parchment transition-colors duration-500 hover:border-gold/50 hover:text-gold-light"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5-11-6.5z" />
              </svg>
              Watch VAULT in action
            </a>
          </motion.div>

          <motion.p
            variants={wordReveal}
            className="mt-8 text-[12px] tracking-wide text-parchment-faint"
          >
            Read-only via Plaid&ensp;·&ensp;Encrypted in transit &amp; at rest&ensp;·&ensp;Your data is never sold
          </motion.p>
        </motion.div>

        {/* Floating phone above the fold's edge */}
        <motion.div style={{ y: phoneY }} className="relative mt-20 pb-10">
          {!reduced && (
            <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
              <VaultRing size={560} duration={140} />
              <VaultRing size={720} duration={200} reverse />
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={reduced ? undefined : { y: [0, -14, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PhoneMock />
            </motion.div>
          </motion.div>
        </motion.div>

        <div
          className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex"
          aria-hidden="true"
        >
          <span className="text-[9px] font-semibold tracking-[0.35em] text-parchment-faint">
            THE VAULT OPENS BELOW
          </span>
          <span
            className="h-10 w-px bg-gradient-to-b from-gold/70 to-transparent"
            style={{ animation: reduced ? undefined : 'scroll-cue 2.2s ease-in-out infinite' }}
          />
        </div>
      </div>
    </section>
  );
}

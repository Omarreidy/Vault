'use client';

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { type ReactNode, useEffect, useRef, useState } from 'react';

// All screen content is laid out on a fixed 300×649 design canvas (390:844 iPhone
// ratio) and scaled to the frame, so it fits pixel-perfectly at every phone size.
const CANVAS_W = 300;
const CANVAS_H = 649;

function ScreenScaler({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(width / CANVAS_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
        {/* Dynamic island — inside the canvas so it scales with everything else */}
        <div className="absolute top-[12px] left-1/2 h-[24px] w-[86px] -translate-x-1/2 rounded-full bg-night" />
      </div>
    </div>
  );
}

export function AnimatedNumber({
  to,
  duration = 2,
  delay = 0,
  className,
}: {
  to: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduced = useReducedMotion();
  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      value.set(to);
      return;
    }
    const controls = animate(value, to, { duration, delay, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [inView, reduced, to, duration, delay, value]);

  return (
    <motion.span ref={ref} className={className}>
      {rounded}
    </motion.span>
  );
}

// The app's real bottom tab bar: Feed · Vault · Insights · Future · Profile.
export function AppTabBar({ active }: { active: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-black/[0.06] bg-white/90 px-2 pt-2.5 pb-5">
      {['Feed', 'Vault', 'Insights', 'Future', 'Profile'].map((tab) => (
        <span
          key={tab}
          className={`text-[9px] font-semibold tracking-wide ${
            tab === active ? 'text-gold-dark' : 'text-ink-muted'
          }`}
        >
          {tab}
        </span>
      ))}
    </div>
  );
}

// Faithful echo of the app's Vault tab (ScoreScreen): the WEALTH VELOCITY hero
// score with tier progress, above the real tab bar.
export function VaultScreenHome() {
  return (
    <div className="relative flex h-full flex-col bg-cream px-5 pt-14 text-ink">
      <p className="text-center text-[9px] font-bold tracking-[0.3em] text-gold-dark">VAULT</p>

      <div className="mt-8 text-center">
        <p className="text-[9px] font-semibold tracking-[0.25em] text-ink-dim">WEALTH VELOCITY</p>
        <p className="font-display text-[76px] leading-none font-medium tracking-tight">
          <AnimatedNumber to={684} delay={0.9} />
        </p>
        <p className="mt-1.5 text-[11px] font-semibold text-rise">▲ +12 this week</p>
      </div>

      <div className="mt-8 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_8px_24px_rgba(154,128,96,0.12)]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/15 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-dark" />
            <span className="text-[9px] font-bold tracking-[0.2em] text-gold-dark">GOLD</span>
          </span>
          <span className="text-[10px] text-ink-dim">16 pts to Platinum</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-cream-deep">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light"
            initial={{ width: '0%' }}
            whileInView={{ width: '94%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.6, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="mt-3 flex justify-between text-[9px] font-semibold tracking-[0.15em] text-ink-muted">
          <span>BRONZE</span>
          <span>SILVER</span>
          <span className="text-gold-dark">GOLD</span>
          <span>PLAT</span>
          <span>BLACK</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_8px_24px_rgba(154,128,96,0.12)]">
        <div>
          <p className="text-[8px] font-bold tracking-[0.22em] text-gold-dark">STREAK</p>
          <p className="mt-1 text-[13px] font-semibold">🔥 21 days</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-bold tracking-[0.22em] text-gold-dark">MOVES TODAY</p>
          <p className="mt-1 text-[13px] font-semibold">2 of 3</p>
        </div>
      </div>

      <AppTabBar active="Vault" />
    </div>
  );
}

export default function PhoneMock({
  children,
  className = '',
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative w-[260px] sm:w-[310px] ${className}`}>
      {/* Radial gradient only — no blur filter, identical look, zero GPU cost */}
      <div
        className="absolute -inset-20 -z-10"
        style={{
          background:
            'radial-gradient(closest-side, rgba(201,169,110,0.28), rgba(201,169,110,0.07) 55%, transparent 75%)',
        }}
        aria-hidden="true"
      />
      <div className="rounded-[52px] border border-white/10 bg-[#17140F] p-[10px] shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <div className="relative aspect-[390/844] overflow-hidden rounded-[42px] bg-cream">
          <ScreenScaler>{children ?? <VaultScreenHome />}</ScreenScaler>
        </div>
      </div>
    </div>
  );
}

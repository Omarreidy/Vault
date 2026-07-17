'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { fadeUp, stagger, VIEWPORT_ONCE } from '@/lib/motion';

// Every claim here is drawn from the shipped Privacy Policy / Terms — nothing aspirational.
const GUARANTEES = [
  {
    title: 'AES-256 at rest',
    body: 'Your data is encrypted with the same standard banks and governments rely on.',
  },
  {
    title: 'TLS 1.3 in transit',
    body: 'Everything moving between your phone and our servers travels encrypted.',
  },
  {
    title: 'Read-only, via Plaid',
    body: 'VAULT can see balances and transactions. It cannot move money. Ever.',
  },
  {
    title: 'Credentials never stored',
    body: 'Your bank login goes to Plaid, not us. We never see or hold your passwords.',
  },
  {
    title: 'Never sold. No ads.',
    body: 'You pay a subscription, so you’re the customer — not the product. We don’t sell your data. Ever.',
  },
  {
    title: 'Delete everything, anytime',
    body: 'One tap in Settings permanently removes your account and data from our servers.',
  },
];

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-gold-dark" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Trust() {
  return (
    <section id="trust" className="bg-cream py-32 md:py-44">
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
            className="text-[11px] font-bold tracking-[0.4em] text-gold-dark uppercase"
          >
            Trust &amp; Security
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl font-display text-5xl leading-[1.05] font-light tracking-tight text-ink md:text-6xl"
          >
            Your money. Your data.
            <em className="mt-1 block text-gold-dark italic">Your rules.</em>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-ink-sub"
          >
            A vault is only as good as its walls. Here&rsquo;s exactly how yours are built.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger(0.08, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {GUARANTEES.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="rounded-3xl border border-black/[0.07] bg-white p-7 shadow-[0_12px_40px_rgba(154,128,96,0.1)] transition-shadow duration-500 hover:shadow-[0_24px_64px_rgba(154,128,96,0.2)]"
            >
              <ShieldGlyph />
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-ink">
                {item.title}
              </h3>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-sub">{item.body}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="mt-12 text-center text-[14px] text-ink-dim"
        >
          Read the fine print — we keep it readable:{' '}
          <Link href="/privacy" className="font-semibold text-gold-dark hover:underline">
            Privacy Policy
          </Link>{' '}
          ·{' '}
          <Link href="/terms" className="font-semibold text-gold-dark hover:underline">
            Terms of Service
          </Link>
        </motion.p>
      </div>
    </section>
  );
}

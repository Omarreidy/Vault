import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '@/components/LegalShell';
import { SITE } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Support — VAULT',
  description: "We're here to help. Answers to common VAULT questions and how to reach us.",
};

const FAQS = [
  {
    q: 'How do I connect my bank account?',
    a: 'From the Home screen, tap "Connect your bank" and follow the Plaid prompts. Your login credentials are never shared with VAULT — Plaid handles the connection securely.',
  },
  {
    q: 'Is my financial data safe?',
    a: 'Yes. All data is encrypted in transit and at rest. We use read-only bank access through Plaid — we can see your balances and transactions but cannot move money. We never sell your data.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: "Open the iPhone Settings app → tap your name → Subscriptions → VAULT → Cancel Subscription. You'll retain access until the end of your billing period.",
  },
  {
    q: 'How do I restore a purchase?',
    a: 'Open VAULT → tap Upgrade → tap "Restore purchases" at the bottom of the screen.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Settings → scroll to the bottom → tap "Delete Account." This permanently removes all your data from our servers.',
  },
  {
    q: 'How is my Wealth Velocity Score calculated?',
    a: 'Your score is calculated from your income, savings rate, investment activity, debt levels, and financial trajectory. Connect your bank to get a score based on real data rather than estimates.',
  },
];

export default function SupportPage() {
  return (
    <LegalShell>
      <h1 className="mb-2 font-display text-4xl font-light tracking-tight text-parchment">
        Support
      </h1>
      <p className="mb-12 text-parchment-faint">We&rsquo;re here to help.</p>

      <h2 className="mt-10 mb-3 text-[13px] font-bold uppercase tracking-[0.15em] text-gold">
        Contact Us
      </h2>
      <p className="mb-4 text-parchment-dim">
        For any questions, issues, or feedback — email us directly. We respond within 24 hours.
      </p>
      <a
        className="mt-2 inline-block rounded-full bg-gradient-to-r from-[#D4AA70] via-gold to-gold-deep px-8 py-3.5 text-sm font-bold tracking-wide text-night"
        href={`mailto:${SITE.supportEmail}`}
      >
        {SITE.supportEmail}
      </a>

      <h2 className="mt-10 mb-3 text-[13px] font-bold uppercase tracking-[0.15em] text-gold">
        Common Questions
      </h2>
      <div className="space-y-4">
        {FAQS.map((faq) => (
          <div
            key={faq.q}
            className="rounded-2xl border border-night-border bg-night-soft p-6"
          >
            <h3 className="mb-2 text-[15px] font-semibold text-parchment">{faq.q}</h3>
            <p className="text-parchment-dim">{faq.a}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-3 text-[13px] font-bold uppercase tracking-[0.15em] text-gold">
        Privacy
      </h2>
      <p className="text-parchment-dim">
        Read our full{' '}
        <Link href="/privacy" className="text-gold hover:underline">
          Privacy Policy
        </Link>{' '}
        to understand how we handle your data.
      </p>
    </LegalShell>
  );
}

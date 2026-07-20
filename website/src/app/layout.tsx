import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import Analytics from '@/components/Analytics';
import SmoothScroll from '@/components/SmoothScroll';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://getsvault.com'),
  title: 'VAULT — Your Money Has a Next Move',
  description:
    'The finance app that tells you your next money move. VAULT reads your connected accounts — read-only, via Plaid — and hands you specific money moves every morning. Your first score takes 60 seconds, no bank login needed.',
  keywords: ['money moves', 'next money move', 'daily money moves', 'finance app', 'money', 'wealth', 'VAULT'],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'VAULT — Your Money Has a Next Move',
    description:
      'The finance app that tells you your next money move. Specific money moves from your real accounts, every morning — read-only via Plaid.',
    url: 'https://getsvault.com',
    siteName: 'VAULT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VAULT — Your Money Has a Next Move',
    description:
      'The finance app that tells you your next money move. Specific money moves from your real accounts, every morning — read-only via Plaid.',
  },
};

export const viewport: Viewport = {
  themeColor: '#08080C',
  width: 'device-width',
  initialScale: 1,
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'VAULT',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'iOS',
  url: 'https://getsvault.com',
  description:
    'The finance app that tells you your next money move. VAULT reads your connected accounts (read-only via Plaid) and hands you specific money moves every morning.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SmoothScroll>{children}</SmoothScroll>
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </body>
    </html>
  );
}

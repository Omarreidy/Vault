import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
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
  title: 'VAULT — Your Financial Operating System',
  description:
    'VAULT turns your real financial life into momentum. A Wealth Velocity Score, a daily feed of money moves, and an AI concierge that knows your numbers. Built for people going somewhere.',
  keywords: ['finance app', 'wealth', 'money', 'AI finance', 'wealth score', 'VAULT'],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'VAULT — Your Financial Operating System',
    description:
      'A Wealth Velocity Score, a daily feed of money moves, and an AI concierge that knows your numbers.',
    url: 'https://getsvault.com',
    siteName: 'VAULT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VAULT — Your Financial Operating System',
    description:
      'A Wealth Velocity Score, a daily feed of money moves, and an AI concierge that knows your numbers.',
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
    'VAULT turns your real financial life into momentum. A Wealth Velocity Score, a daily feed of money moves, and an AI concierge that knows your numbers.',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </body>
    </html>
  );
}

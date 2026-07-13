export type MoverDirection = 'up' | 'down';
export type Sentiment = 'bullish' | 'bearish' | 'neutral';
export type NewsCategory = 'FED' | 'TECH' | 'ENERGY' | 'CRYPTO' | 'EARNINGS' | 'MACRO' | 'LEGAL';

export interface Mover {
  ticker: string;
  price: string;
  change: number;
  direction: MoverDirection;
}

export interface MarketSnapshot {
  sp500Change: number;
  nasdaqChange: number;
  dowChange: number;
  vix: number;
  vixLabel: string;
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE-MARKET';
  lastUpdated: string;
}

export interface LiveMarketData {
  snapshot: MarketSnapshot;
  movers: Mover[];
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  minutesAgo: number;
  sentiment: Sentiment;
  category: NewsCategory;
  impact: string;
  url?: string;
}

import { functionAuthHeaders } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gvdfypehwmemootjizmd.supabase.co';

// Fallback snapshot for when market is closed / API limit hit
export const FALLBACK_SNAPSHOT: MarketSnapshot = {
  sp500Change: 0, nasdaqChange: 0, dowChange: 0,
  vix: 18.5, vixLabel: 'Normal',
  marketStatus: 'CLOSED', lastUpdated: 'Updating...',
};

const TTL = 10 * 60 * 1000; // 10 minutes
let marketDataCache: { data: LiveMarketData; ts: number } | null = null;
let marketNewsCache: { data: NewsItem[]; ts: number } | null = null;

export async function fetchMarketData(): Promise<LiveMarketData> {
  if (marketDataCache && Date.now() - marketDataCache.ts < TTL) {
    return marketDataCache.data;
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/market-data`, {
    method: 'GET', headers: await functionAuthHeaders(),
  });
  if (!res.ok) throw new Error('Market data unavailable');
  const data = await res.json();
  marketDataCache = { data, ts: Date.now() };
  return data;
}

export async function fetchMarketNews(): Promise<NewsItem[]> {
  if (marketNewsCache && Date.now() - marketNewsCache.ts < TTL) {
    return marketNewsCache.data;
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/market-news`, {
    method: 'GET', headers: await functionAuthHeaders(),
  });
  if (!res.ok) throw new Error('News unavailable');
  const result = await res.json();
  const articles = result.articles ?? [];
  marketNewsCache = { data: articles, ts: Date.now() };
  return articles;
}

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  bullish: '#7EB8A4',
  bearish: '#C97A6E',
  neutral: '#C9A96E',
};

export const NEWS_CATEGORY_COLORS: Record<NewsCategory, string> = {
  FED: '#C9A96E', TECH: '#7EA8B8', ENERGY: '#B8A47E',
  CRYPTO: '#9A7EB8', EARNINGS: '#7EB8A4', MACRO: '#C9A96E', LEGAL: '#C97A6E',
};

export interface VolumeSpikeStock {
  ticker: string;
  price: string;
  dayChange: number;
  multiplier: number;
  reason: string;
}

export interface VaultAngle {
  tag: string;
  actionable: boolean;
  headline: string;
  body: string;
  moveSuggestion?: string;
}

export function timeAgoNews(minutes: number): string {
  if (minutes < 60)   return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import {
  FALLBACK_SNAPSHOT, fetchMarketData, fetchMarketNews,
  Mover, NewsItem,
  SENTIMENT_COLORS, NEWS_CATEGORY_COLORS, timeAgoNews,
  MarketSnapshot, LiveMarketData,
} from '../services/marketSignal';

// ─── Market snapshot header ───────────────────────────────────────────────────

function SnapshotCard({ snap }: { snap: MarketSnapshot }) {
  const scale   = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, tension: 60, friction: 9, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: false }),
    ]).start();
  }, []);
  const statusColor = snap.marketStatus === 'OPEN' ? '#7EB8A4' : COLORS.textMuted;

  const IndexPill = ({ label, val }: { label: string; val: number }) => (
    <View style={snapStyles.pill}>
      <Text style={snapStyles.pillLabel}>{label}</Text>
      <Text style={[snapStyles.pillVal, { color: val >= 0 ? '#7EB8A4' : '#C97A6E' }]}>
        {val >= 0 ? '+' : ''}{val.toFixed(2)}%
      </Text>
    </View>
  );

  return (
    <Animated.View style={[snapStyles.card, CARD_SHADOW, { opacity, transform: [{ scale }] }]}>
      <View style={snapStyles.topAccent} />
      <View style={snapStyles.inner}>
        <View style={snapStyles.row}>
          <View>
            <Text style={snapStyles.eyebrow}>MARKET SNAPSHOT</Text>
            <Text style={snapStyles.updated}>As of {snap.lastUpdated}</Text>
          </View>
          <View style={[snapStyles.statusBadge, { borderColor: statusColor + '50' }]}>
            {snap.marketStatus === 'OPEN' && <View style={snapStyles.liveDot} />}
            <Text style={[snapStyles.statusTxt, { color: statusColor }]}>{snap.marketStatus}</Text>
          </View>
        </View>
        <View style={snapStyles.indices}>
          <IndexPill label="S&P 500" val={snap.sp500Change} />
          <IndexPill label="NASDAQ" val={snap.nasdaqChange} />
          <IndexPill label="DOW" val={snap.dowChange} />
          <View style={snapStyles.pill}>
            <Text style={snapStyles.pillLabel}>VIX</Text>
            <Text style={[snapStyles.pillVal, { color: snap.vix > 20 ? '#C97A6E' : '#7EB8A4' }]}>
              {snap.vix} · {snap.vixLabel}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const snapStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  topAccent: { height: 2, backgroundColor: COLORS.gold },
  inner: { padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontSize: 9, color: COLORS.gold, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  updated: { fontSize: FONTS.sizes.xs, color: 'rgba(242,239,233,0.4)', marginTop: 3 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#7EB8A4' },
  statusTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: 1 },
  indices: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  pill: {
    flex: 1, minWidth: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
    gap: 3,
  },
  pillLabel: { fontSize: 8, color: 'rgba(242,239,233,0.4)', fontWeight: FONTS.weights.bold, letterSpacing: 0.8 },
  pillVal: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
});

// ─── Hot mover row ────────────────────────────────────────────────────────────

function MoverRow({ mover, index }: { mover: Mover; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const opacity  = useRef(new Animated.Value(0)).current;
  const slideX   = useRef(new Animated.Value(16)).current;
  const expandH  = useRef(new Animated.Value(0)).current;
  const expandOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: index * 60, useNativeDriver: false }),
      Animated.timing(slideX,  { toValue: 0, duration: 320, delay: index * 60, useNativeDriver: false }),
    ]).start();
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !expanded;
    setExpanded(next);
    Animated.parallel([
      Animated.timing(expandH,  { toValue: next ? 1 : 0, duration: 240, useNativeDriver: false }),
      Animated.timing(expandOp, { toValue: next ? 1 : 0, duration: 240, useNativeDriver: false }),
    ]).start();
  };

  const isUp    = mover.direction === 'up';
  const color   = isUp ? '#7EB8A4' : '#C97A6E';
  const arrow   = isUp ? '▲' : '▼';
  const detailH = expandH.interpolate({ inputRange: [0, 1], outputRange: [0, 72] });

  return (
    <Animated.View style={{ opacity, transform: [{ translateX: slideX }] }}>
      <TouchableOpacity
        style={moverStyles.row}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={[moverStyles.tickerBox, { borderColor: color + '40', backgroundColor: color + '0D' }]}>
          <Text style={[moverStyles.ticker, { color }]}>{mover.ticker}</Text>
        </View>
        <View style={moverStyles.info}>
          <Text style={moverStyles.name} numberOfLines={1}>{mover.name}</Text>
          <View style={moverStyles.metaRow}>
            <View style={[moverStyles.reasonTag, { backgroundColor: color + '15', borderColor: color + '30' }]}>
              <Text style={[moverStyles.reasonTxt, { color }]}>{mover.reason}</Text>
            </View>
            <Text style={moverStyles.sector}>{mover.sector}</Text>
          </View>
        </View>
        <View style={moverStyles.changeCol}>
          <Text style={[moverStyles.change, { color }]}>{arrow} {Math.abs(mover.change).toFixed(1)}%</Text>
          <Text style={moverStyles.price}>{mover.price}</Text>
          <Text style={[moverStyles.weekly, { color: mover.weeklyChange >= 0 ? '#7EB8A4' : '#C97A6E' }]}>
            {mover.weeklyChange >= 0 ? '+' : ''}{mover.weeklyChange.toFixed(1)}% 5d
          </Text>
        </View>
      </TouchableOpacity>

      <Animated.View style={{ maxHeight: detailH, opacity: expandOp, overflow: 'hidden' }}>
        <View style={[moverStyles.detail, { borderLeftColor: color }]}>
          <Text style={moverStyles.detailTxt}>{mover.detail}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const moverStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tickerBox: {
    width: 52, height: 36,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  ticker: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.heavy, letterSpacing: 0.5 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  reasonTag: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  reasonTxt: { fontSize: 8, fontWeight: FONTS.weights.bold, letterSpacing: 0.5 },
  sector: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  changeCol: { alignItems: 'flex-end', gap: 2 },
  change: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  price: { fontSize: FONTS.sizes.xs, color: COLORS.textDim },
  weekly: { fontSize: 9, fontWeight: FONTS.weights.medium },
  detail: {
    marginHorizontal: SPACING.md,
    marginBottom: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
  },
  detailTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 18 },
});

// ─── Volume spike row ─────────────────────────────────────────────────────────

function VolumeSpikeRow({ item, index }: { item: VolumeSpikeStock; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 300, delay: 200 + index * 80, useNativeDriver: false }).start();
  }, []);

  const isUp = item.dayChange >= 0;
  const color = isUp ? '#7EB8A4' : '#C97A6E';

  return (
    <Animated.View style={[vsStyles.row, { opacity }]}>
      <View style={vsStyles.left}>
        <View style={vsStyles.multiplierBadge}>
          <Text style={vsStyles.multiplierTxt}>{item.multiplier}x</Text>
          <Text style={vsStyles.multiplierLabel}>vol</Text>
        </View>
        <View style={vsStyles.info}>
          <View style={vsStyles.nameRow}>
            <Text style={vsStyles.ticker}>{item.ticker}</Text>
            <Text style={[vsStyles.change, { color }]}>
              {isUp ? '+' : ''}{item.dayChange.toFixed(1)}%
            </Text>
          </View>
          <Text style={vsStyles.reason} numberOfLines={1}>{item.reason}</Text>
        </View>
      </View>
      <Text style={vsStyles.price}>{item.price}</Text>
    </Animated.View>
  );
}

const vsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  multiplierBadge: {
    width: 44, height: 38,
    backgroundColor: 'rgba(201,169,110,0.12)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gold + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  multiplierTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.heavy, color: COLORS.gold },
  multiplierLabel: { fontSize: 7, color: COLORS.goldDark, fontWeight: FONTS.weights.bold, letterSpacing: 0.5 },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  ticker: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  change: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  reason: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, lineHeight: 15 },
  price: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, fontWeight: FONTS.weights.medium },
});

// ─── News row ─────────────────────────────────────────────────────────────────

function NewsRow({ item, index }: { item: NewsItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const opacity  = useRef(new Animated.Value(0)).current;
  const expandH  = useRef(new Animated.Value(0)).current;
  const expandOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 320, delay: 300 + index * 70, useNativeDriver: false }).start();
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !expanded;
    setExpanded(next);
    Animated.parallel([
      Animated.timing(expandH,  { toValue: next ? 1 : 0, duration: 220, useNativeDriver: false }),
      Animated.timing(expandOp, { toValue: next ? 1 : 0, duration: 220, useNativeDriver: false }),
    ]).start();
  };

  const sentimentColor  = SENTIMENT_COLORS[item.sentiment];
  const categoryColor   = NEWS_CATEGORY_COLORS[item.category];
  const impactH = expandH.interpolate({ inputRange: [0, 1], outputRange: [0, 52] });

  return (
    <Animated.View style={{ opacity }}>
      <TouchableOpacity
        style={newsStyles.row}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={newsStyles.left}>
          <View style={[newsStyles.catTag, { backgroundColor: categoryColor + '15', borderColor: categoryColor + '35' }]}>
            <Text style={[newsStyles.catTxt, { color: categoryColor }]}>{item.category}</Text>
          </View>
          <Text style={newsStyles.headline} numberOfLines={expanded ? 4 : 2}>{item.headline}</Text>
          <View style={newsStyles.metaRow}>
            <Text style={newsStyles.source}>{item.source}</Text>
            <Text style={newsStyles.dot}>·</Text>
            <Text style={newsStyles.time}>{timeAgoNews(item.minutesAgo)}</Text>
          </View>
        </View>
        <View style={[newsStyles.sentimentBadge, { borderColor: sentimentColor + '50' }]}>
          <Text style={[newsStyles.sentimentTxt, { color: sentimentColor }]}>
            {item.sentiment.toUpperCase().slice(0, 4)}
          </Text>
        </View>
      </TouchableOpacity>

      <Animated.View style={{ maxHeight: impactH, opacity: expandOp, overflow: 'hidden' }}>
        <View style={newsStyles.impact}>
          <Text style={newsStyles.impactEye}>YOUR ANGLE</Text>
          <Text style={newsStyles.impactTxt}>{item.impact}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const newsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  left: { flex: 1, gap: 5 },
  catTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  catTxt: { fontSize: 8, fontWeight: FONTS.weights.bold, letterSpacing: 0.8 },
  headline: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.text, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  source: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: FONTS.weights.medium },
  dot: { fontSize: FONTS.sizes.xs, color: COLORS.border },
  time: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  sentimentBadge: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  sentimentTxt: { fontSize: 8, fontWeight: FONTS.weights.bold, letterSpacing: 0.8 },
  impact: {
    marginHorizontal: SPACING.md,
    marginBottom: 8,
    padding: SPACING.sm,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.sm,
    gap: 3,
  },
  impactEye: { fontSize: 8, color: COLORS.gold, fontWeight: FONTS.weights.bold, letterSpacing: 1.2 },
  impactTxt: { fontSize: FONTS.sizes.xs, color: COLORS.goldDark, lineHeight: 16 },
});

// ─── VAULT angle card ─────────────────────────────────────────────────────────

function VaultAngleCard({ angle, index }: { angle: VaultAngle; index: number }) {
  const scale   = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, tension: 60, friction: 9, delay: index * 120, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 360, delay: index * 120, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[angleStyles.card, CARD_SHADOW, { opacity, transform: [{ scale }] }]}>
      <View style={angleStyles.accentBar} />
      <View style={angleStyles.inner}>
        <View style={angleStyles.topRow}>
          <View style={angleStyles.tagPill}>
            <Text style={angleStyles.tagTxt}>{angle.tag}</Text>
          </View>
          {angle.actionable && (
            <View style={angleStyles.actionablePill}>
              <Text style={angleStyles.actionableTxt}>● ACTIONABLE</Text>
            </View>
          )}
        </View>
        <Text style={angleStyles.headline}>{angle.headline}</Text>
        <Text style={angleStyles.body}>{angle.body}</Text>
        {angle.moveSuggestion && (
          <View style={angleStyles.suggestion}>
            <Text style={angleStyles.suggestionEye}>RELATED MOVE</Text>
            <Text style={angleStyles.suggestionTxt}>↗ {angle.moveSuggestion}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const angleStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
    overflow: 'hidden',
  },
  accentBar: { height: 2, backgroundColor: COLORS.gold },
  inner: { padding: SPACING.lg, gap: SPACING.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tagPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  tagTxt: { fontSize: 8, fontWeight: FONTS.weights.bold, color: COLORS.goldDark, letterSpacing: 0.8 },
  actionablePill: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(126,184,164,0.12)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(126,184,164,0.35)',
  },
  actionableTxt: { fontSize: 8, fontWeight: FONTS.weights.bold, color: '#7EB8A4', letterSpacing: 0.6 },
  headline: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  body: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },
  suggestion: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 2,
  },
  suggestionEye: { fontSize: 8, color: COLORS.gold, fontWeight: FONTS.weights.bold, letterSpacing: 1 },
  suggestionTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.goldDark },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={sectionStyles.title}>{title}</Text>
      <Text style={sectionStyles.sub}>{sub}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: { gap: 2, paddingHorizontal: 2 },
  title: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  sub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: 0.3 },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function MarketSignal() {
  const [moversTab, setMoversTab] = useState<'gainers' | 'losers'>('gainers');
  const [snapshot, setSnapshot] = useState<MarketSnapshot>(FALLBACK_SNAPSHOT);
  const [movers, setMovers] = useState<Mover[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchMarketData(), fetchMarketNews()])
      .then(([market, articles]) => {
        setSnapshot(market.snapshot);
        setMovers(market.movers);
        setNews(articles);
      })
      .catch(() => {}) // keep fallback on error
      .finally(() => setLoading(false));
  }, []);

  const gainers = movers.filter(m => m.direction === 'up');
  const losers  = movers.filter(m => m.direction === 'down');
  const displayed = moversTab === 'gainers' ? gainers : losers;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SnapshotCard snap={snapshot} />

      {/* Hot Movers */}
      <View style={styles.section}>
        <View style={styles.sectionTopRow}>
          <SectionHeader
            title="🔥 Hot Movers"
            sub="Biggest price moves today"
          />
          <View style={styles.miniToggle}>
            <TouchableOpacity
              style={[styles.miniBtn, moversTab === 'gainers' && styles.miniBtnActiveUp]}
              onPress={() => setMoversTab('gainers')}
              activeOpacity={0.8}
            >
              <Text style={[styles.miniTxt, moversTab === 'gainers' && styles.miniTxtActiveUp]}>▲ Gaining</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.miniBtn, moversTab === 'losers' && styles.miniBtnActiveDown]}
              onPress={() => setMoversTab('losers')}
              activeOpacity={0.8}
            >
              <Text style={[styles.miniTxt, moversTab === 'losers' && styles.miniTxtActiveDown]}>▼ Losing</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.card}>
          {loading ? (
            <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: FONTS.sizes.sm }}>Loading live data…</Text>
            </View>
          ) : displayed.length > 0 ? displayed.map((m, i) => (
            <MoverRow key={m.ticker} mover={m as any} index={i} />
          )) : (
            <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: FONTS.sizes.sm }}>No data available</Text>
            </View>
          )}
        </View>
      </View>

      {/* Breaking News */}
      <View style={styles.section}>
        <SectionHeader
          title="📰 What's Moving Markets"
          sub="Live financial news"
        />
        <View style={styles.card}>
          {loading ? (
            <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: FONTS.sizes.sm }}>Loading headlines…</Text>
            </View>
          ) : news.slice(0, 8).map((n, i) => (
            <NewsRow key={n.id} item={n} index={i} />
          ))}
        </View>
      </View>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.xl },

  section: { gap: SPACING.md },
  sectionTopRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  miniToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: 2,
  },
  miniBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  miniBtnActiveUp:   { backgroundColor: 'rgba(126,184,164,0.15)' },
  miniBtnActiveDown: { backgroundColor: 'rgba(201,122,110,0.15)' },
  miniTxt: { fontSize: 9, fontWeight: FONTS.weights.bold, color: COLORS.textMuted, letterSpacing: 0.5 },
  miniTxtActiveUp:   { color: '#7EB8A4' },
  miniTxtActiveDown: { color: '#C97A6E' },
});

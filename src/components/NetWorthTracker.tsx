import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { usePlaid } from '../context/PlaidContext';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

// Sign-aware: net worth is legitimately negative when credit debt exceeds
// assets — "-$5K", never "$-5,000" (or a negative million skipping the buckets).
function fmt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

export default function NetWorthTracker() {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const { plaidConnected, plaidSummary } = usePlaid();

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: false }).start();
  }, []);

  const netWorth = plaidSummary
    ? plaidSummary.checking + plaidSummary.savings + plaidSummary.investments - plaidSummary.creditDebt
    : 0;
  const assets = plaidSummary
    ? plaidSummary.checking + plaidSummary.savings + plaidSummary.investments
    : 0;

  return (
    <Animated.View style={[styles.card, CARD_SHADOW, { opacity: fadeIn }]}>
      <View style={styles.topAccent} />
      <View style={styles.inner}>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>NET WORTH TRACKER</Text>
            <Text style={styles.title}>
              {plaidConnected ? 'Your wealth at a glance' : 'Track your wealth over time'}
            </Text>
          </View>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>◉</Text>
          </View>
        </View>

        {/* Chart bars */}
        <View style={styles.chartPlaceholder}>
          {[0.3, 0.5, 0.4, 0.65, 0.55, 0.8, 0.7].map((h, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: `${h * 100}%`,
                  backgroundColor: i === 6 ? COLORS.gold : COLORS.border,
                  opacity: i === 6 ? 1 : 0.4 + i * 0.08,
                },
              ]}
            />
          ))}
        </View>

        {!plaidConnected && (
          <View style={styles.connectCard}>
            <Text style={styles.connectIcon}>🏦</Text>
            <View style={styles.connectText}>
              <Text style={styles.connectTitle}>Connect your bank to track net worth</Text>
              <Text style={styles.connectSub}>
                See your checking, savings, investments, and debt in one chart — updated daily.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={[styles.statVal, plaidConnected && { color: netWorth >= 0 ? '#7EB8A4' : '#C97A6E' }]}>
              {plaidConnected ? fmt(netWorth) : '—'}
            </Text>
            <Text style={styles.statLbl}>NET WORTH</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{plaidConnected ? fmt(assets) : '—'}</Text>
            <Text style={styles.statLbl}>TOTAL ASSETS</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{plaidConnected && plaidSummary ? fmt(plaidSummary.creditDebt) : '—'}</Text>
            <Text style={styles.statLbl}>TOTAL DEBT</Text>
          </View>
        </View>

        <View style={styles.factRow}>
          <Text style={styles.factDot}>◆</Text>
          <Text style={styles.factTxt}>
            VAULT members who connect accounts grow net worth{' '}
            <Text style={styles.factHighlight}>2.3× faster</Text>
            {' '}than those who don't.
          </Text>
        </View>

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '35',
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  topAccent: { height: 2, backgroundColor: COLORS.goldDark },
  inner: { padding: SPACING.lg },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  eyebrow: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wider,
    fontWeight: FONTS.weights.bold,
    marginBottom: 4,
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.goldGlow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.gold + '40',
  },
  icon: { fontSize: 16, color: COLORS.gold },

  chartPlaceholder: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: SPACING.md,
    paddingHorizontal: 4,
  },
  bar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 8,
  },

  connectCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '30',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  connectIcon: { fontSize: 20, marginRight: SPACING.sm, marginTop: 1 },
  connectText: { flex: 1 },
  connectTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: 3,
  },
  connectSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textDim,
    lineHeight: 17,
  },

  statRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDiv: { width: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  statVal: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  statLbl: {
    fontSize: 7,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wider,
    textAlign: 'center',
  },

  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  factDot: {
    fontSize: 10,
    color: COLORS.gold,
    marginRight: 8,
    marginTop: 2,
    flexShrink: 0,
  },
  factTxt: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  factHighlight: {
    color: COLORS.goldDark,
    fontWeight: FONTS.weights.semibold,
  },
});

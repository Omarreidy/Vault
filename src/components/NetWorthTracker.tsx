import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle, Line } from 'react-native-svg';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_W   = width - SPACING.lg * 2;
const CHART_H  = 90;
const CHART_W  = CARD_W - SPACING.lg * 2;
const PAD_L    = 0;
const PAD_R    = 0;
const PAD_T    = 10;
const PAD_B    = 20;
const PLOT_W   = CHART_W - PAD_L - PAD_R;
const PLOT_H   = CHART_H - PAD_T - PAD_B;

// Mock net worth data — monthly snapshots since joining
// In a real app this comes from Plaid-connected accounts
const NET_WORTH_HISTORY = [
  { label: 'Jan', value: 28_400 },  // joined
  { label: 'Feb', value: 29_800 },
  { label: 'Mar', value: 31_200 },
  { label: 'Apr', value: 32_900 },
  { label: 'May', value: 34_600 },  // current
];

const JOINED_VALUE  = NET_WORTH_HISTORY[0].value;
const CURRENT_VALUE = NET_WORTH_HISTORY[NET_WORTH_HISTORY.length - 1].value;
const DELTA         = CURRENT_VALUE - JOINED_VALUE;
const DELTA_PCT     = ((DELTA / JOINED_VALUE) * 100).toFixed(1);
const MONTHS_ACTIVE = NET_WORTH_HISTORY.length - 1;

function formatK(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}

function formatFull(n: number) {
  return '$' + n.toLocaleString();
}

interface SparklineProps {
  data: number[];
  animated: boolean;
}

function Sparkline({ data, animated }: SparklineProps) {
  const [progress, setProgress] = useState(animated ? 0 : 1);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    Animated.timing(anim, { toValue: 1, duration: 1200, delay: 400, useNativeDriver: false }).start();
    const id = anim.addListener(({ value }) => setProgress(value));
    return () => anim.removeListener(id);
  }, []);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const toX = (i: number) => PAD_L + (i / (data.length - 1)) * PLOT_W;
  const toY = (v: number) => PAD_T + PLOT_H - ((v - min) / range) * PLOT_H;

  const visibleCount = Math.max(2, Math.round(progress * data.length));
  const visible = data.slice(0, visibleCount);
  const points  = visible.map((v, i) => ({ x: toX(i), y: toY(v) }));

  const linePath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  ).join(' ');

  const bottomY  = PAD_T + PLOT_H;
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${PAD_L} ${bottomY} Z`
    : '';

  const lastPt = points[points.length - 1];

  // Month labels
  const labels = NET_WORTH_HISTORY.map((d, i) => ({
    label: d.label, x: toX(i),
  }));

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <SvgGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={COLORS.goldDark} stopOpacity="0.18" />
          <Stop offset="1" stopColor={COLORS.goldDark} stopOpacity="0.01" />
        </SvgGradient>
      </Defs>

      {/* Area */}
      {areaPath ? <Path d={areaPath} fill="url(#nwGrad)" /> : null}

      {/* Line */}
      {linePath ? (
        <Path
          d={linePath}
          fill="none"
          stroke={COLORS.goldDark}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {/* Tip dot */}
      {lastPt && progress > 0.15 && (
        <Circle cx={lastPt.x} cy={lastPt.y} r={4} fill={COLORS.goldDark} />
      )}

      {/* Month labels */}
      {labels.map((l, i) => (
        <Text
          key={i}
          x={l.x}
          y={CHART_H - 4}
          fontSize={8}
          fill={COLORS.textMuted}
          textAnchor="middle"
        >
          {l.label}
        </Text>
      ))}
    </Svg>
  );
}

export default function NetWorthTracker() {
  const deltaScale  = useRef(new Animated.Value(0.88)).current;
  const deltaOpacity = useRef(new Animated.Value(0)).current;
  const [countVal, setCountVal]   = useState(JOINED_VALUE);
  const countAnim = useRef(new Animated.Value(JOINED_VALUE)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(deltaScale,   { toValue: 1, useNativeDriver: false, tension: 60, friction: 9, delay: 300 }),
      Animated.timing(deltaOpacity, { toValue: 1, duration: 400, useNativeDriver: false, delay: 300 }),
      Animated.timing(countAnim,    { toValue: CURRENT_VALUE, duration: 1400, delay: 500, useNativeDriver: false }),
    ]).start();
    const id = countAnim.addListener(({ value }) => setCountVal(Math.round(value)));
    return () => countAnim.removeListener(id);
  }, []);

  return (
    <View style={[styles.card, CARD_SHADOW]}>
      {/* Gold top accent */}
      <View style={styles.topAccent} />

      <View style={styles.inner}>

        {/* Header row */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>NET WORTH · SINCE JOINING VAULT</Text>
            <Text style={styles.currentVal}>{formatFull(countVal)}</Text>
          </View>
          <Animated.View style={[styles.deltaBadge, { opacity: deltaOpacity, transform: [{ scale: deltaScale }] }]}>
            <Text style={styles.deltaArrow}>↑</Text>
            <Text style={styles.deltaVal}>+{DELTA_PCT}%</Text>
          </Animated.View>
        </View>

        {/* Sparkline */}
        <View style={styles.chartWrap}>
          <Sparkline
            data={NET_WORTH_HISTORY.map(d => d.value)}
            animated
          />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{formatK(JOINED_VALUE)}</Text>
            <Text style={styles.statLbl}>WHEN YOU JOINED</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: COLORS.goldDark }]}>+{formatK(DELTA)}</Text>
            <Text style={styles.statLbl}>VAULT GROWTH</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{MONTHS_ACTIVE}mo</Text>
            <Text style={styles.statLbl}>ACTIVE</Text>
          </View>
        </View>

        {/* VAULT effect callout */}
        <View style={styles.effectRow}>
          <Text style={styles.effectDot}>◆</Text>
          <Text style={styles.effectTxt}>
            VAULT members grow net worth {' '}
            <Text style={styles.effectHighlight}>2.3× faster</Text>
            {' '}than the national average in their first 6 months
          </Text>
        </View>

      </View>
    </View>
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
  inner: { padding: SPACING.lg, gap: SPACING.md },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wider,
    fontWeight: FONTS.weights.bold,
    marginBottom: 4,
  },
  currentVal: {
    fontSize: 32,
    fontWeight: FONTS.weights.light,
    color: COLORS.text,
    letterSpacing: -1,
    fontFamily: FONTS.display,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.goldDark + '12',
    borderWidth: 1,
    borderColor: COLORS.goldDark + '35',
  },
  deltaArrow: { fontSize: 12, color: COLORS.goldDark, fontWeight: FONTS.weights.bold },
  deltaVal:   { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.goldDark },

  chartWrap: { marginHorizontal: -4 },

  statsRow: {
    flexDirection: 'row',
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  stat:    { flex: 1, alignItems: 'center', gap: 4 },
  statDiv: { width: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  statVal: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  statLbl: { fontSize: 7, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wider, textAlign: 'center' },

  effectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '30',
  },
  effectDot:       { fontSize: 10, color: COLORS.gold, marginTop: 1 },
  effectTxt:       { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 17 },
  effectHighlight: { fontWeight: FONTS.weights.bold, color: COLORS.goldDark },
});

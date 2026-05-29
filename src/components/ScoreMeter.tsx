import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { VelocityScore } from '../types';
import { getPointsToNextTier } from '../services/velocity';

function SubBar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value / 100,
      duration: 1000,
      delay,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={sub.row}>
      <Text style={sub.label}>{label}</Text>
      <View style={sub.track}>
        <Animated.View style={[sub.fill, { width, backgroundColor: color }]} />
      </View>
      <Text style={[sub.val, { color }]}>{value}</Text>
    </View>
  );
}

const sub = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, width: 72, letterSpacing: FONTS.tracking.wider, textTransform: 'uppercase' },
  track: { flex: 1, height: 2, backgroundColor: COLORS.border, overflow: 'hidden', borderRadius: 1 },
  fill: { height: '100%', borderRadius: 1 },
  val: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.display, width: 24, textAlign: 'right', fontWeight: FONTS.weights.light },
});

export default function ScoreMeter({ score }: Props) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const pointsToNext = getPointsToNextTier(score.total);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, { toValue: score.tierProgress, duration: 1400, delay: 200, useNativeDriver: false }),
      Animated.timing(countAnim, { toValue: score.total, duration: 1600, delay: 100, useNativeDriver: false }),
    ]).start();
  }, []);

  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const countDisplay = countAnim.interpolate({ inputRange: [0, score.total], outputRange: [0, score.total] });

  return (
    <View style={styles.container}>
      <View style={styles.heroRow}>
        <View>
          <AnimatedNumber value={countAnim} />
          <Text style={styles.heroLabel}>WEALTH VELOCITY</Text>
        </View>
        <View style={styles.delta}>
          <Text style={styles.deltaVal}>+{score.weeklyChange}</Text>
          <Text style={styles.deltaLabel}>this week</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.percentile}>
        Building wealth faster than{' '}
        <Text style={styles.highlight}>{score.percentile}%</Text>
        {' '}of people your age
      </Text>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: barWidth }]} />
          <Animated.View style={[styles.glowDot, {
            left: barWidth,
          }]} />
        </View>
        {pointsToNext > 0 && (
          <Text style={styles.hint}>{pointsToNext} pts to next tier</Text>
        )}
      </View>

      <View style={styles.bars}>
        <SubBar label="Savings"    value={score.savings}    color={COLORS.green}       delay={300} />
        <SubBar label="Investment" value={score.investment} color={COLORS.gold}        delay={450} />
        <SubBar label="Debt"       value={score.debt}       color={COLORS.tierSilver}  delay={600} />
        <SubBar label="Spending"   value={score.spending}   color={COLORS.tierPlatinum} delay={750} />
      </View>
    </View>
  );
}

function AnimatedNumber({ value }: { value: Animated.Value }) {
  const [display, setDisplay] = React.useState(0);
  useEffect(() => {
    const id = value.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => value.removeListener(id);
  }, []);
  return (
    <Text style={styles.heroNumber}>{display}</Text>
  );
}

interface Props { score: VelocityScore }

const styles = StyleSheet.create({
  container: { gap: SPACING.lg },

  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroNumber: {
    fontFamily: FONTS.display,
    fontSize: FONTS.sizes.hero,
    fontWeight: FONTS.weights.light,
    color: COLORS.gold,
    lineHeight: FONTS.sizes.hero * 1.0,
    letterSpacing: -2,
  },
  heroLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
    marginTop: 6,
  },
  delta: { alignItems: 'flex-end', paddingBottom: 10 },
  deltaVal: {
    fontFamily: FONTS.display,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.light,
    color: COLORS.green,
  },
  deltaLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  percentile: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },
  highlight: { color: COLORS.text, fontWeight: FONTS.weights.semibold },

  progressSection: { gap: 8 },
  track: { height: 2, backgroundColor: COLORS.border, overflow: 'visible', position: 'relative', borderRadius: 1 },
  fill: { position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: COLORS.gold, borderRadius: 1 },
  glowDot: {
    position: 'absolute',
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    marginLeft: -5,
  },
  hint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'right', letterSpacing: FONTS.tracking.wide },

  bars: { gap: 14 },
});

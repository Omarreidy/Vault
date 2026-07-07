import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Goal, getGoalProgress, getMonthsToGoal } from '../services/goals';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Smooth arc progress — the ring fills to the exact progress value
function CircleProgress({ progress, color, size = 72 }: { progress: number; color: string; size?: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 1200, delay: 300, useNativeDriver: false }).start();
  }, [progress]);

  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Animate the stroke offset so the arc reveals proportionally to progress
  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });
  const webDashOffset = circumference * (1 - progress);

  const pct = Math.round(progress * 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color + '20'}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress arc — starts at 12 o'clock */}
        {Platform.OS === 'web' ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={webDashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <Text style={{ fontFamily: FONTS.display, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.light, color }}>{pct}%</Text>
    </View>
  );
}

interface Props { goal: Goal }

export default function GoalCard({ goal }: Props) {
  const progress = getGoalProgress(goal);
  const months = getMonthsToGoal(goal);
  const remaining = goal.target - goal.current;

  return (
    <View style={[styles.card, CARD_SHADOW, { shadowOpacity: 0.08, shadowRadius: 16 }]}>
      <View style={[styles.accentLine, { backgroundColor: goal.color }]} />
      <View style={styles.inner}>
        <View style={styles.left}>
          <Text style={styles.emoji}>{goal.emoji}</Text>
          <Text style={styles.title}>{goal.title}</Text>
          <Text style={styles.current}>${goal.current.toLocaleString()}</Text>
          <Text style={styles.target}>of ${goal.target.toLocaleString()}</Text>
          <View style={styles.etaBadge}>
            <Text style={styles.etaTxt}>{goal.monthlyContribution > 0 ? `${months} months away` : 'Set a monthly amount'}</Text>
          </View>
        </View>
        <View style={styles.right}>
          <CircleProgress progress={progress} color={goal.color} size={80} />
          <Text style={styles.monthlyTxt}>+${goal.monthlyContribution}/mo</Text>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: goal.color }]} />
        </View>
        <Text style={[styles.remaining, { color: goal.color }]}>${remaining.toLocaleString()} left</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  accentLine: { height: 2 },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  left: { flex: 1, gap: 4 },
  emoji: { fontSize: 22, marginBottom: 2 },
  title: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  current: { fontFamily: FONTS.display, fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.light, color: COLORS.text, lineHeight: 34 },
  target: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  etaBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: COLORS.sheetBg,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  etaTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },
  right: { alignItems: 'center', gap: 8 },
  monthlyTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  barTrack: { flex: 1, height: 3, backgroundColor: COLORS.border, borderRadius: 1.5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 1.5 },
  remaining: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },
});

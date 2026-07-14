import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { buildBriefState, formatDelta, DAILY_MOVES_TARGET } from '../services/ritual';
import { track, EVENTS } from '../services/analytics';

interface Props {
  /** Velocity change since yesterday; null while loading or on first open. */
  delta: number | null;
  scoreTotal: number | null;
  scoreSource: 'live' | 'estimated' | null;
  streakDays: number;
  movesToday: number;
  onStart: () => void;
  index: number;
  total: number;
}

// The Daily Vault Open — the feed's opening card and the ritual's anchor:
// today's velocity delta, the streak at stake, and three moves to close.
export default function DailyBriefCard({
  delta, scoreTotal, scoreSource, streakDays, movesToday, onStart, index, total,
}: Props) {
  const insets = useSafeAreaInsets();
  const brief = buildBriefState({ delta, movesToday });
  const viewTracked = useRef(false);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    if (!viewTracked.current) {
      viewTracked.current = true;
      track(EVENTS.DAILY_BRIEF_VIEWED, {
        delta, moves_today: brief.movesToday, closed: brief.closed, streak: streakDays,
      });
    }
  }, []);

  const dateLabel = new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();

  const deltaColor = delta === null ? COLORS.gold
    : delta > 0 ? COLORS.gold
    : delta < 0 ? '#C97B6E'
    : 'rgba(242,239,233,0.6)';

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inner, { opacity: fade, paddingBottom: SPACING.xl + insets.bottom }]}>

        <View style={styles.top}>
          <View style={styles.topRow}>
            <Text style={styles.mark}>THE DAILY OPEN</Text>
            <Text style={styles.counter}>{index + 1} / {total}</Text>
          </View>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>

        {/* Velocity delta since yesterday */}
        <View style={styles.deltaBlock}>
          {delta === null ? (
            <>
              {/* ASCII placeholder — the display font used at this size can
                  render non-ASCII glyphs as a missing-glyph box on-device. */}
              <Text style={[styles.deltaNum, { color: deltaColor }]}>...</Text>
              <Text style={styles.deltaLabel}>SYNCING YOUR VELOCITY…</Text>
            </>
          ) : (
            <>
              <Text style={[styles.deltaNum, { color: deltaColor }]}>{formatDelta(delta)}</Text>
              <Text style={styles.deltaLabel}>WEALTH VELOCITY SINCE YESTERDAY</Text>
            </>
          )}
          {scoreTotal !== null && (
            <Text style={styles.scoreLine}>
              Score {scoreTotal}
              {scoreSource === 'live' ? '  ·  live from your accounts' : scoreSource === 'estimated' ? '  ·  estimated' : ''}
            </Text>
          )}
        </View>

        <View style={styles.bottom}>
          {/* Streak */}
          <View style={styles.streakRow}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakTxt}>
              {streakDays > 0 ? `${streakDays}-day streak` : 'Start your streak'}
              {'  ·  '}
              {brief.streakSecured ? 'secured today' : 'one move keeps it alive'}
            </Text>
          </View>

          {/* Today's moves — the close state */}
          <View
            style={styles.movesBlock}
            accessibilityLabel={`${brief.movesToday} of ${DAILY_MOVES_TARGET} moves completed today`}
          >
            <View style={styles.segmentRow}>
              {Array.from({ length: DAILY_MOVES_TARGET }, (_, i) => (
                <View
                  key={i}
                  style={[styles.segment, i < brief.movesToday && styles.segmentDone]}
                />
              ))}
            </View>
            <Text style={styles.movesTxt}>
              {brief.closed
                ? '✓ Vault closed for today'
                : `${brief.movesToday} / ${DAILY_MOVES_TARGET} moves today`}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.cta, brief.closed && styles.ctaClosed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              track(EVENTS.DAILY_BRIEF_CTA, { closed: brief.closed });
              onStart();
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={brief.closed ? 'Vault closed — browse more moves' : 'Start today’s moves'}
          >
            <Text style={[styles.ctaTxt, brief.closed && styles.ctaTxtClosed]}>
              {brief.closed ? 'Browse more moves ↓' : "Start today's moves →"}
            </Text>
          </TouchableOpacity>

          {brief.closed && (
            <Text style={styles.closedSub}>Streak secured. New moves drop tomorrow.</Text>
          )}
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Dark hero — bookends the feed with the same finish as the end card.
  container: { flex: 1, width: '100%', backgroundColor: '#08080C' },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    justifyContent: 'space-between',
  },

  top: { gap: SPACING.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mark: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gold,
    letterSpacing: FONTS.tracking.widest * 2,
    fontWeight: FONTS.weights.semibold,
  },
  counter: { fontSize: FONTS.sizes.xs, color: 'rgba(242,239,233,0.35)', letterSpacing: FONTS.tracking.widest },
  date: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(242,239,233,0.45)',
    letterSpacing: FONTS.tracking.widest,
  },

  deltaBlock: { alignItems: 'center', gap: SPACING.sm },
  deltaNum: {
    fontFamily: FONTS.display,
    fontSize: 96,
    fontWeight: FONTS.weights.light,
    letterSpacing: -3,
    lineHeight: 104,
  },
  deltaLabel: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(242,239,233,0.5)',
    letterSpacing: FONTS.tracking.widest,
    textAlign: 'center',
  },
  scoreLine: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(242,239,233,0.65)',
    letterSpacing: FONTS.tracking.wide,
  },

  bottom: { gap: SPACING.md },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.25)',
    backgroundColor: 'rgba(201,169,110,0.08)',
    alignSelf: 'center',
  },
  streakEmoji: { fontSize: 14 },
  streakTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gold,
    fontWeight: FONTS.weights.medium,
    letterSpacing: FONTS.tracking.wide,
  },

  movesBlock: { gap: SPACING.sm, alignItems: 'center' },
  segmentRow: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(242,239,233,0.12)',
  },
  segmentDone: { backgroundColor: COLORS.gold },
  movesTxt: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(242,239,233,0.7)',
    letterSpacing: FONTS.tracking.wide,
  },

  cta: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaClosed: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(242,239,233,0.2)',
  },
  ctaTxt: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: '#08080C',
    letterSpacing: FONTS.tracking.wide,
  },
  ctaTxtClosed: { color: 'rgba(242,239,233,0.7)', fontWeight: FONTS.weights.medium },
  closedSub: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(242,239,233,0.4)',
    textAlign: 'center',
    letterSpacing: FONTS.tracking.wide,
  },
});

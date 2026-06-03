import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TierName } from '../types';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW, TIERS } from '../constants/theme';
import { getProgression, getProgressionStats, ProgressionMove } from '../services/progression';

const CATEGORY_ICONS: Record<string, string> = {
  savings:    '◈',
  investment: '◉',
  debt:       '◇',
  spending:   '○',
  mindset:    '◆',
  career:     '△',
  wealth:     '◎',
};

interface MoveRowProps {
  move: ProgressionMove;
  isNext: boolean;
  index: number;
}

function MoveRow({ move, isNext, index }: MoveRowProps) {
  const slideX   = useRef(new Animated.Value(24)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(move.completed ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX,  { toValue: 0, duration: 320, delay: index * 80, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: index * 80, useNativeDriver: false }),
    ]).start();
    if (move.completed) {
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: false, tension: 200, friction: 8 }).start();
    }
  }, []);

  const nextTierColor = COLORS.gold;

  return (
    <Animated.View style={[
      styles.moveRow,
      isNext && styles.moveRowNext,
      { opacity, transform: [{ translateX: slideX }] },
    ]}>
      {/* Left: completion indicator */}
      <View style={styles.moveLeft}>
        {move.completed ? (
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>
        ) : (
          <View style={[styles.emptyCircle, isNext && { borderColor: nextTierColor }]}>
            {isNext && <View style={[styles.nextDot, { backgroundColor: nextTierColor }]} />}
          </View>
        )}
        {/* Connector line */}
        <View style={[styles.connector, move.completed && styles.connectorDone]} />
      </View>

      {/* Right: move content */}
      <View style={[styles.moveContent, isNext && styles.moveContentNext]}>
        <View style={styles.moveTitleRow}>
          <Text style={styles.moveCategoryIcon}>
            {CATEGORY_ICONS[move.category] ?? '◈'}
          </Text>
          <Text style={[
            styles.moveTitle,
            move.completed && styles.moveTitleDone,
            isNext && styles.moveTitleNext,
          ]}>
            {move.title}
          </Text>
        </View>
        {!move.completed && (
          <Text style={styles.moveDesc}>{move.description}</Text>
        )}
        <View style={styles.moveFooter}>
          {move.completed && move.completedAt ? (
            <Text style={styles.completedDate}>
              ✓ {move.completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          ) : (
            <Text style={[styles.xpBadge, isNext && { color: COLORS.goldDark }]}>
              +{move.xpReward} XP
            </Text>
          )}
          {isNext && (
            <View style={styles.nextPill}>
              <Text style={styles.nextPillTxt}>NEXT</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

interface Props {
  tier: TierName;
  onTierUnlock?: () => void;
}

export default function ProgressionLadder({ tier, onTierUnlock }: Props) {
  const progression = getProgression(tier);
  const stats       = getProgressionStats(tier);
  const nextTier    = TIERS[progression.toTier];
  const [expanded, setExpanded] = useState(true);

  // Progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  const headerScale  = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerScale, { toValue: 1, useNativeDriver: false, tension: 60, friction: 9 }),
      Animated.timing(progressAnim, { toValue: stats.pct, duration: 900, delay: 200, useNativeDriver: false }),
    ]).start();
  }, []);

  // If all complete — pulse the header
  const allDone = stats.completed === stats.total;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpanded(e => !e);
  };

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.card, CARD_SHADOW, { transform: [{ scale: headerScale }] }]}>

      {/* Tier accent line */}
      <View style={[styles.topAccent, { backgroundColor: nextTier.color }]} />

      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={handleToggle} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>PATH TO {progression.toTier}</Text>
          <Text style={styles.tagline}>{progression.tagline}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.countBadge, { backgroundColor: nextTier.color + '18', borderColor: nextTier.color + '40' }]}>
            <Text style={[styles.countTxt, { color: nextTier.color }]}>
              {stats.completed}/{stats.total}
            </Text>
          </View>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: barWidth, backgroundColor: nextTier.color }]} />
        </View>
        <Text style={styles.progressPct}>{Math.round(stats.pct * 100)}%</Text>
      </View>

      {/* Unlock reward teaser */}
      <View style={[styles.rewardRow, { borderColor: nextTier.color + '25' }]}>
        <Text style={[styles.rewardIcon, { color: nextTier.color }]}>◆</Text>
        <Text style={styles.rewardTxt}>{progression.unlockReward}</Text>
      </View>

      {/* Move list */}
      {expanded && (
        <View style={styles.moveList}>
          {progression.moves.map((move, i) => {
            const isNext = !move.completed && progression.moves.findIndex(m => !m.completed) === i;
            return (
              <MoveRow key={move.id} move={move} isNext={isNext} index={i} />
            );
          })}
        </View>
      )}

      {/* XP summary */}
      {expanded && (
        <View style={styles.xpSummary}>
          <Text style={styles.xpSummaryTxt}>
            {stats.xpEarned} / {stats.xpTotal} XP earned toward {progression.toTier}
          </Text>
        </View>
      )}

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  topAccent: { height: 2 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerLeft: { flex: 1, gap: 3 },
  eyebrow: {
    fontSize: 9,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
  },
  tagline: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  countBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  countTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  chevron: { fontSize: 8, color: COLORS.textMuted },

  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  progressTrack: {
    flex: 1, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressPct: { fontSize: 9, color: COLORS.textMuted, width: 28, textAlign: 'right' },

  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: COLORS.goldGlow,
  },
  rewardIcon: { fontSize: 11 },
  rewardTxt: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textDim,
    lineHeight: 17,
  },

  moveList: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },

  moveRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: 52,
  },
  moveRowNext: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginHorizontal: -SPACING.sm,
    marginBottom: 4,
  },

  moveLeft: { alignItems: 'center', width: 24, paddingTop: 2 },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.goldDark,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 11, color: '#FFF', fontWeight: FONTS.weights.bold },
  emptyCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  nextDot: { width: 7, height: 7, borderRadius: 3.5 },
  connector: {
    flex: 1, width: 1.5,
    backgroundColor: COLORS.border,
    marginVertical: 3,
  },
  connectorDone: { backgroundColor: COLORS.goldDark + '60' },

  moveContent: { flex: 1, paddingBottom: SPACING.md, gap: 4 },
  moveContentNext: { paddingBottom: SPACING.sm },
  moveTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  moveCategoryIcon: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  moveTitle: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textDim,
    lineHeight: 19,
  },
  moveTitleDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  moveTitleNext: { color: COLORS.text, fontWeight: FONTS.weights.bold },
  moveDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginLeft: 17,
  },
  moveFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginLeft: 17,
    marginTop: 2,
  },
  xpBadge: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: 0.5 },
  completedDate: { fontSize: 9, color: COLORS.goldDark, fontWeight: FONTS.weights.medium },
  nextPill: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gold,
  },
  nextPillTxt: { fontSize: 7, fontWeight: FONTS.weights.bold, color: '#FFF', letterSpacing: 1 },

  xpSummary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  xpSummaryTxt: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wide,
  },
});

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import {
  COHORT, COHORT_MILESTONE, COHORT_STATS, getCohortRank, CohortMember,
} from '../services/cohort';

function RelativeBar({ delta }: { delta: number }) {
  // delta: negative = behind user, 0 = user, positive = ahead
  const isMe = delta === 0;
  const isAhead = delta > 0;
  const pct = Math.min(Math.abs(delta) / 30, 1); // max bar at 30 pts

  return (
    <View style={barStyles.wrap}>
      <View style={barStyles.track}>
        {isMe ? (
          <View style={[barStyles.fill, barStyles.fillMe, { width: '50%' }]} />
        ) : isAhead ? (
          <View style={[barStyles.fill, barStyles.fillAhead, { width: `${50 + pct * 50}%` as any }]} />
        ) : (
          <View style={[barStyles.fill, barStyles.fillBehind, { width: `${50 - pct * 50}%` as any }]} />
        )}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  wrap: { flex: 1 },
  track: { height: 3, backgroundColor: COLORS.border, borderRadius: 1.5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 1.5 },
  fillMe: { backgroundColor: COLORS.gold },
  fillAhead: { backgroundColor: COLORS.goldDark + '80' },
  fillBehind: { backgroundColor: COLORS.border },
});

interface MemberRowProps {
  member: CohortMember;
  rank: number;
  index: number;
}

function MemberRow({ member, rank, index }: MemberRowProps) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const slideX   = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 340, delay: index * 70, useNativeDriver: false }),
      Animated.timing(slideX,  { toValue: 0, duration: 340, delay: index * 70, useNativeDriver: false }),
    ]).start();
  }, []);

  const deltaLabel = member.isMe
    ? 'You'
    : member.relativeScore > 0
      ? `+${member.relativeScore} ahead`
      : `${Math.abs(member.relativeScore)} behind`;

  return (
    <Animated.View style={[
      styles.memberRow,
      member.isMe && styles.memberRowMe,
      { opacity, transform: [{ translateX: slideX }] },
    ]}>
      {/* Rank */}
      <Text style={[styles.rank, member.isMe && { color: COLORS.gold }]}>
        {rank <= 3 ? ['◆', '◆', '◆'][rank - 1] : `#${rank}`}
      </Text>

      {/* Avatar */}
      <View style={[styles.avatar, member.isMe && styles.avatarMe]}>
        <Text style={[styles.initials, member.isMe && styles.initialsMe]}>
          {member.initials}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, member.isMe && { color: COLORS.gold }]}>
          {member.name}
        </Text>
        <RelativeBar delta={member.relativeScore} />
      </View>

      {/* Right */}
      <View style={styles.memberRight}>
        <Text style={[styles.deltaLabel, member.isMe && { color: COLORS.gold }]}>
          {deltaLabel}
        </Text>
        {member.streak > 0 && (
          <Text style={styles.streak}>🔥 {member.streak}d</Text>
        )}
      </View>
    </Animated.View>
  );
}

export default function CohortCard() {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const headerScale  = useRef(new Animated.Value(0.97)).current;
  const myRank = getCohortRank();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerScale, { toValue: 1, useNativeDriver: false, tension: 60, friction: 9 }),
      Animated.timing(progressAnim, {
        toValue: COHORT_MILESTONE.progress,
        duration: 1000, delay: 300, useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  const sorted = [...COHORT].sort((a, b) => b.relativeScore - a.relativeScore);

  return (
    <Animated.View style={[styles.card, CARD_SHADOW, { transform: [{ scale: headerScale }] }]}>
      {/* Gold top accent */}
      <View style={styles.topAccent} />

      <View style={styles.inner}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR WEALTH COHORT</Text>
            <Text style={styles.subtitle}>
              6 members · Same stage · Same goal
            </Text>
          </View>
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeTxt}>#{myRank}</Text>
            <Text style={styles.rankBadgeSub}>YOUR RANK</Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{COHORT_STATS.avgStreak}d</Text>
            <Text style={styles.statLbl}>AVG STREAK</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{COHORT_STATS.totalMovesThisWeek}</Text>
            <Text style={styles.statLbl}>MOVES THIS WEEK</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: COLORS.goldDark }]}>{COHORT_STATS.topMover.split(' ')[0]}</Text>
            <Text style={styles.statLbl}>TOP MOVER</Text>
          </View>
        </View>

        {/* Member list */}
        <View style={styles.memberList}>
          {sorted.map((member, i) => (
            <MemberRow
              key={member.id}
              member={member}
              rank={i + 1}
              index={i}
            />
          ))}
        </View>

        {/* Shared cohort milestone */}
        <View style={styles.milestone}>
          <View style={styles.milestoneTop}>
            <Text style={styles.milestoneEye}>{COHORT_MILESTONE.label}</Text>
            <Text style={styles.milestonePct}>
              {Math.round(COHORT_MILESTONE.progress * 100)}%
            </Text>
          </View>
          <Text style={styles.milestoneDesc}>{COHORT_MILESTONE.description}</Text>
          <View style={styles.milestoneTrack}>
            <Animated.View style={[styles.milestoneFill, { width: barWidth }]} />
          </View>
          <Text style={styles.milestoneReward}>{COHORT_MILESTONE.reward}</Text>
        </View>

        {/* Invite CTA */}
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})}
          activeOpacity={0.85}
        >
          <Text style={styles.inviteIcon}>+</Text>
          <View>
            <Text style={styles.inviteTitle}>Invite someone to your cohort</Text>
            <Text style={styles.inviteSub}>You both earn +75 XP when they join</Text>
          </View>
          <Text style={styles.inviteArrow}>→</Text>
        </TouchableOpacity>

      </View>
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
  topAccent: { height: 2, backgroundColor: COLORS.gold },
  inner: { padding: SPACING.lg, gap: SPACING.lg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    letterSpacing: FONTS.tracking.wide,
  },
  rankBadge: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.goldGlow,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    gap: 2,
  },
  rankBadgeTxt: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: FONTS.weights.light,
    color: COLORS.gold,
    letterSpacing: -0.5,
  },
  rankBadgeSub: {
    fontSize: 7,
    color: COLORS.goldDark,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.widest,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statDiv: { width: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  statVal: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  statLbl: {
    fontSize: 7,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wider,
    textAlign: 'center',
  },

  memberList: { gap: SPACING.sm },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  memberRowMe: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 0,
    marginHorizontal: -SPACING.sm,
  },

  rank: {
    width: 22,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.weights.bold,
    textAlign: 'center',
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.sheetBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  avatarMe: {
    borderColor: COLORS.gold + '60',
    backgroundColor: COLORS.goldGlow,
  },
  initials: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textDim,
    letterSpacing: 0.5,
  },
  initialsMe: { color: COLORS.gold },

  memberInfo: { flex: 1, gap: 5 },
  memberName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  memberRight: { alignItems: 'flex-end', gap: 2 },
  deltaLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textDim,
    fontWeight: FONTS.weights.medium,
    letterSpacing: 0.2,
  },
  streak: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
  },

  milestone: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '30',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  milestoneTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneEye: {
    fontSize: 9,
    fontWeight: FONTS.weights.bold,
    color: COLORS.gold,
    letterSpacing: FONTS.tracking.widest,
  },
  milestonePct: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.goldDark,
  },
  milestoneDesc: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  milestoneTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  milestoneFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },
  milestoneReward: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wide,
  },

  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  inviteIcon: {
    fontSize: 20,
    color: COLORS.gold,
    fontWeight: FONTS.weights.light,
    width: 30,
    textAlign: 'center',
  },
  inviteTitle: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.background,
  },
  inviteSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  inviteArrow: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gold,
  },
});

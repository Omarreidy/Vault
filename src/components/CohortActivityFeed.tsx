import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import {
  COHORT_ACTIVITY, CohortActivity, Reaction,
  timeAgoShort, ACTIVITY_ICONS,
} from '../services/progressFeed';

function ReactionBtn({ reaction, onPress }: { reaction: Reaction; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 60, useNativeDriver: false }),
      Animated.spring(scale,  { toValue: 1,    useNativeDriver: false, tension: 300, friction: 8 }),
    ]).start(onPress);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.reactionBtn, reaction.reacted && styles.reactionBtnActive]}
        onPress={handlePress}
        activeOpacity={1}
      >
        <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
        <Text style={[styles.reactionLabel, reaction.reacted && styles.reactionLabelActive]}>
          {reaction.label}
        </Text>
        {reaction.count > 0 && (
          <Text style={[styles.reactionCount, reaction.reacted && styles.reactionCountActive]}>
            {reaction.count}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function ActivityCard({ activity, index }: { activity: CohortActivity; index: number }) {
  const [reactions, setReactions] = useState(activity.reactions);
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(16)).current;
  const isMe = activity.memberName === 'You';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 360, delay: index * 60, useNativeDriver: false }),
      Animated.timing(slideY,  { toValue: 0, duration: 360, delay: index * 60, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleReaction = (i: number) => {
    setReactions(prev => prev.map((r, idx) => {
      if (idx !== i) return r;
      return {
        ...r,
        reacted: !r.reacted,
        count: r.reacted ? r.count - 1 : r.count + 1,
      };
    }));
  };

  return (
    <Animated.View style={[
      styles.card,
      CARD_SHADOW,
      { shadowOpacity: 0.07 },
      isMe && styles.cardMe,
      { opacity, transform: [{ translateY: slideY }] },
    ]}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.avatar, isMe && styles.avatarMe]}>
          <Text style={[styles.initials, isMe && styles.initialsMe]}>
            {activity.memberInitials}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaTop}>
            <Text style={[styles.memberName, isMe && { color: COLORS.gold }]}>
              {activity.memberName}
            </Text>
            {activity.xp && (
              <View style={styles.xpBadge}>
                <Text style={styles.xpTxt}>+{activity.xp} XP</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeAgo}>
            {ACTIVITY_ICONS[activity.type]}{'  '}{timeAgoShort(activity.minutesAgo)} ago
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardBody}>
        <Text style={styles.headline}>{activity.headline}</Text>
        {activity.sub && <Text style={styles.sub}>{activity.sub}</Text>}
      </View>

      {/* Reactions */}
      <View style={styles.reactionsRow}>
        {reactions.map((r, i) => (
          <ReactionBtn key={r.label} reaction={r} onPress={() => handleReaction(i)} />
        ))}
      </View>
    </Animated.View>
  );
}

export default function CohortActivityFeed() {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    >
      {/* Forming notice */}
      <View style={styles.formingNotice}>
        <Text style={styles.formingNoticeTxt}>
          ◈  Your cohort is forming. This is what your activity feed will look like as members join and take moves.
        </Text>
      </View>

      {/* Cohort pulse strip */}
      <View style={styles.pulseStrip}>
        <View style={styles.liveDot} />
        <Text style={styles.pulseText}>Cohort activity · forming as members join</Text>
      </View>

      {COHORT_ACTIVITY.map((item, i) => (
        <ActivityCard key={item.id} activity={item} index={i} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },

  formingNotice: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '30',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  formingNoticeTxt: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textDim,
    lineHeight: 18,
  },

  pulseStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '30',
    marginBottom: SPACING.sm,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  pulseText: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.goldDark,
    fontWeight: FONTS.weights.medium,
    letterSpacing: FONTS.tracking.wide,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  cardMe: {
    borderColor: COLORS.gold + '40',
    backgroundColor: COLORS.goldGlow,
  },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
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

  cardMeta: { flex: 1, gap: 3 },
  cardMetaTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  memberName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  xpBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  xpTxt: {
    fontSize: 9,
    fontWeight: FONTS.weights.bold,
    color: COLORS.goldDark,
    letterSpacing: 0.5,
  },
  timeAgo: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wide,
  },

  cardBody: { gap: 4 },
  headline: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
    lineHeight: 22,
  },
  sub: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    lineHeight: 19,
  },

  reactionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  reactionBtnActive: {
    borderColor: COLORS.gold + '60',
    backgroundColor: COLORS.goldGlow,
  },
  reactionEmoji: { fontSize: 11 },
  reactionLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textDim,
    fontWeight: FONTS.weights.medium,
  },
  reactionLabelActive: { color: COLORS.goldDark, fontWeight: FONTS.weights.bold },
  reactionCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.weights.medium,
  },
  reactionCountActive: { color: COLORS.goldDark },
});

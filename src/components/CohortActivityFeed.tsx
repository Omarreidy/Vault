import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import {
  CohortActivityItem, Reaction, fetchCohortFeed, setReaction,
  timeAgoShort, ACTIVITY_ICONS, REACTION_META,
} from '../services/cohort';
import { COHORT_PREVIEW, PreviewActivity } from '../services/progressFeed';

function ReactionBtn({ reaction, onPress, disabled }: {
  reaction: Reaction;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (disabled || !onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 60, useNativeDriver: false }),
      Animated.spring(scale,  { toValue: 1,    useNativeDriver: false, tension: 300, friction: 8 }),
    ]).start(onPress);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.reactionBtn,
          reaction.reacted && styles.reactionBtnActive,
          disabled && styles.reactionBtnDisabled,
        ]}
        onPress={handlePress}
        activeOpacity={1}
        disabled={disabled}
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

function ActivityCard({ activity, index }: { activity: CohortActivityItem; index: number }) {
  const [reactions, setReactions] = useState(activity.reactions);
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(16)).current;
  const isMe = activity.isMe;

  useEffect(() => {
    const delay = Math.min(index * 40, 400);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: false }),
      Animated.timing(slideY,  { toValue: 0, duration: 320, delay, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleReaction = (i: number) => {
    const target = reactions[i];
    const nowOn = !target.reacted;
    // Optimistic toggle; revert if the write doesn't persist.
    setReactions(prev => prev.map((r, idx) => idx !== i ? r : ({
      ...r, reacted: nowOn, count: Math.max(0, r.count + (nowOn ? 1 : -1)),
    })));
    setReaction(activity.id, target.key, nowOn).then(ok => {
      if (!ok) {
        setReactions(prev => prev.map((r, idx) => idx !== i ? r : ({
          ...r, reacted: !nowOn, count: Math.max(0, r.count + (nowOn ? -1 : 1)),
        })));
      }
    });
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
            {isMe ? '◆' : activity.memberName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaTop}>
            <Text style={[styles.memberName, isMe && { color: COLORS.gold }]}>
              {activity.memberName}
            </Text>
            {activity.xp != null && (
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
          <ReactionBtn key={r.key} reaction={r} onPress={() => handleReaction(i)} />
        ))}
      </View>
    </Animated.View>
  );
}

function PreviewCard({ activity, index }: { activity: PreviewActivity; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = Math.min(index * 40, 400);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: false }),
      Animated.timing(slideY,  { toValue: 0, duration: 320, delay, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.card,
      CARD_SHADOW,
      { shadowOpacity: 0.07, opacity, transform: [{ translateY: slideY }] },
    ]}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>◆</Text>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaTop}>
            <Text style={styles.memberName}>Cohort member</Text>
            <View style={styles.previewBadge}>
              <Text style={styles.previewTxt}>PREVIEW</Text>
            </View>
          </View>
          <Text style={styles.timeAgo}>{ACTIVITY_ICONS[activity.type]}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.headline}>{activity.headline}</Text>
        {activity.sub && <Text style={styles.sub}>{activity.sub}</Text>}
      </View>

      <View style={styles.reactionsRow}>
        {REACTION_META.map(m => (
          <ReactionBtn
            key={m.key}
            reaction={{ ...m, count: 0, reacted: false }}
            disabled
          />
        ))}
      </View>
    </Animated.View>
  );
}

export default function CohortActivityFeed() {
  const [items, setItems] = useState<CohortActivityItem[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const feed = await fetchCohortFeed();
    setItems(feed);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const hasLive = !!items && items.length > 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
      }
    >
      {!loaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.gold} />
          <Text style={styles.loadingTxt}>Loading cohort activity…</Text>
        </View>
      ) : hasLive ? (
        <>
          {/* Cohort pulse strip */}
          <View style={styles.pulseStrip}>
            <View style={styles.liveDot} />
            <Text style={styles.pulseText}>Cohort activity · live</Text>
          </View>
          {items!.map((item, i) => (
            <ActivityCard key={item.id} activity={item} index={i} />
          ))}
        </>
      ) : (
        <>
          {/* Forming notice */}
          <View style={styles.formingNotice}>
            <Text style={styles.formingNoticeTxt}>
              ◈  Your cohort is forming. Below is a preview of what the feed looks like —
              real member activity appears here as people join and take moves.
            </Text>
          </View>
          {COHORT_PREVIEW.map((item, i) => (
            <PreviewCard key={item.id} activity={item} index={i} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: SPACING.lg, paddingBottom: SPACING.xl },

  loading: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xl * 2,
  },
  loadingTxt: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wide,
  },

  formingNotice: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '30',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  formingNoticeTxt: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textDim,
    lineHeight: 18,
  },

  pulseStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '30',
    marginBottom: SPACING.md,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginRight: SPACING.sm,
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
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  cardMe: {
    borderColor: COLORS.gold + '40',
    backgroundColor: COLORS.goldGlow,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.sheetBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    flexShrink: 0,
  },
  avatarMe: {
    borderColor: COLORS.gold + '60',
    backgroundColor: COLORS.goldGlow,
  },
  initials: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textDim,
  },
  initialsMe: { color: COLORS.gold },

  cardMeta: { flex: 1 },
  cardMetaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  memberName: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  xpBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    flexShrink: 0,
  },
  xpTxt: {
    fontSize: 9,
    fontWeight: FONTS.weights.bold,
    color: COLORS.goldDark,
    letterSpacing: 0.5,
  },
  previewBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    flexShrink: 0,
  },
  previewTxt: {
    fontSize: 8,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  timeAgo: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wide,
  },

  cardBody: { marginBottom: SPACING.md },
  headline: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
    lineHeight: 22,
    marginBottom: 4,
  },
  sub: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    lineHeight: 19,
  },

  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    marginRight: SPACING.sm,
    marginTop: SPACING.xs,
  },
  reactionBtnActive: {
    borderColor: COLORS.gold + '60',
    backgroundColor: COLORS.goldGlow,
  },
  reactionBtnDisabled: { opacity: 0.45 },
  reactionEmoji: { fontSize: 11, marginRight: 4 },
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
    marginLeft: 4,
  },
  reactionCountActive: { color: COLORS.goldDark },
});

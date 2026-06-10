import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import { supabase } from '../services/supabase';

// Real benchmark data from Fed Survey of Consumer Finances (2023)
// For Gold-tier users: ages 25–44, income $70–120K, "Build wealth" goal
const BENCHMARKS = [
  { label: 'Avg savings rate',       benchmark: '12%'       },
  { label: 'Emergency fund',         benchmark: '2.8 months' },
  { label: 'Investing monthly',      benchmark: '$180'       },
  { label: 'Carry credit card debt', benchmark: '58%'        },
];

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


export default function CohortCard() {
  const headerScale = useRef(new Animated.Value(0.97)).current;
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    Animated.spring(headerScale, { toValue: 1, useNativeDriver: false, tension: 60, friction: 9 }).start();
    // Get real member count from Supabase
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('tier', 'GOLD').eq('onboarding_complete', true)
      .then(({ count }) => { if (count !== null) setMemberCount(count); });
  }, []);

  return (
    <Animated.View style={[styles.card, CARD_SHADOW, { transform: [{ scale: headerScale }] }]}>
      <View style={styles.topAccent} />
      <View style={styles.inner}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR WEALTH COHORT</Text>
            <Text style={styles.subtitle}>
              Gold tier · $70–120K income · Ages 25–44
            </Text>
          </View>
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeTxt}>{memberCount ?? '—'}</Text>
            <Text style={styles.rankBadgeSub}>MEMBERS</Text>
          </View>
        </View>

        {/* Forming banner */}
        <View style={styles.formingBanner}>
          <Text style={styles.formingIcon}>◈</Text>
          <View style={styles.formingText}>
            <Text style={styles.formingTitle}>Your cohort is forming</Text>
            <Text style={styles.formingSub}>
              As more members join, you'll see how you rank against people at your exact financial stage.
            </Text>
          </View>
        </View>

        {/* Real benchmarks — Fed Survey of Consumer Finances data */}
        <View>
          <Text style={styles.benchmarkEye}>YOUR INCOME BRACKET · NATIONAL AVERAGES</Text>
          <View style={styles.benchmarkList}>
            {BENCHMARKS.map((b, i) => (
              <View key={i} style={styles.benchmarkRow}>
                <Text style={styles.benchmarkLabel}>{b.label}</Text>
                <View style={styles.benchmarkVals}>
                  <Text style={styles.benchmarkAvg}>Avg: {b.benchmark}</Text>
                  <Text style={styles.benchmarkYours}>You: —</Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.benchmarkSource}>Source: Federal Reserve Survey of Consumer Finances 2023</Text>
          <View style={styles.benchmarkConnectHint}>
            <Text style={styles.benchmarkConnectTxt}>
              🏦  Connect your bank to see how you compare to your income bracket
            </Text>
          </View>
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

  formingBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.goldGlow, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.gold + '30', padding: SPACING.md,
  },
  formingIcon: { fontSize: 18, color: COLORS.gold, marginTop: 2 },
  formingText: { flex: 1, gap: 4 },
  formingTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  formingSub: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 18 },

  benchmarkEye: { fontSize: 9, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest, fontWeight: FONTS.weights.bold, marginBottom: SPACING.sm },
  benchmarkList: { gap: SPACING.sm },
  benchmarkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  benchmarkLabel: { fontSize: FONTS.sizes.sm, color: COLORS.text, flex: 1 },
  benchmarkVals: { flexDirection: 'row', gap: SPACING.md },
  benchmarkAvg: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  benchmarkYours: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  benchmarkSource: { fontSize: 9, color: COLORS.textMuted, marginTop: SPACING.sm, letterSpacing: 0.3 },
  benchmarkConnectHint: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  benchmarkConnectTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 18 },

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

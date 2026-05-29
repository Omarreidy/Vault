import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Animated, TouchableOpacity } from 'react-native';
import { MOCK_USER } from '../services/mockData';
import { GOALS } from '../services/goals';
import { ACHIEVEMENTS } from '../services/achievements';
import { WEEKLY_CHALLENGES } from '../services/challenges';
import ScoreMeter from '../components/ScoreMeter';
import TierBadge from '../components/TierBadge';
import GoalCard from '../components/GoalCard';
import AchievementBadge from '../components/AchievementBadge';
import ChallengeCard from '../components/ChallengeCard';
import TierUnlockCelebration from '../components/TierUnlockCelebration';
import { COLORS, FONTS, SPACING, TIERS, RADIUS, CARD_SHADOW } from '../constants/theme';
import { getNextTier, getPointsToNextTier } from '../services/velocity';
import { TierName } from '../types';

const TIER_ORDER: TierName[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'BLACK'];
const TABS = ['Score', 'Goals', 'Challenges', 'Achievements'] as const;
type Tab = typeof TABS[number];

export default function ScoreScreen() {
  const { score, tier, streakDays } = MOCK_USER;
  const nextTier = getNextTier(tier);
  const pointsToNext = getPointsToNextTier(score.total);
  const [activeTab, setActiveTab] = useState<Tab>('Score');
  const [celebrationTier, setCelebrationTier] = useState<TierName | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Your Vault</Text>
        <View style={styles.streakPill}>
          <View style={styles.dot} />
          <Text style={styles.streakTxt}>{streakDays} day streak</Text>
        </View>
      </View>

      {/* Internal tab bar */}
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* SCORE TAB */}
        {activeTab === 'Score' && (
          <>
            <TierUnlockCelebration
              tier={celebrationTier ?? tier}
              visible={!!celebrationTier}
              onClose={() => setCelebrationTier(null)}
            />

          <View style={[styles.scoreCard, CARD_SHADOW]}>
              <TouchableOpacity style={styles.tierRow} onPress={() => setCelebrationTier(tier)} activeOpacity={0.8}>
                <TierBadge tier={tier} size="lg" />
                <Text style={styles.tierTapHint}>TAP TO PREVIEW UNLOCK</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <ScoreMeter score={score} />
            </View>

            {nextTier && (
              <View style={[styles.nextCard, CARD_SHADOW, { shadowOpacity: 0.08 }]}>
                <View style={[styles.nextAccent, { backgroundColor: TIERS[nextTier].color }]} />
                <View style={styles.nextInner}>
                  <Text style={styles.sectionLabel}>NEXT TIER</Text>
                  <View style={styles.nextRow}>
                    <TierBadge tier={nextTier} size="sm" showLabel={false} />
                    <View style={styles.nextText}>
                      <Text style={[styles.nextName, { color: TIERS[nextTier].color }]}>{TIERS[nextTier].name}</Text>
                      <Text style={styles.nextPts}>{pointsToNext} points away</Text>
                    </View>
                    <Text style={[styles.nextBigNum, { color: TIERS[nextTier].color }]}>{TIERS[nextTier].minScore}</Text>
                  </View>
                  <Text style={styles.nextPerks}>Premium concierge · Exclusive rates · Partner perks</Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionLabel}>MEMBER LADDER</Text>
            <View style={styles.ladder}>
              {TIER_ORDER.map((t, i) => {
                const info = TIERS[t];
                const unlocked = TIER_ORDER.indexOf(tier) >= i;
                const current = t === tier;
                return (
                  <TouchableOpacity key={t} activeOpacity={0.7}>
                    <View style={[styles.rung, current && { borderColor: info.color + '40', backgroundColor: info.color + '06' }, CARD_SHADOW, { shadowOpacity: 0.06 }]}>
                      <View style={[styles.rungBar, { backgroundColor: info.color, opacity: unlocked ? 1 : 0.2 }]} />
                      <TierBadge tier={t} size="sm" showLabel={false} />
                      <View style={styles.rungInfo}>
                        <Text style={[styles.rungName, { color: unlocked ? info.color : COLORS.textMuted }]}>{info.name}</Text>
                        <Text style={styles.rungRange}>{info.minScore} – {info.maxScore} pts</Text>
                      </View>
                      {current && <View style={[styles.currentPill, { borderColor: info.color + '60' }]}><Text style={[styles.currentTxt, { color: info.color }]}>CURRENT</Text></View>}
                      {!unlocked && <Text style={styles.lock}>—</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* GOALS TAB */}
        {activeTab === 'Goals' && (
          <>
            <View style={styles.tabIntro}>
              <Text style={styles.tabIntroTitle}>Savings Goals</Text>
              <Text style={styles.tabIntroSub}>Track your progress toward what matters most.</Text>
            </View>
            {GOALS.map(g => <GoalCard key={g.id} goal={g} />)}
            <TouchableOpacity style={[styles.addGoalBtn, CARD_SHADOW, { shadowOpacity: 0.06 }]}>
              <Text style={styles.addGoalIcon}>+</Text>
              <Text style={styles.addGoalTxt}>Add a new goal</Text>
            </TouchableOpacity>
          </>
        )}

        {/* CHALLENGES TAB */}
        {activeTab === 'Challenges' && (
          <>
            <View style={styles.tabIntro}>
              <Text style={styles.tabIntroTitle}>Weekly Challenges</Text>
              <Text style={styles.tabIntroSub}>Bigger moves, bigger rewards. Resets every Monday.</Text>
            </View>
            {WEEKLY_CHALLENGES.map(c => (
              <View key={c.id} style={[styles.weeklyChallenge, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
                <View style={styles.wTop}>
                  <Text style={styles.wIcon}>{c.icon}</Text>
                  <View style={styles.wReward}>
                    <Text style={styles.wRewardTxt}>+{c.reward} pts</Text>
                  </View>
                </View>
                <Text style={styles.wTitle}>{c.title}</Text>
                <Text style={styles.wDesc}>{c.description}</Text>
                <View style={styles.wBarRow}>
                  <View style={styles.wTrack}>
                    <View style={[styles.wFill, { width: `${Math.round((c.progress / c.target) * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.wProgress}>{c.progress} / {c.target}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ACHIEVEMENTS TAB */}
        {activeTab === 'Achievements' && (
          <>
            <View style={styles.tabIntro}>
              <Text style={styles.tabIntroTitle}>Achievements</Text>
              <Text style={styles.tabIntroSub}>{unlockedCount} of {ACHIEVEMENTS.length} unlocked</Text>
            </View>
            <View style={styles.achieveGrid}>
              {ACHIEVEMENTS.map(a => (
                <AchievementBadge key={a.id} achievement={a} />
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  pageTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...CARD_SHADOW, shadowOpacity: 0.07, shadowRadius: 8,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.gold },
  streakTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tabActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  tabTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, fontWeight: FONTS.weights.medium, letterSpacing: FONTS.tracking.wide },
  tabTxtActive: { color: COLORS.background },

  scoreCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, padding: SPACING.lg, gap: SPACING.lg },
  tierRow: { alignItems: 'center', paddingVertical: SPACING.sm, gap: 6 },
  tierTapHint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  nextCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, overflow: 'hidden' },
  nextAccent: { height: 2 },
  nextInner: { padding: SPACING.md, gap: SPACING.sm },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  nextText: { flex: 1, gap: 3 },
  nextName: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.tight },
  nextPts: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },
  nextBigNum: { fontFamily: FONTS.display, fontSize: 36, fontWeight: FONTS.weights.light },
  nextPerks: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, paddingTop: SPACING.sm, letterSpacing: FONTS.tracking.wide },

  sectionLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest, fontWeight: FONTS.weights.medium },
  ladder: { gap: SPACING.sm },
  rung: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, overflow: 'hidden' },
  rungBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5 },
  rungInfo: { flex: 1, gap: 2 },
  rungName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.medium, letterSpacing: FONTS.tracking.wide },
  rungRange: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  currentPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth },
  currentTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  lock: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },

  tabIntro: { gap: 4 },
  tabIntroTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  tabIntroSub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim },

  addGoalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  addGoalIcon: { fontSize: FONTS.sizes.xl, color: COLORS.gold },
  addGoalTxt: { fontSize: FONTS.sizes.md, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },

  weeklyChallenge: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  wTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wIcon: { fontSize: 24 },
  wReward: { paddingHorizontal: 10, paddingVertical: 3, backgroundColor: COLORS.goldGlow, borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.gold + '40' },
  wRewardTxt: { fontSize: FONTS.sizes.xs, color: COLORS.gold, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },
  wTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
  wDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },
  wBarRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  wTrack: { flex: 1, height: 3, backgroundColor: COLORS.border, borderRadius: 1.5, overflow: 'hidden' },
  wFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 1.5 },
  wProgress: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide, width: 40, textAlign: 'right' },

  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});

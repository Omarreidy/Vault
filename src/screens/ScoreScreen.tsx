import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Animated, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GOALS, Goal, getGoalProgress, getMonthsToGoal } from '../services/goals';
import { ACHIEVEMENTS } from '../services/achievements';
import { WEEKLY_CHALLENGES, Challenge } from '../services/challenges';
import ScoreMeter from '../components/ScoreMeter';
import TierBadge from '../components/TierBadge';
import GoalCard from '../components/GoalCard';
import AchievementBadge from '../components/AchievementBadge';
import ChallengeCard from '../components/ChallengeCard';
import TierUnlockCelebration from '../components/TierUnlockCelebration';
import ProgressionLadder from '../components/ProgressionLadder';
import NetWorthTracker from '../components/NetWorthTracker';
import WealthWrapped from '../components/WealthWrapped';
import CohortCard from '../components/CohortCard';
import { COLORS, FONTS, SPACING, TIERS, RADIUS, CARD_SHADOW } from '../constants/theme';
import { getNextTier, getPointsToNextTier, fetchLiveScore, fetchProfileScore } from '../services/velocity';
import { TierName, VelocityScore } from '../types';

const TIER_ORDER: TierName[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'BLACK'];
const TABS = ['Score', 'Cohort', 'Goals', 'Challenges', 'Achievements'] as const;
type Tab = typeof TABS[number];

export default function ScoreScreen() {
  const [liveScore, setLiveScore] = useState<VelocityScore | null>(null);
  const [scoreSource, setScoreSource] = useState<'plaid' | 'profile' | 'mock'>('mock');

  // Try Plaid → profile → mock fallback
  useEffect(() => {
    fetchLiveScore().then(s => {
      if (s) { setLiveScore(s); setScoreSource('plaid'); return; }
      fetchProfileScore().then(ps => {
        if (ps) { setLiveScore(ps); setScoreSource('profile'); }
      });
    });
  }, []);

  const EMPTY_SCORE = { total: 0, savings: 0, investment: 0, debt: 0, spending: 0, weeklyChange: 0, percentile: 0, tier: 'BRONZE' as TierName, tierProgress: 0 };
  const score      = liveScore ?? EMPTY_SCORE;
  const tier       = (liveScore?.tier ?? 'BRONZE') as TierName;
  const streakDays = 0;
  const nextTier = getNextTier(tier);
  const pointsToNext = getPointsToNextTier(score.total);
  const [activeTab, setActiveTab] = useState<Tab>('Score');
  const [celebrationTier, setCelebrationTier] = useState<TierName | null>(null);
  const [showWrapped, setShowWrapped] = useState(false);

  // Goals state
  const [goals, setGoals] = useState<Goal[]>(GOALS);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalEmoji, setNewGoalEmoji] = useState('🎯');
  const [addProgressAmt, setAddProgressAmt] = useState('');
  const [goalComplete, setGoalComplete] = useState(false);

  // Challenges state
  const [challenges, setChallenges] = useState<Challenge[]>(WEEKLY_CHALLENGES);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  const xpAnim    = useRef(new Animated.Value(0)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const celebScale = useRef(new Animated.Value(0.5)).current;
  const celebOpacity = useRef(new Animated.Value(0)).current;

  const showXP = (xp: number) => {
    setEarnedXP(xp);
    xpAnim.setValue(0);
    xpOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(xpAnim,    { toValue: -50, duration: 700, useNativeDriver: false }),
      Animated.timing(xpOpacity, { toValue: 0,   duration: 700, delay: 300, useNativeDriver: false }),
    ]).start();
  };

  const celebrate = () => {
    celebScale.setValue(0.5);
    celebOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(celebScale,  { toValue: 1, tension: 80, friction: 7, useNativeDriver: false }),
      Animated.timing(celebOpacity,{ toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
    setTimeout(() => {
      Animated.timing(celebOpacity, { toValue: 0, duration: 400, useNativeDriver: false }).start();
    }, 2000);
  };

  const handleAddProgress = () => {
    if (!selectedGoal || !addProgressAmt) return;
    const amt = parseFloat(addProgressAmt);
    if (isNaN(amt) || amt <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const updated = { ...selectedGoal, current: Math.min(selectedGoal.current + amt, selectedGoal.target) };
    setGoals(prev => prev.map(g => g.id === selectedGoal.id ? updated : g));
    setSelectedGoal(updated);
    setAddProgressAmt('');
    showXP(Math.round(amt / 10));
    if (updated.current >= updated.target) {
      setGoalComplete(true);
      celebrate();
    }
  };

  const handleLogChallengeProgress = () => {
    if (!selectedChallenge) return;
    const updated = { ...selectedChallenge, progress: Math.min(selectedChallenge.progress + 1, selectedChallenge.target) };
    const done = updated.progress >= updated.target;
    if (done) updated.completed = true;
    Haptics.impactAsync(done ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setChallenges(prev => prev.map(c => c.id === selectedChallenge.id ? updated : c));
    setSelectedChallenge(updated);
    showXP(done ? updated.reward : Math.round(updated.reward / updated.target));
    if (done) { setChallengeComplete(true); celebrate(); }
  };

  const handleCreateGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget) return;
    const target = parseFloat(newGoalTarget);
    if (isNaN(target) || target <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const newGoal: Goal = {
      id: `g${Date.now()}`, title: newGoalName.trim(), emoji: newGoalEmoji,
      target, current: 0, monthlyContribution: 0, color: COLORS.gold, category: 'savings',
    };
    setGoals(prev => [...prev, newGoal]);
    setNewGoalName(''); setNewGoalTarget(''); setNewGoalEmoji('🎯');
    setShowAddGoal(false);
  };

  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <SafeAreaView style={styles.container}>
      <WealthWrapped visible={showWrapped} onClose={() => setShowWrapped(false)} />
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
            {/* Data source indicator */}
            {scoreSource === 'plaid' && (
              <View style={styles.liveDataBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveDataTxt}>Live score from your connected accounts</Text>
              </View>
            )}
            {scoreSource === 'profile' && (
              <View style={styles.estimatedBadge}>
                <Text style={styles.estimatedTxt}>◇ Estimated score · Connect bank for live data</Text>
              </View>
            )}
            {/* Monthly Recap banner */}
            <TouchableOpacity
              style={styles.recapBanner}
              onPress={() => setShowWrapped(true)}
              activeOpacity={0.85}
            >
              <View style={styles.recapBannerLeft}>
                <Text style={styles.recapBannerEye}>✦  WEALTH RECAP</Text>
                {scoreSource === 'plaid'
                  ? <Text style={styles.recapBannerTitle}>Your monthly recap is ready</Text>
                  : <Text style={styles.recapBannerTitle}>Building your first recap…</Text>
                }
              </View>
              <Text style={styles.recapBannerArrow}>→</Text>
            </TouchableOpacity>

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

            <Text style={styles.sectionLabel}>YOUR PROGRESS</Text>
            <NetWorthTracker />

            <Text style={styles.sectionLabel}>YOUR PATH TO {nextTier ?? 'BLACK'}</Text>
            <ProgressionLadder
              tier={tier}
              onTierUnlock={() => setCelebrationTier(tier)}
            />

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

        {/* COHORT TAB */}
        {activeTab === 'Cohort' && (
          <>
            <View style={styles.tabIntro}>
              <Text style={styles.tabIntroTitle}>Your Cohort</Text>
              <Text style={styles.tabIntroSub}>6 members at your exact financial stage.</Text>
            </View>
            <CohortCard />
          </>
        )}

        {/* GOALS TAB */}
        {activeTab === 'Goals' && (
          <>
            <View style={styles.tabIntro}>
              <Text style={styles.tabIntroTitle}>Savings Goals</Text>
              <Text style={styles.tabIntroSub}>Tap any goal to log progress.</Text>
            </View>
            {goals.map(g => (
              <TouchableOpacity key={g.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setSelectedGoal(g); setGoalComplete(g.current >= g.target); }} activeOpacity={0.85}>
                <GoalCard goal={g} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.addGoalBtn, CARD_SHADOW, { shadowOpacity: 0.06 }]} onPress={() => setShowAddGoal(true)} activeOpacity={0.85}>
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
              <Text style={styles.tabIntroSub}>Tap any challenge to log progress.</Text>
            </View>
            {challenges.map(c => (
              <TouchableOpacity key={c.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setSelectedChallenge(c); setChallengeComplete(c.completed); }} activeOpacity={0.85}>
                <View style={[styles.weeklyChallenge, CARD_SHADOW, { shadowOpacity: 0.07 }, c.completed && styles.weeklyChallengeDone]}>
                  <View style={styles.wTop}>
                    <Text style={styles.wIcon}>{c.icon}</Text>
                    <View style={[styles.wReward, c.completed && styles.wRewardDone]}>
                      <Text style={[styles.wRewardTxt, c.completed && styles.wRewardTxtDone]}>{c.completed ? '✓ Earned' : `+${c.reward} pts`}</Text>
                    </View>
                  </View>
                  <Text style={styles.wTitle}>{c.title}</Text>
                  <Text style={styles.wDesc}>{c.description}</Text>
                  <View style={styles.wBarRow}>
                    <View style={styles.wTrack}>
                      <View style={[styles.wFill, { width: `${Math.round((c.progress / c.target) * 100)}%` as any }, c.completed && { backgroundColor: '#7EB8A4' }]} />
                    </View>
                    <Text style={styles.wProgress}>{c.progress} / {c.target}</Text>
                  </View>
                  <Text style={styles.tapHint}>{c.completed ? 'Completed ✓' : 'Tap to log progress →'}</Text>
                </View>
              </TouchableOpacity>
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

      {/* ── GOAL DETAIL SHEET ─────────────────────────────────── */}
      <Modal visible={!!selectedGoal} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedGoal(null)}>
        {selectedGoal && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={mStyles.root}>
              <View style={mStyles.handle} />
              <View style={mStyles.sheetHeader}>
                <Text style={mStyles.sheetEmoji}>{selectedGoal.emoji}</Text>
                <View style={mStyles.sheetTitleWrap}>
                  <Text style={mStyles.sheetTitle}>{selectedGoal.title}</Text>
                  <Text style={mStyles.sheetSub}>{Math.round(getGoalProgress(selectedGoal) * 100)}% complete · {getMonthsToGoal(selectedGoal)} months left</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedGoal(null)} style={mStyles.closeBtn}>
                  <Text style={mStyles.closeTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Progress bar */}
              <View style={mStyles.section}>
                <View style={mStyles.progressRow}>
                  <Text style={mStyles.progressAmt}>${selectedGoal.current.toLocaleString()}</Text>
                  <Text style={mStyles.progressOf}>of ${selectedGoal.target.toLocaleString()}</Text>
                </View>
                <View style={mStyles.track}>
                  <View style={[mStyles.fill, { width: `${Math.round(getGoalProgress(selectedGoal) * 100)}%` as any, backgroundColor: selectedGoal.color }]} />
                </View>
              </View>

              {goalComplete ? (
                <View style={mStyles.completeCard}>
                  <Text style={mStyles.completeEmoji}>🎉</Text>
                  <Text style={mStyles.completeTitle}>Goal Reached!</Text>
                  <Text style={mStyles.completeSub}>You hit your {selectedGoal.title} goal. Incredible.</Text>
                </View>
              ) : (
                <View style={mStyles.section}>
                  <Text style={mStyles.inputLabel}>LOG PROGRESS</Text>
                  <View style={mStyles.inputRow}>
                    <Text style={mStyles.inputPrefix}>$</Text>
                    <TextInput
                      style={mStyles.input}
                      placeholder="Amount"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      value={addProgressAmt}
                      onChangeText={setAddProgressAmt}
                      // @ts-ignore
                      outlineStyle="none"
                    />
                    <TouchableOpacity style={[mStyles.logBtn, { backgroundColor: selectedGoal.color }]} onPress={handleAddProgress} activeOpacity={0.85}>
                      <Text style={mStyles.logBtnTxt}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={mStyles.quickAmts}>
                    {[100, 250, 500, 1000].map(amt => (
                      <TouchableOpacity key={amt} style={mStyles.quickAmt} onPress={() => setAddProgressAmt(String(amt))} activeOpacity={0.8}>
                        <Text style={mStyles.quickAmtTxt}>+${amt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* XP float */}
              <Animated.Text style={[mStyles.xpFloat, { opacity: xpOpacity, transform: [{ translateY: xpAnim }] }]}>
                +{earnedXP} XP
              </Animated.Text>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* ── ADD GOAL SHEET ────────────────────────────────────── */}
      <Modal visible={showAddGoal} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddGoal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={mStyles.root}>
            <View style={mStyles.handle} />
            <View style={mStyles.sheetHeader}>
              <Text style={mStyles.sheetTitle}>New Goal</Text>
              <TouchableOpacity onPress={() => setShowAddGoal(false)} style={mStyles.closeBtn}>
                <Text style={mStyles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={mStyles.section}>
              <Text style={mStyles.inputLabel}>EMOJI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mStyles.emojiRow}>
                {['🎯','🏠','🚗','✈️','🎓','💍','🏖️','💰','📈','🛡','🎮','👶'].map(e => (
                  <TouchableOpacity key={e} style={[mStyles.emojiBtn, newGoalEmoji === e && mStyles.emojiBtnActive]} onPress={() => setNewGoalEmoji(e)}>
                    <Text style={mStyles.emojiTxt}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={mStyles.section}>
              <Text style={mStyles.inputLabel}>GOAL NAME</Text>
              <TextInput
                style={mStyles.fullInput}
                placeholder="e.g. Emergency Fund"
                placeholderTextColor={COLORS.textMuted}
                value={newGoalName}
                onChangeText={setNewGoalName}
                // @ts-ignore
                outlineStyle="none"
              />
            </View>

            <View style={mStyles.section}>
              <Text style={mStyles.inputLabel}>TARGET AMOUNT</Text>
              <View style={mStyles.inputRow}>
                <Text style={mStyles.inputPrefix}>$</Text>
                <TextInput
                  style={mStyles.input}
                  placeholder="10,000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={newGoalTarget}
                  onChangeText={setNewGoalTarget}
                  // @ts-ignore
                  outlineStyle="none"
                />
              </View>
            </View>

            <View style={mStyles.section}>
              <TouchableOpacity style={mStyles.createBtn} onPress={handleCreateGoal} activeOpacity={0.85}>
                <Text style={mStyles.createBtnTxt}>Create Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CHALLENGE DETAIL SHEET ────────────────────────────── */}
      <Modal visible={!!selectedChallenge} transparent animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedChallenge(null)}>
        {selectedChallenge && (
          <View style={mStyles.root}>
            <View style={mStyles.handle} />
            <View style={mStyles.sheetHeader}>
              <Text style={mStyles.sheetEmoji}>{selectedChallenge.icon}</Text>
              <View style={mStyles.sheetTitleWrap}>
                <Text style={mStyles.sheetTitle}>{selectedChallenge.title}</Text>
                <Text style={mStyles.sheetSub}>{selectedChallenge.description}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedChallenge(null)} style={mStyles.closeBtn}>
                <Text style={mStyles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={mStyles.section}>
              <View style={mStyles.rewardRow}>
                <View style={mStyles.rewardBadge}>
                  <Text style={mStyles.rewardTxt}>+{selectedChallenge.reward} pts on completion</Text>
                </View>
              </View>
              <View style={mStyles.progressRow}>
                <Text style={mStyles.progressAmt}>{selectedChallenge.progress}</Text>
                <Text style={mStyles.progressOf}>of {selectedChallenge.target}</Text>
              </View>
              <View style={mStyles.track}>
                <View style={[mStyles.fill, {
                  width: `${Math.round((selectedChallenge.progress / selectedChallenge.target) * 100)}%` as any,
                  backgroundColor: selectedChallenge.completed ? '#7EB8A4' : COLORS.gold,
                }]} />
              </View>
            </View>

            {challengeComplete ? (
              <View style={mStyles.completeCard}>
                <Text style={mStyles.completeEmoji}>🏆</Text>
                <Text style={mStyles.completeTitle}>Challenge Complete!</Text>
                <Text style={mStyles.completeSub}>+{selectedChallenge.reward} pts added to your Vault score.</Text>
              </View>
            ) : (
              <View style={mStyles.section}>
                <TouchableOpacity style={mStyles.logProgressBtn} onPress={handleLogChallengeProgress} activeOpacity={0.85}>
                  <Text style={mStyles.logProgressTxt}>Log Progress  +1</Text>
                </TouchableOpacity>
                <Text style={mStyles.challengeHint}>Each tap logs one unit of progress toward your goal.</Text>
              </View>
            )}

            <Animated.Text style={[mStyles.xpFloat, { opacity: xpOpacity, transform: [{ translateY: xpAnim }] }]}>
              +{earnedXP} XP
            </Animated.Text>
          </View>
        )}
      </Modal>

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

  liveDataBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 7,
    backgroundColor: 'rgba(126,184,164,0.1)',
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(126,184,164,0.3)',
    alignSelf: 'flex-start',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7EB8A4' },
  liveDataTxt: { fontSize: FONTS.sizes.xs, color: '#7EB8A4', fontWeight: FONTS.weights.medium },
  estimatedBadge: {
    paddingHorizontal: SPACING.md, paddingVertical: 7,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.gold + '40',
    alignSelf: 'flex-start',
  },
  estimatedTxt: { fontSize: FONTS.sizes.xs, color: COLORS.goldDark, fontWeight: FONTS.weights.medium },
  recapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  recapBannerLeft: { gap: 3 },
  recapBannerEye: {
    fontSize: 9,
    color: COLORS.gold,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.widest,
  },
  recapBannerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.background,
    letterSpacing: FONTS.tracking.tight,
  },
  recapBannerArrow: { fontSize: FONTS.sizes.lg, color: COLORS.gold },

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

  weeklyChallengeDone: { borderColor: '#7EB8A4' + '40', backgroundColor: 'rgba(126,184,164,0.04)' },
  wRewardDone: { backgroundColor: 'rgba(126,184,164,0.15)', borderColor: '#7EB8A4' + '40' },
  wRewardTxtDone: { color: '#7EB8A4' },
  tapHint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide, marginTop: 2 },
});

const mStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: 'auto',
    paddingBottom: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: SPACING.md, marginBottom: SPACING.sm },

  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  sheetEmoji: { fontSize: 32 },
  sheetTitleWrap: { flex: 1, gap: 3 },
  sheetTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: -0.5 },
  sheetSub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  closeTxt: { fontSize: 12, color: COLORS.textDim, fontWeight: FONTS.weights.bold },

  section: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, gap: SPACING.md },
  inputLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },

  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
  progressAmt: { fontSize: 36, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: -1 },
  progressOf: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },

  track: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },

  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, paddingLeft: SPACING.md, overflow: 'hidden' },
  inputPrefix: { fontSize: FONTS.sizes.lg, color: COLORS.textDim, fontWeight: FONTS.weights.semibold },
  input: { flex: 1, fontSize: FONTS.sizes.lg, color: COLORS.text, paddingVertical: 12, paddingHorizontal: SPACING.sm },
  logBtn: { paddingHorizontal: SPACING.lg, paddingVertical: 14 },
  logBtnTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: '#FFF', letterSpacing: 0.3 },

  quickAmts: { flexDirection: 'row', gap: SPACING.sm },
  quickAmt: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  quickAmtTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.gold },

  completeCard: { margin: SPACING.lg, padding: SPACING.xl, backgroundColor: 'rgba(126,184,164,0.12)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: '#7EB8A4' + '40', alignItems: 'center', gap: SPACING.sm },
  completeEmoji: { fontSize: 48 },
  completeTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text },
  completeSub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center' },

  xpFloat: { position: 'absolute', top: 80, alignSelf: 'center', fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.heavy, color: COLORS.gold, letterSpacing: 0.5 },

  // Add goal
  emojiRow: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  emojiBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  emojiBtnActive: { borderColor: COLORS.gold, backgroundColor: COLORS.goldGlow },
  emojiTxt: { fontSize: 22 },
  fullInput: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, padding: SPACING.md, fontSize: FONTS.sizes.md, color: COLORS.text },
  createBtn: { backgroundColor: COLORS.text, borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center' },
  createBtnTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.background, letterSpacing: 0.3 },

  // Challenge
  rewardRow: { alignItems: 'flex-start' },
  rewardBadge: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: COLORS.goldGlow, borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.gold + '40' },
  rewardTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.goldDark, letterSpacing: 0.3 },
  logProgressBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center' },
  logProgressTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#FFF', letterSpacing: 0.3 },
  challengeHint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center', letterSpacing: 0.3 },
});

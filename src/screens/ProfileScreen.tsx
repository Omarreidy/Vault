import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Share, Animated, Modal } from 'react-native';
import SettingsScreen from './SettingsScreen';
import ConciergeScreen from './ConciergeScreen';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MOCK_USER } from '../services/mockData';
import { useUserName } from '../services/onboarding';
import TierBadge from '../components/TierBadge';
import AchievementBadge from '../components/AchievementBadge';
import WealthIdentityCard from '../components/WealthIdentityCard';
import WealthWrapped from '../components/WealthWrapped';
import ReferralCard from '../components/ReferralCard';
import WinShareModal from '../components/WinShareModal';
import UpgradeScreen from './UpgradeScreen';
import { COLORS, FONTS, SPACING, TIERS, RADIUS, CARD_SHADOW, CARD_SHADOW_STRONG } from '../constants/theme';
import { WealthWin } from '../types';
import { LEADERBOARD, LEADERBOARD_STATS, FRIENDS_LEADERBOARD, FRIENDS_STATS, FriendEntry } from '../services/leaderboard';
import { ACHIEVEMENTS } from '../services/achievements';

const TABS = ['Profile', 'Leaderboard', 'Wins', 'Invite', 'Card'] as const;
type Tab = typeof TABS[number];

function WinCard({ win, onSharePress }: { win: WealthWin; onSharePress: (win: WealthWin) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: false }),
    ]).start(() => onSharePress(win));
  };
  return (
    <Animated.View style={[wStyles.card, CARD_SHADOW, { shadowOpacity: 0.08, transform: [{ scale }] }]}>
      <View style={wStyles.top}>
        <Text style={wStyles.date}>{win.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</Text>
        <TouchableOpacity style={wStyles.shareBtn} onPress={onShare} activeOpacity={0.7}>
          <Text style={wStyles.shareTxt}>SHARE ↗</Text>
        </TouchableOpacity>
      </View>
      <Text style={wStyles.title}>{win.title}</Text>
      <Text style={wStyles.sub}>{win.subtitle}</Text>
      <Text style={wStyles.value}>{win.value}</Text>
    </Animated.View>
  );
}

const wStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, padding: SPACING.lg, gap: 8 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  shareBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.background, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, borderRadius: RADIUS.sm },
  shareTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },
  title: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  sub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim },
  value: { fontFamily: FONTS.display, fontSize: 42, fontWeight: FONTS.weights.light, color: COLORS.gold, letterSpacing: -1, marginTop: 4 },
});

interface ProfileProps { onResetOnboarding?: () => void; }

export default function ProfileScreen({ onResetOnboarding }: ProfileProps = {}) {
  const { tier, score, streakDays, wins, joinedAt } = MOCK_USER;
  const name = useUserName(MOCK_USER.name);
  const info = TIERS[tier];
  const months = Math.max(1, Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [shareWin, setShareWin] = useState<WealthWin | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showConcierge, setShowConcierge] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [lbView, setLbView] = useState<'global' | 'friends'>('global');
  const friendsFlash = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (lbView === 'friends') return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(friendsFlash, { toValue: 0.3, duration: 700, useNativeDriver: false }),
      Animated.timing(friendsFlash, { toValue: 1,   duration: 700, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [lbView]);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [showWrapped, setShowWrapped] = useState(false);

  // Flashing "CARD" tab indicator
  const flashOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (activeTab === 'Card') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 0.25, duration: 600, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [activeTab]);

  // Card reveal animation
  const cardScale   = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const burstScale  = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  const triggerCardReveal = () => {
    // Two-hit haptic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 100);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 220);

    // Burst flash then card springs in
    burstScale.setValue(0.4);
    burstOpacity.setValue(1);
    cardScale.setValue(0);
    cardOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(burstScale,   { toValue: 2.2,  duration: 380, useNativeDriver: true }),
      Animated.timing(burstOpacity, { toValue: 0,    duration: 380, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      setCardRevealed(true);
      Animated.parallel([
        Animated.spring(cardScale,   { toValue: 1, useNativeDriver: true, tension: 70, friction: 7 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 180);
  };
  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <SafeAreaView style={styles.container}>
      <WinShareModal win={shareWin} visible={!!shareWin} onClose={() => setShareWin(null)} />
      <WealthWrapped visible={showWrapped} onClose={() => setShowWrapped(false)} />
      <UpgradeScreen visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
        <SettingsScreen onClose={() => setShowSettings(false)} onResetOnboarding={onResetOnboarding} />
      </Modal>
      <Modal visible={showConcierge} animationType="slide" presentationStyle="pageSheet">
        <ConciergeScreen onClose={() => setShowConcierge(false)} />
      </Modal>

      {/* Top bar with settings icon */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setShowSettings(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Membership card — always visible */}
      <View style={[styles.memberCard, CARD_SHADOW_STRONG]}>
        <LinearGradient colors={[info.color + '00', info.color, info.color + '00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardTopLine} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopLeft}>
              <Text style={styles.cardLabel}>VAULT MEMBER</Text>
              <Text style={[styles.cardTierName, { color: info.color }]} numberOfLines={1} adjustsFontSizeToFit>{info.name}</Text>
            </View>
            <TierBadge tier={tier} size="lg" showLabel={false} />
          </View>
          <View style={styles.cardStatsRow}>
            {[{ v: score.total.toString(), l: 'SCORE' }, { v: `${score.percentile}%`, l: 'PCTILE' }, { v: `${streakDays}d`, l: 'STREAK' }, { v: `${months}mo`, l: 'MEMBER' }].map(({ v, l }, i) => (
              <React.Fragment key={l}>
                {i > 0 && <View style={styles.statDiv} />}
                <View style={styles.stat}>
                  <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
                  <Text style={styles.statLbl} numberOfLines={1}>{l}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>{name.toUpperCase()}</Text>
            <View style={styles.cardDot} />
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(tab => {
          const isCard = tab === 'Card';
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive, isCard && !isActive && styles.tabCard]}
              onPress={() => {
                if (isCard && !isActive) {
                  setActiveTab('Card');
                  setCardRevealed(false);
                  triggerCardReveal();
                } else {
                  setActiveTab(tab);
                }
              }}
              activeOpacity={0.7}
            >
              {isCard && !isActive ? (
                <Animated.Text style={[styles.tabTxt, styles.tabCardTxt, { opacity: flashOpacity }]}>
                  Card
                </Animated.Text>
              ) : (
                <Text style={[styles.tabTxt, isActive && styles.tabTxtActive]}>{tab}</Text>
              )}
              {isCard && !isActive && (
                <Animated.View style={[styles.cardDotIndicator, { opacity: flashOpacity }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* PROFILE TAB */}
        {activeTab === 'Profile' && (
          <>
            <View style={styles.grid}>
              {[
                { icon: '◈', label: 'Savings',    value: `${score.savings}/100`    },
                { icon: '◉', label: 'Investment', value: `${score.investment}/100` },
                { icon: '◇', label: 'Debt',       value: `${score.debt}/100`       },
                { icon: '○', label: 'Spending',   value: `${score.spending}/100`   },
              ].map(item => (
                <View key={item.label} style={[styles.gridItem, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
                  <Text style={styles.gridIcon}>{item.icon}</Text>
                  <Text style={styles.gridVal}>{item.value}</Text>
                  <Text style={styles.gridLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionLabel}>RECENT ACHIEVEMENTS</Text>
            <View style={styles.recentAchieve}>
              {ACHIEVEMENTS.filter(a => a.unlocked).slice(0, 4).map(a => (
                <AchievementBadge key={a.id} achievement={a} size="sm" />
              ))}
            </View>
            <TouchableOpacity onPress={() => setActiveTab('Wins')} activeOpacity={0.7}>
              <View style={[styles.viewAllBtn, CARD_SHADOW, { shadowOpacity: 0.06 }]}>
                <Text style={styles.viewAllTxt}>View all {unlockedCount} achievements →</Text>
              </View>
            </TouchableOpacity>

            {/* Concierge entry */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShowConcierge(true);
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.conciergeCard, CARD_SHADOW, { shadowOpacity: 0.09 }]}>
                <View style={styles.conciergeLeft}>
                  <View style={styles.conciergeIcon}>
                    <Text style={styles.conciergeIconTxt}>◈</Text>
                  </View>
                  <View>
                    <Text style={styles.conciergeTitle}>VAULT Concierge</Text>
                    <Text style={styles.conciergeSub}>Your private AI wealth advisor · Ask anything</Text>
                  </View>
                </View>
                <Text style={styles.conciergeArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'Leaderboard' && (
          <>
            {/* Global / Friends toggle */}
            <View style={styles.lbToggleRow}>
              <TouchableOpacity
                style={[styles.lbToggleBtn, lbView === 'global' && styles.lbToggleBtnActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setLbView('global'); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.lbToggleTxt, lbView === 'global' && styles.lbToggleTxtActive]}>Global</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lbToggleBtn, lbView === 'friends' && styles.lbToggleBtnActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setLbView('friends'); }}
                activeOpacity={0.8}
              >
                <Animated.Text style={[styles.lbToggleTxt, lbView === 'friends' && styles.lbToggleTxtActive, lbView !== 'friends' && { opacity: friendsFlash }]}>
                  Friends
                </Animated.Text>
                {lbView !== 'friends' && (
                  <Animated.View style={[styles.friendsDot, { opacity: friendsFlash }]} />
                )}
              </TouchableOpacity>
            </View>

            {/* ── GLOBAL VIEW ── */}
            {lbView === 'global' && (
              <>
                <View style={[styles.lbHeader, CARD_SHADOW, { shadowOpacity: 0.08 }]}>
                  <View style={styles.lbStat}><Text style={styles.lbStatVal} numberOfLines={1} adjustsFontSizeToFit>#{LEADERBOARD_STATS.userRank}</Text><Text style={styles.lbStatLbl} numberOfLines={1}>YOUR RANK</Text></View>
                  <View style={styles.lbStatDiv} />
                  <View style={styles.lbStat}><Text style={styles.lbStatVal} numberOfLines={1} adjustsFontSizeToFit>{LEADERBOARD_STATS.totalMembers.toLocaleString()}</Text><Text style={styles.lbStatLbl} numberOfLines={1}>MEMBERS</Text></View>
                  <View style={styles.lbStatDiv} />
                  <View style={styles.lbStat}><Text style={styles.lbStatVal} numberOfLines={1} adjustsFontSizeToFit>Top {LEADERBOARD_STATS.topPercent}%</Text><Text style={styles.lbStatLbl} numberOfLines={1}>THIS WEEK</Text></View>
                </View>
                <Text style={styles.sectionLabel}>THIS WEEK · {tier.toUpperCase()} TIER</Text>
                <View style={styles.lbList}>
                  {LEADERBOARD.map((entry, i) => (
                    <React.Fragment key={entry.rank}>
                      {i === 4 && LEADERBOARD[5]?.isMe && <Text style={styles.lbEllipsis}>· · ·</Text>}
                      <View style={[styles.lbRow, entry.isMe && styles.lbRowMe, CARD_SHADOW, { shadowOpacity: 0.06 }]}>
                        <Text style={[styles.lbRank, entry.rank <= 3 && { color: COLORS.gold }]}>
                          {entry.rank <= 3 ? ['◆','◆','◆'][entry.rank - 1] : `#${entry.rank}`}
                        </Text>
                        <View style={[styles.lbAvatar, entry.isMe && { borderColor: COLORS.gold + '60' }]}>
                          <Text style={[styles.lbInitials, entry.isMe && { color: COLORS.gold }]}>{entry.initials}</Text>
                        </View>
                        <View style={styles.lbInfo}>
                          <Text style={[styles.lbName, entry.isMe && { color: COLORS.gold }]}>{entry.isMe ? 'You' : entry.initials}</Text>
                          <Text style={styles.lbTier}>{entry.tier} tier</Text>
                        </View>
                        <View style={styles.lbRight}>
                          <Text style={styles.lbScore}>{entry.score}</Text>
                          <Text style={[styles.lbChange, { color: entry.weeklyChange > 0 ? COLORS.goldDark : COLORS.red }]}>+{entry.weeklyChange}</Text>
                        </View>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
                <Text style={styles.lbFooter}>Rankings update weekly · Monday midnight</Text>
              </>
            )}

            {/* ── FRIENDS VIEW ── */}
            {lbView === 'friends' && (
              <>
                {/* FOMO header — you're 24pts from moving up */}
                <View style={[styles.fomoCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
                  <Text style={styles.fomoEye}>THIS WEEK</Text>
                  <Text style={styles.fomoTitle}>
                    You're <Text style={styles.fomoHighlight}>{FRIENDS_STATS.pointsBehind} pts</Text> behind {FRIENDS_STATS.closestAbove}
                  </Text>
                  <Text style={styles.fomoSub}>Complete 2 moves today to take #{FRIENDS_STATS.yourRank - 1}</Text>
                </View>

                <Text style={styles.sectionLabel}>YOUR CIRCLE · {FRIENDS_LEADERBOARD.length} FRIENDS</Text>
                <View style={styles.lbList}>
                  {FRIENDS_LEADERBOARD.map((entry: FriendEntry) => (
                    <View key={entry.rank} style={[
                      styles.lbRow,
                      entry.isMe && styles.lbRowMe,
                      CARD_SHADOW, { shadowOpacity: 0.06 },
                    ]}>
                      <Text style={[styles.lbRank, entry.rank <= 3 && { color: COLORS.gold }]}>
                        {entry.rank <= 3 ? ['◆','◆','◆'][entry.rank - 1] : `#${entry.rank}`}
                      </Text>
                      <View style={[styles.lbAvatar, entry.isMe && { borderColor: COLORS.gold + '60' }]}>
                        <Text style={[styles.lbInitials, entry.isMe && { color: COLORS.gold }]}>{entry.initials}</Text>
                      </View>
                      <View style={styles.lbInfo}>
                        <Text style={[styles.lbName, entry.isMe && { color: COLORS.gold }]}>{entry.name}</Text>
                        <View style={styles.friendMeta}>
                          <Text style={styles.lbTier}>{entry.tier}</Text>
                          {entry.streak > 0 && (
                            <Text style={styles.friendStreak}>🔥 {entry.streak}d</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.lbRight}>
                        <Text style={styles.lbScore}>{entry.score}</Text>
                        <Text style={[styles.lbChange, { color: COLORS.goldDark }]}>+{entry.weeklyChange}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Invite CTA */}
                <TouchableOpacity
                  style={styles.inviteBtn}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})}
                  activeOpacity={0.85}
                >
                  <Text style={styles.inviteIcon}>+</Text>
                  <View>
                    <Text style={styles.inviteTxt}>Invite a friend to VAULT</Text>
                    <Text style={styles.inviteSub}>You both get +50 XP when they join</Text>
                  </View>
                </TouchableOpacity>

                <Text style={styles.lbFooter}>Friend rankings update daily · Scores are real</Text>
              </>
            )}
          </>
        )}

        {/* INVITE TAB */}
        {activeTab === 'Invite' && (
          <>
            <View style={styles.tabIntro}>
              <Text style={styles.tabIntroTitle}>Build Your Cohort</Text>
              <Text style={styles.tabIntroSub}>Invite people at your financial stage. You both grow faster.</Text>
            </View>
            <ReferralCard />
          </>
        )}

        {/* CARD TAB */}
        {activeTab === 'Card' && (
          <View style={styles.cardTab}>
            {/* Burst flash */}
            <Animated.View
              style={[styles.burst, { transform: [{ scale: burstScale }], opacity: burstOpacity }]}
              pointerEvents="none"
            />
            {/* Card springs in */}
            {cardRevealed && (
              <Animated.View style={{ opacity: cardOpacity, transform: [{ scale: cardScale }], alignItems: 'center', gap: SPACING.lg }}>
                <WealthIdentityCard
                  name={name}
                  tier={tier}
                  score={score.total}
                  percentile={score.percentile}
                  streakDays={streakDays}
                  actionsCompleted={7}
                  memberSince={joinedAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
                />
                <TouchableOpacity
                  style={styles.recapBtn}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setShowWrapped(true); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.recapBtnEye}>MAY 2026</Text>
                  <Text style={styles.recapBtnTitle}>View Monthly Recap</Text>
                  <Text style={styles.recapBtnArrow}>→</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        )}

        {/* WINS TAB */}
        {activeTab === 'Wins' && (
          wins.length === 0 ? (
            <View style={[styles.noWins, CARD_SHADOW, { shadowOpacity: 0.06 }]}>
              <Text style={styles.noWinsTxt}>Your first win is one move away.</Text>
            </View>
          ) : (
            <View style={styles.wins}>
              {wins.map(w => <WinCard key={w.id} win={w} onSharePress={setShareWin} />)}
            </View>
          )
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  topBarTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  settingsBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  settingsIcon: { fontSize: 16, color: COLORS.textDim },
  scroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },

  memberCard: { backgroundColor: COLORS.card, marginHorizontal: SPACING.lg, marginTop: SPACING.md, borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, overflow: 'hidden' },
  cardTopLine: { height: 1.5 },
  cardBody: { padding: SPACING.lg, gap: SPACING.lg },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTopLeft: { flex: 1, marginRight: SPACING.md },
  cardLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest, marginBottom: 4 },
  cardTierName: { fontFamily: FONTS.display, fontSize: 32, fontWeight: FONTS.weights.light, letterSpacing: FONTS.tracking.wide },
  cardStatsRow: { flexDirection: 'row', paddingTop: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontFamily: FONTS.display, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.light, color: COLORS.text },
  statLbl: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 0.4 },
  statDiv: { width: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  cardName: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest * 2 },
  cardDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold },

  tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  tabActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  tabTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, fontWeight: FONTS.weights.medium, letterSpacing: FONTS.tracking.wide },
  tabTxtActive: { color: COLORS.background },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  gridItem: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, padding: SPACING.md, gap: 4, width: '47.5%' },
  gridIcon: { fontFamily: FONTS.display, fontSize: 18, color: COLORS.gold, marginBottom: 4 },
  gridVal: { fontFamily: FONTS.display, fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.light, color: COLORS.text },
  gridLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },

  sectionLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest, fontWeight: FONTS.weights.medium },
  recentAchieve: { flexDirection: 'row', gap: SPACING.sm },
  viewAllBtn: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center' },
  viewAllTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },

  lbHeader: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, flexDirection: 'row', padding: SPACING.md },
  lbStat: { flex: 1, alignItems: 'center', gap: 3 },
  lbStatDiv: { width: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  lbStatVal: { fontFamily: FONTS.display, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.light, color: COLORS.text },
  lbStatLbl: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 0.5, textAlign: 'center' },

  lbToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: 3,
    marginBottom: SPACING.md,
    alignSelf: 'center',
  },
  lbToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  lbToggleBtnActive: { backgroundColor: COLORS.text },
  lbToggleTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, fontWeight: FONTS.weights.medium },
  lbToggleTxtActive: { color: COLORS.background, fontWeight: FONTS.weights.bold },
  friendsDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.gold,
  },

  fomoCard: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
    padding: SPACING.md,
    gap: 5,
    marginBottom: SPACING.md,
  },
  fomoEye: { fontSize: 9, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest, fontWeight: FONTS.weights.bold },
  fomoTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  fomoHighlight: { color: COLORS.goldDark },
  fomoSub: { fontSize: FONTS.sizes.xs, color: COLORS.textDim },

  friendMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  friendStreak: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },

  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  inviteIcon: { fontSize: 22, color: COLORS.gold, fontWeight: FONTS.weights.light, width: 36, textAlign: 'center' },
  inviteTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  inviteSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },

  lbList: { gap: SPACING.sm },
  lbEllipsis: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONTS.sizes.lg, letterSpacing: 6, paddingVertical: SPACING.xs },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  lbRowMe: { borderColor: COLORS.gold + '40', backgroundColor: COLORS.goldGlow },
  lbRank: { width: 28, fontSize: FONTS.sizes.sm, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, textAlign: 'center' },
  lbAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.sheetBg, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  lbInitials: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },
  lbInfo: { flex: 1, gap: 2 },
  lbName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  lbTier: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  lbRight: { alignItems: 'flex-end', gap: 2 },
  lbScore: { fontFamily: FONTS.display, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.light, color: COLORS.text },
  lbChange: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },
  lbFooter: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center', letterSpacing: FONTS.tracking.wide },

  wins: { gap: SPACING.md },
  noWins: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, padding: SPACING.xl, alignItems: 'center' },
  noWinsTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim },

  tabCard: { borderColor: COLORS.gold + '70', backgroundColor: COLORS.goldGlow },
  tabCardTxt: { color: COLORS.goldDark, fontWeight: FONTS.weights.bold },
  cardDotIndicator: {
    position: 'absolute', top: 4, right: 4,
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: COLORS.gold,
  },

  cardTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    minHeight: 400,
  },
  burst: {
    position: 'absolute',
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.goldGlow,
    alignSelf: 'center',
  },
  recapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '50',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    width: '100%',
  },
  recapBtnEye: {
    fontSize: 9,
    color: COLORS.gold,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.widest,
  },
  recapBtnTitle: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  recapBtnArrow: { fontSize: FONTS.sizes.md, color: COLORS.gold },

  tabIntro: { gap: 4, marginBottom: SPACING.sm },
  tabIntroTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  tabIntroSub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim },

  conciergeCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '35',
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conciergeLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  conciergeIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.goldGlow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
  },
  conciergeIconTxt: { fontSize: 18, color: COLORS.gold },
  conciergeTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  conciergeSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2, letterSpacing: 0.2 },
  conciergeArrow: { fontSize: FONTS.sizes.lg, color: COLORS.gold },
});

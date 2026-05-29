import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Share, Animated, Modal } from 'react-native';
import SettingsScreen from './SettingsScreen';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MOCK_USER } from '../services/mockData';
import TierBadge from '../components/TierBadge';
import AchievementBadge from '../components/AchievementBadge';
import WinShareModal from '../components/WinShareModal';
import { COLORS, FONTS, SPACING, TIERS, RADIUS, CARD_SHADOW, CARD_SHADOW_STRONG } from '../constants/theme';
import { WealthWin } from '../types';
import { LEADERBOARD, LEADERBOARD_STATS } from '../services/leaderboard';
import { ACHIEVEMENTS } from '../services/achievements';

const TABS = ['Profile', 'Leaderboard', 'Wins'] as const;
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

export default function ProfileScreen() {
  const { name, tier, score, streakDays, wins, joinedAt } = MOCK_USER;
  const info = TIERS[tier];
  const months = Math.max(1, Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [shareWin, setShareWin] = useState<WealthWin | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <SafeAreaView style={styles.container}>
      <WinShareModal win={shareWin} visible={!!shareWin} onClose={() => setShareWin(null)} />
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
        <SettingsScreen onClose={() => setShowSettings(false)} />
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
            <View>
              <Text style={styles.cardLabel}>VAULT MEMBER</Text>
              <Text style={[styles.cardTierName, { color: info.color }]}>{info.name}</Text>
            </View>
            <TierBadge tier={tier} size="lg" showLabel={false} />
          </View>
          <View style={styles.cardStatsRow}>
            {[{ v: score.total.toString(), l: 'VELOCITY' }, { v: `${score.percentile}%`, l: 'PERCENTILE' }, { v: `${streakDays}d`, l: 'STREAK' }, { v: `${months}mo`, l: 'MEMBER' }].map(({ v, l }, i) => (
              <React.Fragment key={l}>
                {i > 0 && <View style={styles.statDiv} />}
                <View style={styles.stat}><Text style={styles.statVal}>{v}</Text><Text style={styles.statLbl}>{l}</Text></View>
              </React.Fragment>
            ))}
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardName}>{name.toUpperCase()}</Text>
            <View style={styles.cardDot} />
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
            <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
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
          </>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'Leaderboard' && (
          <>
            <View style={[styles.lbHeader, CARD_SHADOW, { shadowOpacity: 0.08 }]}>
              <View style={styles.lbStat}><Text style={styles.lbStatVal}>#{LEADERBOARD_STATS.userRank}</Text><Text style={styles.lbStatLbl}>YOUR RANK</Text></View>
              <View style={styles.lbStatDiv} />
              <View style={styles.lbStat}><Text style={styles.lbStatVal}>{LEADERBOARD_STATS.totalMembers.toLocaleString()}</Text><Text style={styles.lbStatLbl}>GOLD MEMBERS</Text></View>
              <View style={styles.lbStatDiv} />
              <View style={styles.lbStat}><Text style={styles.lbStatVal}>Top {LEADERBOARD_STATS.topPercent}%</Text><Text style={styles.lbStatLbl}>THIS WEEK</Text></View>
            </View>

            <Text style={styles.sectionLabel}>THIS WEEK · GOLD TIER</Text>
            <View style={styles.lbList}>
              {LEADERBOARD.map((entry, i) => {
                const showEllipsis = i === 4 && !LEADERBOARD[i + 1]?.isMe;
                return (
                  <React.Fragment key={entry.rank}>
                    {i === 4 && LEADERBOARD[5]?.isMe && (
                      <Text style={styles.lbEllipsis}>· · ·</Text>
                    )}
                    <View style={[
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
                        <Text style={[styles.lbName, entry.isMe && { color: COLORS.gold }]}>
                          {entry.isMe ? 'You' : entry.initials}
                        </Text>
                        <Text style={styles.lbTier}>{entry.tier} tier</Text>
                      </View>
                      <View style={styles.lbRight}>
                        <Text style={styles.lbScore}>{entry.score}</Text>
                        <Text style={[styles.lbChange, { color: entry.weeklyChange > 0 ? COLORS.green : COLORS.red }]}>
                          +{entry.weeklyChange}
                        </Text>
                      </View>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
            <Text style={styles.lbFooter}>Rankings update weekly · Monday midnight</Text>
          </>
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
  cardLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest, marginBottom: 4 },
  cardTierName: { fontFamily: FONTS.display, fontSize: 36, fontWeight: FONTS.weights.light, letterSpacing: FONTS.tracking.wide },
  cardStatsRow: { flexDirection: 'row', paddingTop: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontFamily: FONTS.display, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.light, color: COLORS.text },
  statLbl: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
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
  lbStatVal: { fontFamily: FONTS.display, fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.light, color: COLORS.text },
  lbStatLbl: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest, textAlign: 'center' },

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
});

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import * as Haptics from 'expo-haptics';

import { buildFeed, fetchPersonalizedMoves, FeedItem } from '../services/feed';
import { ALL_MOVES } from '../services/mockData';
import { INSIGHTS, Insight } from '../services/insights';
import { useRealProfile } from '../services/userProfile';
import { WealthMove, WealthWin } from '../types';

import FeedMoveCard from '../components/FeedMoveCard';
import FeedPulseCard from '../components/FeedPulseCard';
import FeedWinCard from '../components/FeedWinCard';
import BeliefsAuditCard from '../components/BeliefsAuditCard';
import CohortActivityFeed from '../components/CohortActivityFeed';
import CohortReactionOverlay from '../components/CohortReactionOverlay';
import FinancialScanner from '../components/FinancialScanner';
import ConciergeScreen from './ConciergeScreen';
import TierBadge from '../components/TierBadge';
import NotificationsScreen from './NotificationsScreen';
import PlaidNudge from '../components/PlaidNudge';
import PlaidLinkScreen from './PlaidLinkScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { updateStreak } from '../services/streak';

import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const DEFAULT_FEED = buildFeed(ALL_MOVES, INSIGHTS, []);

const REWARD_MESSAGES = [
  'Smart move.',
  'Building momentum.',
  "That's how wealth is built.",
  "You're ahead of 71% today.",
  'Your future self thanks you.',
  'Elite habit.',
  'One step closer.',
  'Compounding starts now.',
];

// Variable reward — unpredictable XP keeps users coming back
const XP_POOL = [15, 20, 25, 30, 40, 47, 55, 60, 75];
const pickXP  = () => XP_POOL[Math.floor(Math.random() * XP_POOL.length)];
const pickMsg = () => REWARD_MESSAGES[Math.floor(Math.random() * REWARD_MESSAGES.length)];

function EndOfFeedCard({ streakDays, onBackToTop }: { streakDays: number; onBackToTop: () => void }) {
  const scale   = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: false, tension: 60, friction: 9 }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <View style={eofStyles.root}>
      <Animated.View style={[eofStyles.inner, { opacity, transform: [{ scale }] }]}>
        <Text style={eofStyles.mark}>VAULT</Text>
        <Text style={eofStyles.title}>You're all caught up.</Text>
        <Text style={eofStyles.sub}>
          New moves drop daily. Come back tomorrow{'\n'}to keep your {streakDays}-day streak alive.
        </Text>
        <View style={eofStyles.streakRow}>
          <Text style={eofStyles.streakEmoji}>🔥</Text>
          <Text style={eofStyles.streakTxt}>{streakDays} day streak · Keep it going</Text>
        </View>
        <TouchableOpacity style={eofStyles.btn} onPress={onBackToTop} activeOpacity={0.85}>
          <Text style={eofStyles.btnTxt}>↑  Back to top</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const eofStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#08080C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  inner: { alignItems: 'center', gap: SPACING.lg },
  mark: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gold,
    letterSpacing: FONTS.tracking.widest * 2,
    fontWeight: FONTS.weights.semibold,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 36,
    fontWeight: FONTS.weights.light,
    color: '#F2EFE9',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  sub: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(242,239,233,0.45)',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: FONTS.tracking.wide,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.25)',
    backgroundColor: 'rgba(201,169,110,0.08)',
  },
  streakEmoji: { fontSize: 16 },
  streakTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gold,
    fontWeight: FONTS.weights.medium,
    letterSpacing: FONTS.tracking.wide,
  },
  btn: {
    marginTop: SPACING.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(242,239,233,0.15)',
  },
  btnTxt: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(242,239,233,0.6)',
    letterSpacing: FONTS.tracking.wide,
  },
});

export default function HomeScreen() {
  const realProfile = useRealProfile();
  const userName = realProfile.name;
  const [feedTab, setFeedTab] = useState<'foryou' | 'cohort'>('foryou');
  const [totalXP, setTotalXP]       = useState(0);
  const [actedCount, setActedCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showCohortReaction, setShowCohortReaction] = useState(false);
  const [completedMoveTitle, setCompletedMoveTitle] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showConcierge, setShowConcierge] = useState(false);
  const [showPlaidNudge, setShowPlaidNudge] = useState(false);
  const [showPlaid, setShowPlaid] = useState(false);
  const [plaidConnected, setPlaidConnected] = useState(false);

  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>(DEFAULT_FEED);
  const [streakDays, setStreakDays] = useState(0);

  // Check if Plaid already connected + whether to show nudge + get member count
  useEffect(() => {
    updateStreak().then(setStreakDays);
    AsyncStorage.getItem('@vault_plaid_connected').then(val => {
      if (val === 'true') setPlaidConnected(true);
    });
    AsyncStorage.getItem('@vault_plaid_nudge_dismissed').then(val => {
      if (val === 'true') setShowPlaidNudge(false);
    });
    supabase.from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('onboarding_complete', true)
      .then(({ count }) => { if (count) setMemberCount(count); });

    // Try to load personalized moves from Plaid
    fetchPersonalizedMoves().then(personalizedMoves => {
      if (personalizedMoves && personalizedMoves.length > 0) {
        // Prepend personalized moves to the feed
        const personalizedFeed = buildFeed(
          [...personalizedMoves, ...ALL_MOVES],
          INSIGHTS,
          [],
        );
        setFeed(personalizedFeed);
      }
    });
  }, []);
  const [notifCount, setNotifCount] = useState(0);
  const [itemHeight, setItemHeight] = useState(Dimensions.get('window').height);

  // Reward toast state
  const [rewardXP,  setRewardXP]  = useState(0);
  const [rewardMsg, setRewardMsg] = useState('');
  const toastOpacity  = useRef(new Animated.Value(0)).current;
  const toastScale    = useRef(new Animated.Value(0.88)).current;
  const toastY        = useRef(new Animated.Value(16)).current;
  const xpNumScale    = useRef(new Animated.Value(1)).current;

  // Feed navigation
  const flatListRef      = useRef<FlatList>(null);
  const currentIndexRef  = useRef(0);
  const isAnimating      = useRef(false);

  const itemHeightRef = useRef(Dimensions.get('window').height);

  const scrollToNext = useCallback(() => {
    const next = currentIndexRef.current + 1;
    if (next <= feed.length) {
      currentIndexRef.current = next; // update immediately — don't wait for viewable callback
      flatListRef.current?.scrollToOffset({
        offset: itemHeightRef.current * next,
        animated: true,
      });
    }
  }, []);

  const showReward = useCallback((xp: number, msg: string, moveTitle: string) => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    setRewardXP(xp);
    setRewardMsg(msg);

    toastOpacity.setValue(0);
    toastScale.setValue(0.88);
    toastY.setValue(16);

    Animated.sequence([
      // Pop in
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(toastScale,   { toValue: 1, useNativeDriver: true, tension: 260, friction: 12 }),
        Animated.timing(toastY,       { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
      // XP number pulse
      Animated.sequence([
        Animated.timing(xpNumScale, { toValue: 1.15, duration: 120, useNativeDriver: true }),
        Animated.timing(xpNumScale, { toValue: 1,    duration: 120, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      // Fade out
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      isAnimating.current = false;
      setCompletedMoveTitle(moveTitle);
      setShowCohortReaction(true);
    });
  }, []);

  const handleAct = useCallback((moveTitle: string) => {
    const xp  = pickXP();
    const msg = pickMsg();
    const newCount = actedCount + 1;
    setActedCount(newCount);
    setTotalXP(prev => prev + xp);
    // Show Plaid nudge after 3rd move if not connected and not dismissed
    if (newCount === 3 && !plaidConnected) {
      AsyncStorage.getItem('@vault_plaid_nudge_dismissed').then(val => {
        if (val !== 'true') setShowPlaidNudge(true);
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 80);
    showReward(xp, msg, moveTitle);
  }, [showReward]);

  const handleSkip = useCallback(() => {
    if (isAnimating.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    isAnimating.current = true;
    scrollToNext();
    setTimeout(() => { isAnimating.current = false; }, 500);
  }, [scrollToNext]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      currentIndexRef.current = viewableItems[0].index;
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderItem = useCallback(({ item, index }: { item: FeedItem; index: number }) => (
    <View style={{ height: itemHeight, width: '100%' }}>
      {item.type === 'move' && (
        <FeedMoveCard
          move={item.data as WealthMove}
          onAct={() => handleAct((item.data as WealthMove).title)}
          onSkip={handleSkip}
          onAskConcierge={() => setShowConcierge(true)}
          index={index}
          total={feed.length}
        />
      )}
      {item.type === 'pulse' && (
        <FeedPulseCard
          insight={item.data as Insight}
          onSave={handleSave}
          onAskConcierge={() => setShowConcierge(true)}
          index={index}
          total={feed.length}
        />
      )}
      {item.type === 'win' && (
        <FeedWinCard
          win={item.data as WealthWin}
          onAskConcierge={() => setShowConcierge(true)}
          index={index}
          total={feed.length}
        />
      )}
      {item.type === 'beliefs' && (
        <BeliefsAuditCard
          index={index}
          total={feed.length}
          onComplete={scrollToNext}
        />
      )}
    </View>
  ), [itemHeight, handleAct, handleSkip, handleSave]);

  return (
    <View style={styles.root}>

      {/* Header — normal flow, feed sits below it */}
      <SafeAreaView style={styles.headerArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>GOOD MORNING</Text>
            <Text style={styles.name}>{userName}</Text>
            {memberCount !== null && memberCount > 1 && (
              <Text style={styles.memberBadge}>◆ {memberCount.toLocaleString()} members building wealth</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {totalXP > 0 && (
              <View style={styles.xpChip}>
                <Text style={styles.xpTxt}>+{totalXP} XP</Text>
              </View>
            )}
            <TierBadge tier={realProfile.tier} size="sm" showLabel={false} />
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setShowScanner(true);
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.scanIcon}>◎</Text>
              <Text style={styles.scanLabel}>SCAN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShowNotifs(true);
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.bellIcon}>◎</Text>
              {notifCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{notifCount > 9 ? '9+' : notifCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Feed toggle + Ask button */}
        <View style={styles.toggleRow}>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, feedTab === 'foryou' && styles.toggleBtnActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setFeedTab('foryou'); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleTxt, feedTab === 'foryou' && styles.toggleTxtActive]}>For You</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, feedTab === 'cohort' && styles.toggleBtnActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setFeedTab('cohort'); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleTxt, feedTab === 'cohort' && styles.toggleTxtActive]}>Cohort</Text>
              {feedTab !== 'cohort' && <View style={styles.cohortDot} />}
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>

      {/* Feed — fills remaining space */}
      <View
        style={styles.feedContainer}
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          setItemHeight(h);
          itemHeightRef.current = h;
        }}
      >
        {feedTab === 'foryou' ? (
          <FlatList
            ref={flatListRef}
            data={feed}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: itemHeightRef.current,
              offset: itemHeightRef.current * index,
              index,
            })}
            windowSize={7}
            maxToRenderPerBatch={5}
            initialNumToRender={4}
            ListFooterComponent={
              <View style={{ height: itemHeight, width: '100%' }}>
                <EndOfFeedCard
                  streakDays={streakDays}
                  onBackToTop={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                />
              </View>
            }
          />
        ) : (
          <CohortActivityFeed />
        )}
      </View>

      {/* Reward toast */}
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: toastOpacity,
            transform: [{ scale: toastScale }, { translateY: toastY }],
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.toastInner}>
          <Animated.Text style={[styles.toastXP, { transform: [{ scale: xpNumScale }] }]}>
            +{rewardXP} XP
          </Animated.Text>
          <View style={styles.toastDivider} />
          <Text style={styles.toastMsg}>{rewardMsg}</Text>
        </View>
      </Animated.View>

      {showPlaidNudge && !plaidConnected && (
        <PlaidNudge
          trigger="moves"
          movesCompleted={actedCount}
          onConnect={() => { setShowPlaidNudge(false); setShowPlaid(true); }}
          onDismiss={() => {
            setShowPlaidNudge(false);
            AsyncStorage.setItem('@vault_plaid_nudge_dismissed', 'true');
          }}
        />
      )}

      <PlaidLinkScreen
        visible={showPlaid}
        onClose={() => setShowPlaid(false)}
        onSuccess={() => {
          setShowPlaid(false);
          setPlaidConnected(true);
          AsyncStorage.setItem('@vault_plaid_connected', 'true');
        }}
      />

      <FinancialScanner visible={showScanner} onClose={() => setShowScanner(false)} />

      <Modal visible={showConcierge} animationType="slide" presentationStyle="pageSheet">
        <ConciergeScreen onClose={() => setShowConcierge(false)} />
      </Modal>

      <CohortReactionOverlay
        visible={showCohortReaction}
        moveTitle={completedMoveTitle}
        onDismiss={() => {
          setShowCohortReaction(false);
          scrollToNext();
        }}
      />

      <Modal visible={showNotifs} animationType="slide" presentationStyle="pageSheet">
        <NotificationsScreen onClose={() => { setShowNotifs(false); setNotifCount(0); }} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  feedContainer: { flex: 1 },

  headerArea: {
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  greeting: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
    marginBottom: 2,
  },
  name: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  memberBadge: {
    fontSize: 9,
    color: COLORS.goldDark,
    letterSpacing: FONTS.tracking.wide,
    marginTop: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },

  xpChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '50',
  },
  xpTxt: { fontSize: FONTS.sizes.xs, color: COLORS.goldDark, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.wide },

  streakChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  streakTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textSub, letterSpacing: FONTS.tracking.wide },

  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '50',
  },
  askIcon: { fontSize: 12, color: COLORS.gold },
  askTxt: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.background,
    letterSpacing: 0.3,
  },

  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.full,
  },
  scanIcon: { fontSize: 12, color: COLORS.gold },
  scanLabel: { fontSize: 9, fontWeight: FONTS.weights.heavy, color: COLORS.background, letterSpacing: 1.2 },

  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    position: 'relative',
  },
  bellIcon: { fontSize: 15, color: COLORS.textDim },
  badge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: COLORS.background,
  },
  badgeTxt: { fontSize: 8, fontWeight: FONTS.weights.heavy, color: COLORS.background },

  toggleRow: {
    alignItems: 'center',
    paddingBottom: SPACING.sm,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: 3,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  toggleBtnActive: { backgroundColor: COLORS.text },
  toggleTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    fontWeight: FONTS.weights.medium,
    letterSpacing: FONTS.tracking.wide,
  },
  toggleTxtActive: { color: COLORS.background, fontWeight: FONTS.weights.bold },
  cohortDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.gold,
  },

  // Reward toast
  toast: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 20,
    alignItems: 'center',
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
    ...CARD_SHADOW,
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  toastXP: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.heavy,
    color: COLORS.gold,
    letterSpacing: FONTS.tracking.tight,
    fontFamily: FONTS.display,
  },
  toastDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.border,
  },
  toastMsg: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSub,
    letterSpacing: FONTS.tracking.wide,
    fontWeight: FONTS.weights.medium,
  },
});

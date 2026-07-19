import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { buildFeed, composeFeed, fetchPersonalizedMoves, FeedItem } from '../services/feed';
import { track, EVENTS } from '../services/analytics';
import { ALL_MOVES } from '../services/mockData';
import { INSIGHTS, Insight, fetchLiveInsights } from '../services/insights';
import { useRealProfile } from '../services/userProfile';
import { WealthMove, WealthWin } from '../types';

import FeedMoveCard from '../components/FeedMoveCard';
import FeedConnectCard from '../components/FeedConnectCard';
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
import { postActivity, fetchMemberCount } from '../services/cohort';
import { getStreak, recordActionStreak } from '../services/streak';
import { recordMove, loadStats, recordDailyScore, dailyDelta, weeklyVelocityGain } from '../services/progressStats';
import { xpForMove, DAILY_MOVES_TARGET } from '../services/ritual';
import { fetchLiveScore, fetchProfileScore } from '../services/velocity';
import { syncWeeklyRecap } from '../services/push';
import DailyBriefCard from '../components/DailyBriefCard';
import VaultClosedCelebration from '../components/VaultClosedCelebration';
import { usePlaid } from '../context/PlaidContext';
import { getUnreadCount } from '../services/notifications';
import { navigateToTab } from '../navigation/navigationRef';

import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

// Optimistic default while Plaid state loads: no connect card yet (it appears
// once we know the user isn't connected), beliefs audit already demoted.
const DEFAULT_FEED = composeFeed(buildFeed(ALL_MOVES, INSIGHTS, []), null, true);

// XP amounts are deterministic (services/ritual.ts) — only the flavor text rotates.
const REWARD_MESSAGES = [
  'Smart move.',
  'Building momentum.',
  "That's how wealth is built.",
  'Your future self thanks you.',
  'Elite habit.',
  'One step closer.',
  'Compounding starts now.',
];

const pickMsg = () => REWARD_MESSAGES[Math.floor(Math.random() * REWARD_MESSAGES.length)];

function EndOfFeedCard({ streakDays, onBackToTop }: { streakDays: number; onBackToTop: () => void }) {
  const scale   = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={eofStyles.root}>
      <Animated.View style={[eofStyles.inner, { opacity, transform: [{ scale }] }]}>
        <Text style={eofStyles.mark}>VAULT</Text>
        <Text style={eofStyles.title}>You're all caught up.</Text>
        <Text style={eofStyles.sub}>
          {streakDays > 0
            ? `New moves drop daily. Come back tomorrow\nto keep your ${streakDays}-day streak alive.`
            : 'New moves drop daily. Complete one move\nto start your streak.'}
        </Text>
        <View style={eofStyles.streakRow}>
          <Text style={eofStyles.streakEmoji}>🔥</Text>
          <Text style={eofStyles.streakTxt}>
            {streakDays > 0 ? `${streakDays} day streak · Keep it going` : 'Start your streak today'}
          </Text>
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

// Greeting that tracks the time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const realProfile = useRealProfile();
  const userName = realProfile.name;
  const { plaidConnected, plaidReady, hardRefresh: refreshPlaid } = usePlaid();
  const [feedTab, setFeedTab] = useState<'foryou' | 'cohort'>('foryou');
  const [totalXP, setTotalXP]       = useState(0);
  const [actedCount, setActedCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showCohortReaction, setShowCohortReaction] = useState(false);
  const [completedMoveTitle, setCompletedMoveTitle] = useState('');
  const [cohortActivityId, setCohortActivityId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showConcierge, setShowConcierge] = useState(false);
  const [conciergePrompt, setConciergePrompt] = useState('');
  const [showPlaidNudge, setShowPlaidNudge] = useState(false);
  const [showPlaid, setShowPlaid] = useState(false);

  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>(DEFAULT_FEED);
  const [streakDays, setStreakDays] = useState(0);

  // Daily Open brief state: today's moves so far (persisted) + velocity delta.
  const [movesTodayBase, setMovesTodayBase] = useState(0);
  const [briefDelta, setBriefDelta] = useState<number | null>(null);
  const [briefScore, setBriefScore] = useState<number | null>(null);
  const [briefSource, setBriefSource] = useState<'live' | 'estimated' | null>(null);
  // XP earned today (persisted total + this session's), for the closing celebration.
  const [xpToday, setXpToday] = useState(0);

  // The dopamine hit: shown once, right after the cohort reaction, the moment
  // the 3rd move of the day lands. Queued via the ref below so it never stacks
  // on top of the (also full-screen) cohort reaction overlay.
  const [showVaultClosed, setShowVaultClosed] = useState(false);
  const [closedStreakDays, setClosedStreakDays] = useState(0);
  const [closedXpToday, setClosedXpToday] = useState(0);
  const pendingVaultClosed = useRef<{ streak: number; xpToday: number } | null>(null);

  // Which feed variant the user last saw — so feed_composed fires once per
  // variant change, not on every recomposition.
  const feedVariantRef = useRef<string | null>(null);
  // Drops out-of-order fetch resolutions when connection state changes mid-flight.
  const feedRequestRef = useRef(0);

  const loadPersonalizedFeed = useCallback((connected: boolean) => {
    const requestId = ++feedRequestRef.current;
    // Live market news backs the pulse cards; the evergreen set is the
    // no-network fallback — never fake timestamps in the feed.
    Promise.all([
      fetchPersonalizedMoves(),
      fetchLiveInsights().catch(() => null),
    ]).then(([personalizedMoves, liveInsights]) => {
      if (requestId !== feedRequestRef.current) return;
      const next = composeFeed(
        buildFeed(ALL_MOVES, liveInsights ?? INSIGHTS, []), personalizedMoves, connected);
      setFeed(next);
      const variant = personalizedMoves && personalizedMoves.length > 0
        ? 'personalized' : connected ? 'default' : 'connect';
      if (feedVariantRef.current !== variant) {
        feedVariantRef.current = variant;
        track(EVENTS.FEED_COMPOSED, { variant, items: next.length });
      }
    });
  }, []);

  // Initial load: streak (read-only — actions extend it, not opens), lifetime
  // XP, today's move count, nudge dismissed flag, member count.
  useEffect(() => {
    getStreak().then(setStreakDays);
    loadStats().then(stats => {
      setTotalXP(stats.xpTotal);
      setMovesTodayBase(stats.movesActedToday);
      setXpToday(stats.xpToday);
    });
    getUnreadCount().then(setNotifCount).catch(() => {});
    AsyncStorage.getItem('@vault_plaid_nudge_dismissed').then(val => {
      if (val === 'true') setShowPlaidNudge(false);
    });
    // profiles RLS only exposes the caller's own row — the total member
    // count comes from the member_count security-definer RPC instead.
    fetchMemberCount().then(count => { if (count) setMemberCount(count); });
  }, []);

  // Daily Open: fetch today's velocity score, record it as today's snapshot,
  // compute the delta vs yesterday, and refresh the weekly recap push with
  // current numbers. Live score first; onboarding estimate as fallback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let source: 'live' | 'estimated' = 'live';
        let s = await fetchLiveScore();
        if (!s) { s = await fetchProfileScore(); source = 'estimated'; }
        if (!s || cancelled) return;
        const stats = await recordDailyScore(s.total);
        if (cancelled) return;
        setBriefScore(s.total);
        setBriefSource(source);
        setBriefDelta(dailyDelta(stats, s.total));
        syncWeeklyRecap(weeklyVelocityGain(stats, s.total)).catch(() => {});
      } catch {
        // brief shows its syncing state; non-fatal
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reload personalized feed whenever Plaid connection status changes.
  // Waits for the context's first load so a connected user never sees the
  // connect-to-unlock card flash in (and the list never re-anchors mid-view).
  useEffect(() => {
    if (!plaidReady) return;
    loadPersonalizedFeed(plaidConnected);
  }, [plaidReady, plaidConnected, loadPersonalizedFeed]);
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
  // Keep a ref to the feed length so scrollToNext and handleAct always see
  // the latest value without needing to be re-created on every feed update.
  const feedLengthRef = useRef(feed.length);
  useEffect(() => { feedLengthRef.current = feed.length; }, [feed]);

  const scrollToNext = useCallback(() => {
    const next = currentIndexRef.current + 1;
    if (next <= feedLengthRef.current) {
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

  const handleAct = useCallback((move: WealthMove, index: number) => {
    // Guard against double-fire from rapid taps
    if (isAnimating.current) return;
    const moveTitle = move.title;
    const xp = xpForMove(move); // deterministic: effort + personalized bonus
    const newCount = actedCount + 1;
    const movesToday = movesTodayBase + newCount;
    const closedNow = movesToday === DAILY_MOVES_TARGET;
    const newXpToday = xpToday + xp;
    const msg = closedNow ? 'Vault closed for today ✓' : pickMsg();
    setActedCount(newCount);
    setTotalXP(prev => prev + xp);
    setXpToday(newXpToday);
    track(EVENTS.MOVE_ACTED, {
      move_id: move.id, personalized: !!move.personalized, index, xp, moves_today: movesToday,
    });
    // Streaks reward action: the first completed move of the day extends it.
    recordActionStreak().then(({ streak, extended }) => {
      setStreakDays(streak);
      if (extended) track(EVENTS.STREAK_EXTENDED, { streak });
      // The dopamine hit — queued behind the cohort reaction (below) so the
      // two full-screen overlays never stack; fires with the just-computed
      // final streak so the celebration never underclaims it.
      if (closedNow) {
        track(EVENTS.VAULT_CLOSED, { moves_today: movesToday, xp_today: newXpToday, streak });
        pendingVaultClosed.current = { streak, xpToday: newXpToday };
      }
    }).catch(() => {});
    // Durably record the move so Challenges + Achievements reflect real activity.
    recordMove(xp).catch(() => {});
    // Share it with the cohort so other members can see and react; the id
    // lets the reaction overlay persist the user's own reaction.
    setCohortActivityId(null);
    postActivity('move_complete', `Completed "${moveTitle}"`, undefined, xp)
      .then(setCohortActivityId)
      .catch(() => {});
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
  }, [showReward, actedCount, movesTodayBase, xpToday, plaidConnected]);

  const handleSkip = useCallback((move?: WealthMove, index?: number) => {
    if (isAnimating.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    isAnimating.current = true;
    if (move) {
      track(EVENTS.MOVE_SKIPPED, { move_id: move.id, personalized: !!move.personalized, index });
    }
    scrollToNext();
    setTimeout(() => { isAnimating.current = false; }, 500);
  }, [scrollToNext]);

  const handleSave = useCallback((insightId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Persist the saved toggle into the feed array so the card keeps its state
    // even if it unmounts and remounts due to windowing (scrolling far away).
    setFeed(prev => prev.map(item => {
      if (item.type === 'pulse' && (item.data as Insight).id === insightId) {
        return { ...item, data: { ...(item.data as Insight), saved: !(item.data as Insight).saved } };
      }
      return item;
    }));
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      currentIndexRef.current = viewableItems[0].index;
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // Browser scroll anchoring keeps the OLD first card in view when the
  // composed feed prepends the #1 move, silently landing the user on card 2.
  // Layout effect = snap back to the opener before paint (no flash) — but
  // never yank a user who has already started browsing.
  useLayoutEffect(() => {
    if (currentIndexRef.current === 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [feed]);

  const feedLength = feed.length;

  const renderItem = useCallback(({ item, index }: { item: FeedItem; index: number }) => (
    <View style={{ height: itemHeight, width: '100%' }}>
      {item.type === 'brief' && (
        <DailyBriefCard
          delta={briefDelta}
          scoreTotal={briefScore}
          scoreSource={briefSource}
          streakDays={streakDays}
          movesToday={movesTodayBase + actedCount}
          onStart={scrollToNext}
          index={index}
          total={feedLength}
        />
      )}
      {item.type === 'move' && (
        <FeedMoveCard
          move={item.data as WealthMove}
          onAct={() => handleAct(item.data as WealthMove, index)}
          onSkip={() => handleSkip(item.data as WealthMove, index)}
          onAskConcierge={() => {
            setConciergePrompt(`Tell me more about this WealthMove: "${(item.data as WealthMove).title}"`);
            setShowConcierge(true);
          }}
          index={index}
          total={feedLength}
        />
      )}
      {item.type === 'pulse' && (
        <FeedPulseCard
          insight={item.data as Insight}
          onSave={() => handleSave((item.data as Insight).id)}
          onAskConcierge={() => { setConciergePrompt(''); setShowConcierge(true); }}
          index={index}
          total={feedLength}
        />
      )}
      {item.type === 'win' && (
        <FeedWinCard
          win={item.data as WealthWin}
          onAskConcierge={() => { setConciergePrompt(''); setShowConcierge(true); }}
          index={index}
          total={feedLength}
        />
      )}
      {item.type === 'beliefs' && (
        <BeliefsAuditCard
          index={index}
          total={feedLength}
          onComplete={scrollToNext}
        />
      )}
      {item.type === 'connect' && (
        <FeedConnectCard
          index={index}
          total={feedLength}
          onConnect={() => setShowPlaid(true)}
          onSkip={() => handleSkip()}
        />
      )}
    </View>
  ), [itemHeight, handleAct, handleSkip, handleSave, feedLength, scrollToNext,
      briefDelta, briefScore, briefSource, streakDays, movesTodayBase, actedCount]);

  return (
    <View style={styles.root}>

      {/* Header — normal flow, feed sits below it */}
      <SafeAreaView style={styles.headerArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{userName}</Text>
            {memberCount !== null && memberCount > 1 && (
              <Text style={styles.memberBadge}>◆ {memberCount.toLocaleString()} members building wealth</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {totalXP > 0 && (
              <View style={styles.xpChip}>
                <Text style={styles.xpTxt}>{totalXP.toLocaleString()} XP</Text>
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
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Open financial scanner"
            >
              <Text style={styles.scanIcon}>◎</Text>
              <Text style={styles.scanLabel}>SCAN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                track(EVENTS.NOTIF_CENTER_OPENED, { unread: notifCount });
                setShowNotifs(true);
              }}
              activeOpacity={0.75}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={notifCount > 0 ? `Open notifications, ${notifCount} unread` : 'Open notifications'}
            >
              <Text style={styles.bellIcon}>◌</Text>
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
              accessibilityRole="button"
              accessibilityState={{ selected: feedTab === 'foryou' }}
              accessibilityLabel="Show For You feed"
            >
              <Text style={[styles.toggleTxt, feedTab === 'foryou' && styles.toggleTxtActive]}>For You</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, feedTab === 'cohort' && styles.toggleBtnActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setFeedTab('cohort'); }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: feedTab === 'cohort' }}
              accessibilityLabel="Show Cohort feed"
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
            bottom: SPACING.xl + insets.bottom + 68,
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
          track(EVENTS.PLAID_LINK_SUCCEEDED, { source: 'home_feed' });
          refreshPlaid();
        }}
      />

      <FinancialScanner visible={showScanner} onClose={() => setShowScanner(false)} />

      <Modal visible={showConcierge} animationType="slide" presentationStyle="pageSheet">
        <ConciergeScreen onClose={() => setShowConcierge(false)} initialPrompt={conciergePrompt} />
      </Modal>

      <CohortReactionOverlay
        visible={showCohortReaction}
        moveTitle={completedMoveTitle}
        activityId={cohortActivityId}
        memberCount={memberCount}
        onDismiss={() => {
          setShowCohortReaction(false);
          if (pendingVaultClosed.current) {
            const { streak, xpToday: xp } = pendingVaultClosed.current;
            pendingVaultClosed.current = null;
            setClosedStreakDays(streak);
            setClosedXpToday(xp);
            setShowVaultClosed(true);
          } else {
            scrollToNext();
          }
        }}
      />

      <VaultClosedCelebration
        visible={showVaultClosed}
        streakDays={closedStreakDays}
        xpToday={closedXpToday}
        onClose={() => {
          setShowVaultClosed(false);
          scrollToNext();
        }}
      />

      <Modal visible={showNotifs} animationType="slide" presentationStyle="pageSheet">
        <NotificationsScreen
          onClose={() => { setShowNotifs(false); getUnreadCount().then(setNotifCount).catch(() => {}); }}
          onNavigate={tab => {
            setShowNotifs(false);
            getUnreadCount().then(setNotifCount).catch(() => {});
            // Home lives on the Feed tab — only jump when the story is elsewhere.
            if (tab !== 'Feed') navigateToTab(tab);
          }}
        />
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
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
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
    backgroundColor: COLORS.goldGlow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold + '55',
    position: 'relative',
  },
  bellIcon: { fontSize: 16, color: COLORS.goldDark },
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
    paddingBottom: SPACING.md,
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

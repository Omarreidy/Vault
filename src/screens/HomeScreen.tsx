import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  Dimensions, SafeAreaView, TouchableOpacity, ScrollView, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MOCK_MOVES, MOCK_USER } from '../services/mockData';
import { DAILY_CHALLENGES, Challenge } from '../services/challenges';
import { MOCK_NOTIFICATIONS } from '../services/notifications';
import { WealthMove } from '../types';
import WealthCard from '../components/WealthCard';
import TierBadge from '../components/TierBadge';
import ChallengeCard from '../components/ChallengeCard';
import NotificationsScreen from './NotificationsScreen';
import MoveLibraryScreen from './MoveLibraryScreen';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const CARD_W = Math.min(width - SPACING.xl * 2, 420);

export default function HomeScreen() {
  const [moves] = useState<WealthMove[]>(MOCK_MOVES);
  const [accepted, setAccepted] = useState(0);
  const [totalImpact, setTotalImpact] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [challenges, setChallenges] = useState<Challenge[]>(DAILY_CHALLENGES);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [notifCount, setNotifCount] = useState(MOCK_NOTIFICATIONS.filter(n => !n.read).length);
  const position = useRef(new Animated.ValueXY()).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  const completedChallenges = challenges.filter(c => c.completed).length;
  const totalChallenges = challenges.length;

  const completeChallenge = (id: string) => {
    setChallenges(prev => prev.map(c =>
      c.id === id ? { ...c, completed: true, progress: c.target } : c
    ));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  React.useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const rotate = position.x.interpolate({ inputRange: [-width / 2, 0, width / 2], outputRange: ['-5deg', '0deg', '5deg'], extrapolate: 'clamp' });
  const acceptOpacity = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOpacity   = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const liftScale     = position.x.interpolate({ inputRange: [-width / 2, 0, width / 2], outputRange: [0.97, 1.02, 0.97], extrapolate: 'clamp' });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy * 0.1 }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD)       swipeRight();
      else if (g.dx < -SWIPE_THRESHOLD) swipeLeft();
      else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false, tension: 60, friction: 9 }).start();
    },
  });

  const swipeRight = () => {
    const move = moves[currentIndex];
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.timing(position, { toValue: { x: width + 120, y: -40 }, duration: 280, useNativeDriver: false }).start(() => {
      setAccepted(a => a + 1);
      setTotalImpact(t => t + move.impactValue);
      setCurrentIndex(i => i + 1);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const swipeLeft = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(position, { toValue: { x: -width - 120, y: -40 }, duration: 280, useNativeDriver: false }).start(() => {
      setCurrentIndex(i => i + 1);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const currentMove = moves[currentIndex];
  const remaining = moves.length - currentIndex;

  return (
    <SafeAreaView style={styles.container}>

      {/* Hero header */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <View>
          <Text style={styles.eyebrow}>GOOD MORNING</Text>
          <Text style={styles.name}>{MOCK_USER.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.streakChip}>
            <Text style={styles.streakTxt}>🔥 {MOCK_USER.streakDays}d</Text>
          </View>
          <TierBadge tier={MOCK_USER.tier} size="sm" showLabel={false} />
          {/* Bell */}
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
      </Animated.View>

      {/* Notifications modal */}
      <Modal visible={showNotifs} animationType="slide" presentationStyle="pageSheet">
        <NotificationsScreen onClose={() => { setShowNotifs(false); setNotifCount(0); }} />
      </Modal>

      {/* Move library modal */}
      <Modal visible={showLibrary} animationType="slide" presentationStyle="pageSheet">
        <MoveLibraryScreen onClose={() => setShowLibrary(false)} />
      </Modal>

      {/* Daily challenges strip */}
      <View style={styles.challengeSection}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeTitle}>Daily Challenges</Text>
          <Text style={styles.challengeCount}>{completedChallenges}/{totalChallenges} complete</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengeScroll}>
          {challenges.map(c => (
            <ChallengeCard key={c.id} challenge={c} onComplete={completeChallenge} />
          ))}
        </ScrollView>
      </View>

      {/* Impact bar */}
      {accepted > 0 && (
        <View style={styles.impactBar}>
          <Text style={styles.impactBarLeft}>{accepted} move{accepted !== 1 ? 's' : ''} taken today</Text>
          <Text style={styles.impactBarRight}>+${totalImpact.toLocaleString()} potential</Text>
        </View>
      )}

      {/* Card stack */}
      <View style={styles.cardArea}>
        {!currentMove ? (
          <View style={[styles.doneCard, CARD_SHADOW]}>
            <Text style={styles.doneMark}>◇</Text>
            <Text style={styles.doneTitle}>All Done</Text>
            <Text style={styles.doneSub}>New moves arrive tomorrow.{'\n'}Your streak is building.</Text>
            <TouchableOpacity
              style={styles.libraryBtn}
              onPress={() => setShowLibrary(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.libraryBtnTxt}>Browse all 25 moves →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.replayBtn} onPress={() => { setCurrentIndex(0); setAccepted(0); setTotalImpact(0); }}>
              <Text style={styles.replayTxt}>REPLAY TODAY</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* "DO IT" label */}
            <Animated.View style={[styles.labelWrap, styles.labelLeft, { opacity: acceptOpacity }]}>
              <Text style={[styles.labelTxt, { color: COLORS.green, borderColor: COLORS.green }]}>DO IT</Text>
            </Animated.View>
            <Animated.View style={[styles.labelWrap, styles.labelRight, { opacity: skipOpacity }]}>
              <Text style={[styles.labelTxt, { color: COLORS.textDim, borderColor: COLORS.border }]}>SKIP</Text>
            </Animated.View>

            {/* Stack shadows */}
            {remaining > 2 && (
              <View style={[styles.stackCard, { top: 28, width: CARD_W - 32, opacity: 0.25 }]} />
            )}
            {remaining > 1 && (
              <View style={[styles.stackCard, { top: 14, width: CARD_W - 16, opacity: 0.5 }]} />
            )}

            <Animated.View
              style={{ transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }, { scale: liftScale }] }}
              {...panResponder.panHandlers}
            >
              <WealthCard move={currentMove} onAccept={swipeRight} onSkip={swipeLeft} />
            </Animated.View>

            {/* Progress dots */}
            <View style={styles.dots}>
              {moves.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === currentIndex && styles.dotActive, i < currentIndex && styles.dotDone]}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  eyebrow: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest, marginBottom: 3 },
  name: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  streakChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...CARD_SHADOW,
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  streakTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textSub, letterSpacing: FONTS.tracking.wide },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    position: 'relative',
    ...CARD_SHADOW, shadowOpacity: 0.07, shadowRadius: 8,
  },
  bellIcon: { fontSize: 15, color: COLORS.textDim },
  badge: {
    position: 'absolute',
    top: -3, right: -3,
    minWidth: 16, height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  badgeTxt: { fontSize: 8, fontWeight: FONTS.weights.heavy, color: COLORS.background },

  impactBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.green + '10',
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.green + '30',
  },
  challengeSection: { gap: SPACING.sm, marginBottom: SPACING.sm },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg },
  challengeTitle: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.text, letterSpacing: FONTS.tracking.wide },
  challengeCount: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  challengeScroll: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },

  impactBarLeft: { fontSize: FONTS.sizes.sm, color: COLORS.textDim },
  impactBarRight: { fontSize: FONTS.sizes.sm, color: COLORS.green, fontWeight: FONTS.weights.semibold },

  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  labelWrap: { position: 'absolute', zIndex: 10, top: '12%' },
  labelLeft: { left: SPACING.lg },
  labelRight: { right: SPACING.lg },
  labelTxt: {
    fontSize: 11,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.widest,
    borderWidth: 1.5,
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  stackCard: {
    position: 'absolute',
    height: 340,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...CARD_SHADOW,
  },

  dots: { position: 'absolute', bottom: SPACING.xl, flexDirection: 'row', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.textMuted },
  dotActive: { backgroundColor: COLORS.gold, width: 18, borderRadius: 2.5 },
  dotDone: { backgroundColor: COLORS.green },

  doneCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    width: CARD_W,
  },
  doneMark: { fontFamily: FONTS.display, fontSize: 40, color: COLORS.gold },
  doneTitle: { fontFamily: FONTS.display, fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.light, color: COLORS.text, letterSpacing: FONTS.tracking.wide },
  doneSub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center', lineHeight: 20 },
  libraryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  libraryBtnTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.background, letterSpacing: FONTS.tracking.wide },
  replayBtn: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderMid,
  },
  replayTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, letterSpacing: FONTS.tracking.widest },
});

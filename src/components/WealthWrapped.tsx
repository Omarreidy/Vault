import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Modal, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const RECAP = {
  month:         'MAY 2026',
  scoreFrom:     600,
  scoreTo:       647,
  scoreDelta:    +47,
  networthDelta: 6200,
  moves:         8,
  percentile:    29,
  streak:        23,
  rankJump:      18,
  headline:      'Your best month yet.',
};

function formatK(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;
}

interface StatRowProps {
  label: string;
  value: string;
  sub?: string;
  delay: number;
  gold?: boolean;
}

function StatRow({ label, value, sub, delay, gold }: StatRowProps) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 420, delay, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.statRow, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statRight}>
        <Text style={[styles.statValue, gold && styles.statValueGold]}>{value}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function WealthWrapped({ visible, onClose }: Props) {
  const bgOpacity     = useRef(new Animated.Value(0)).current;
  const cardScale     = useRef(new Animated.Value(0.93)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide   = useRef(new Animated.Value(-20)).current;
  const shareOpacity  = useRef(new Animated.Value(0)).current;
  const shimmerX      = useRef(new Animated.Value(-width)).current;

  const [scoreDisplay, setScoreDisplay] = useState(RECAP.scoreFrom);
  const scoreAnim = useRef(new Animated.Value(RECAP.scoreFrom)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    bgOpacity.setValue(0);
    cardScale.setValue(0.93);
    cardOpacity.setValue(0);
    headerOpacity.setValue(0);
    headerSlide.setValue(-20);
    shareOpacity.setValue(0);
    shimmerX.setValue(-width);
    scoreAnim.setValue(RECAP.scoreFrom);
    setScoreDisplay(RECAP.scoreFrom);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Sequence
    Animated.parallel([
      Animated.timing(bgOpacity,   { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.spring(cardScale,   { toValue: 1, tension: 60, friction: 9, delay: 80, useNativeDriver: false }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 320, delay: 80, useNativeDriver: false }),
    ]).start(() => {
      // Header slides in
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 380, useNativeDriver: false }),
        Animated.timing(headerSlide,   { toValue: 0, duration: 380, useNativeDriver: false }),
      ]).start();

      // Score count-up
      const id = scoreAnim.addListener(({ value }) => setScoreDisplay(Math.round(value)));
      Animated.timing(scoreAnim, { toValue: RECAP.scoreTo, duration: 1400, delay: 300, useNativeDriver: false })
        .start(() => {
          scoreAnim.removeListener(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        });

      // Shimmer sweep
      Animated.loop(
        Animated.timing(shimmerX, { toValue: width * 2, duration: 2200, delay: 600, useNativeDriver: false }),
      ).start();

      // Share button
      Animated.timing(shareOpacity, { toValue: 1, duration: 500, delay: 2400, useNativeDriver: false }).start();
    });
  }, [visible]);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        message:
          `My VAULT ${RECAP.month} Recap\n\n` +
          `Wealth Velocity Score: ${RECAP.scoreTo} (+${RECAP.scoreDelta})\n` +
          `Net Worth Growth: +${formatK(RECAP.networthDelta)}\n` +
          `Moves Completed: ${RECAP.moves}\n` +
          `Top ${RECAP.percentile}% of wealth builders my age\n\n` +
          `Building with VAULT 🏛`,
      });
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: bgOpacity }]}>
        <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>

          {/* Dark background */}
          <LinearGradient
            colors={['#0C0B09', '#151210', '#0C0B09']}
            style={StyleSheet.absoluteFill}
          />

          {/* Shimmer sweep */}
          <Animated.View
            style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['transparent', 'rgba(201,169,110,0.07)', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ width: 120, height: '100%' }}
            />
          </Animated.View>

          {/* Gold top bar */}
          <LinearGradient
            colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.topBar}
          />

          <View style={styles.inner}>

            {/* Header */}
            <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}>
              <Text style={styles.eyebrow}>VAULT · WEALTH RECAP</Text>
              <Text style={styles.month}>{RECAP.month}</Text>
              <Text style={styles.headline}>{RECAP.headline}</Text>
            </Animated.View>

            {/* Score count-up */}
            <View style={styles.scoreBlock}>
              <Text style={styles.scoreNum}>{scoreDisplay}</Text>
              <View style={styles.scoreDeltaBadge}>
                <Text style={styles.scoreDeltaTxt}>+{RECAP.scoreDelta} pts</Text>
              </View>
              <Text style={styles.scoreLabel}>WEALTH VELOCITY SCORE</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Stats */}
            <View style={styles.stats}>
              <StatRow
                label="Net Worth Growth"
                value={`+${formatK(RECAP.networthDelta)}`}
                sub="this month"
                delay={600}
                gold
              />
              <StatRow
                label="Moves Completed"
                value={`${RECAP.moves} moves`}
                delay={800}
              />
              <StatRow
                label="Wealth Ranking"
                value={`Top ${RECAP.percentile}%`}
                sub="of your age group"
                delay={1000}
                gold
              />
              <StatRow
                label="Active Streak"
                value={`${RECAP.streak} days`}
                delay={1200}
              />
              <StatRow
                label="Rank Climbed"
                value={`↑ ${RECAP.rankJump} spots`}
                sub="on leaderboard"
                delay={1400}
              />
            </View>

            {/* Share + close */}
            <Animated.View style={[styles.actions, { opacity: shareOpacity }]}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                <LinearGradient
                  colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.shareBtnGrad}
                >
                  <Text style={styles.shareBtnTxt}>Share My Recap</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
                <Text style={styles.closeTxt}>Close</Text>
              </TouchableOpacity>
            </Animated.View>

          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.25)',
  },
  shimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 120,
    zIndex: 1,
  },
  topBar: { height: 3 },
  inner: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    gap: SPACING.lg,
    zIndex: 2,
  },

  header: { gap: 6 },
  eyebrow: {
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: FONTS.tracking.widest,
    fontWeight: FONTS.weights.semibold,
  },
  month: {
    fontFamily: FONTS.display,
    fontSize: 42,
    fontWeight: FONTS.weights.light,
    color: '#F2EFE9',
    letterSpacing: -1,
    lineHeight: 48,
  },
  headline: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(242,239,233,0.5)',
    letterSpacing: FONTS.tracking.wide,
  },

  scoreBlock: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  scoreNum: {
    fontFamily: FONTS.display,
    fontSize: 88,
    fontWeight: FONTS.weights.light,
    color: COLORS.gold,
    letterSpacing: -4,
    lineHeight: 96,
  },
  scoreDeltaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,169,110,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.35)',
  },
  scoreDeltaTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gold,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.wide,
  },
  scoreLabel: {
    fontSize: 9,
    color: 'rgba(242,239,233,0.4)',
    letterSpacing: FONTS.tracking.widest,
    fontWeight: FONTS.weights.semibold,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(201,169,110,0.2)',
  },

  stats: { gap: SPACING.md },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(242,239,233,0.45)',
    letterSpacing: FONTS.tracking.wide,
  },
  statRight: { alignItems: 'flex-end', gap: 1 },
  statValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: '#F2EFE9',
    letterSpacing: FONTS.tracking.tight,
  },
  statValueGold: { color: COLORS.gold },
  statSub: {
    fontSize: 9,
    color: 'rgba(242,239,233,0.3)',
    letterSpacing: FONTS.tracking.wide,
  },

  actions: { gap: SPACING.sm, paddingTop: SPACING.sm },
  shareBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  shareBtnGrad: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnTxt: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: '#08080C',
    letterSpacing: FONTS.tracking.wide,
  },
  closeBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  closeTxt: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(242,239,233,0.35)',
    letterSpacing: FONTS.tracking.wide,
  },
});

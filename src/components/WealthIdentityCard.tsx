import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, TIERS } from '../constants/theme';
import { TierName } from '../types';
import { computeTrajectory, DEFAULT_TRAJECTORY_INPUTS, TrajectoryInputs } from '../services/trajectory';
import { getTrajectoryInputs } from '../services/onboarding';

const { width } = Dimensions.get('window');
const CARD_W = Math.min(width - SPACING.lg * 2, 400);
const CARD_H = CARD_W * 0.588; // standard card ratio

// Per-tier card palette — each feels distinct and premium
const CARD_THEME: Record<TierName, {
  bg: string[];           // gradient stops
  text: string;
  textSub: string;
  chip: string;
  chipText: string;
  line: string;
  shimmer: string;
}> = {
  BRONZE: {
    bg: ['#2A1F14', '#3D2B18', '#2A1F14'],
    text: '#F0D9B5',
    textSub: '#A0845A',
    chip: 'rgba(155,106,47,0.35)',
    chipText: '#D4A56A',
    line: '#9B6A2F',
    shimmer: 'rgba(155,106,47,0.12)',
  },
  SILVER: {
    bg: ['#1A1A22', '#2A2A38', '#1A1A22'],
    text: '#E8E8F0',
    textSub: '#8A8A9A',
    chip: 'rgba(138,138,154,0.3)',
    chipText: '#C8C8DA',
    line: '#8A8A9A',
    shimmer: 'rgba(200,200,220,0.08)',
  },
  GOLD: {
    bg: ['#1A1508', '#2A2210', '#1A1508'],
    text: '#F5E6C0',
    textSub: '#9A8040',
    chip: 'rgba(201,169,110,0.25)',
    chipText: '#C9A96E',
    line: '#C9A96E',
    shimmer: 'rgba(201,169,110,0.10)',
  },
  PLATINUM: {
    bg: ['#141420', '#1E1E30', '#141420'],
    text: '#E0E0F0',
    textSub: '#7A7A9A',
    chip: 'rgba(122,122,154,0.3)',
    chipText: '#AAAAC8',
    line: '#7A7A9A',
    shimmer: 'rgba(180,180,210,0.08)',
  },
  BLACK: {
    bg: ['#0A0A0A', '#141414', '#0A0A0A'],
    text: '#F0EEE8',
    textSub: '#666660',
    chip: 'rgba(255,255,255,0.08)',
    chipText: '#C9A96E',
    line: '#C9A96E',
    shimmer: 'rgba(255,255,255,0.04)',
  },
};

interface Props {
  name: string;
  tier: TierName;
  score: number;
  streakDays: number;
  actionsCompleted?: number;
  memberSince: string;
}

export default function WealthIdentityCard({
  name, tier, score, streakDays, actionsCompleted = 7, memberSince,
}: Props) {
  const theme = CARD_THEME[tier];
  const tierInfo = TIERS[tier];

  const [trajectoryInputs, setTrajectoryInputs] = React.useState<TrajectoryInputs>(DEFAULT_TRAJECTORY_INPUTS);
  React.useEffect(() => {
    getTrajectoryInputs().then(inputs => { if (inputs) setTrajectoryInputs(inputs); });
  }, []);

  const trajectory = computeTrajectory({ ...trajectoryInputs, actionsCompleted });

  const shimmerX = useRef(new Animated.Value(-CARD_W)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.spring(cardScale, {
      toValue: 1, useNativeDriver: true, tension: 55, friction: 9,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: CARD_W * 1.5,
          duration: 2800,
          useNativeDriver: true,
          delay: 1200,
        }),
        Animated.timing(shimmerX, {
          toValue: -CARD_W,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTimeout(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
    80);
    await Share.share({
      message:
        `VAULT ${tierInfo.name} Member\n` +
        `${name.toUpperCase()}\n\n` +
        `Wealth Velocity: ${score}/1000 · ${tierInfo.name} tier\n` +
        `Projected FI age: ${trajectory.fiAge} · ${trajectory.yearsToFI} years away\n` +
        `Streak: ${streakDays} days\n\n` +
        `Building wealth with VAULT →`,
    });
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: cardScale }] }]}>
      <LinearGradient
        colors={theme.bg as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Shimmer sweep */}
        <Animated.View
          style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', theme.shimmer, theme.shimmer, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerInner}
          />
        </Animated.View>

        {/* Top row — network mark + tier chip */}
        <View style={styles.topRow}>
          <View style={[styles.tierChip, { backgroundColor: theme.chip }]}>
            <View style={[styles.tierDot, { backgroundColor: tierInfo.color }]} />
            <Text style={[styles.tierChipTxt, { color: theme.chipText }]}>
              {tierInfo.name.toUpperCase()} MEMBER
            </Text>
          </View>
          <Text style={[styles.vaultMark, { color: theme.textSub }]}>VAULT</Text>
        </View>

        {/* Center — score + FI */}
        <View style={styles.centerRow}>
          <View>
            <Text style={[styles.scoreLabel, { color: theme.textSub }]}>WEALTH VELOCITY</Text>
            <Text style={[styles.scoreVal, { color: theme.text, fontFamily: FONTS.display }]}>
              {score}
            </Text>
          </View>
          <View style={[styles.dividerVert, { backgroundColor: theme.line + '50' }]} />
          <View>
            <Text style={[styles.scoreLabel, { color: theme.textSub }]}>PROJ. FI AGE</Text>
            <Text style={[styles.scoreVal, { color: theme.text, fontFamily: FONTS.display }]}>
              {trajectory.fiAge}
            </Text>
          </View>
          <View style={[styles.dividerVert, { backgroundColor: theme.line + '50' }]} />
          <View>
            <Text style={[styles.scoreLabel, { color: theme.textSub }]}>TIER</Text>
            <Text style={[styles.scoreVal, { color: theme.text, fontFamily: FONTS.display }]}>
              {tierInfo.name}
            </Text>
          </View>
        </View>

        {/* Bottom row — name + streak + accent line */}
        <View style={styles.bottomSection}>
          <View style={[styles.accentLine, { backgroundColor: tierInfo.color }]} />
          <View style={styles.bottomRow}>
            <View>
              <Text style={[styles.memberName, { color: theme.text }]}>
                {name.toUpperCase()}
              </Text>
              <Text style={[styles.memberSince, { color: theme.textSub }]}>
                MEMBER SINCE {memberSince}
              </Text>
            </View>
            <View style={[styles.streakBadge, { backgroundColor: theme.chip }]}>
              <Text style={[styles.streakTxt, { color: theme.chipText }]}>
                🔥 {streakDays}d
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Share button */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
        <Text style={styles.shareTxt}>Share this card ↑</Text>
      </TouchableOpacity>

      {/* Momentum callout — real streak, no invented population comparisons */}
      <View style={styles.callout}>
        <Text style={styles.calloutTxt}>
          ◆ {streakDays > 0 ? `${streakDays}-day move streak and climbing` : 'Momentum, measured from real moves'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: SPACING.md },

  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    padding: SPACING.md,
    justifyContent: 'space-between',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },

  shimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: CARD_W * 0.5,
  },
  shimmerInner: { flex: 1, width: '100%' },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  tierDot: { width: 5, height: 5, borderRadius: 2.5 },
  tierChipTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  vaultMark: { fontSize: 9, fontWeight: '700', letterSpacing: 3 },

  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    marginVertical: SPACING.sm,
  },
  dividerVert: { width: StyleSheet.hairlineWidth, height: 36 },
  scoreLabel: { fontSize: 7, letterSpacing: 1.5, marginBottom: 4, textAlign: 'center' },
  scoreVal: { fontSize: 28, fontWeight: '300', letterSpacing: -1, textAlign: 'center', lineHeight: 32 },

  bottomSection: { gap: 8 },
  accentLine: { height: 1, borderRadius: 1 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  memberName: { fontSize: 13, fontWeight: '600', letterSpacing: 2 },
  memberSince: { fontSize: 7, letterSpacing: 1.2, marginTop: 2 },
  streakBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  streakTxt: { fontSize: FONTS.sizes.xs, fontWeight: '600' },

  shareBtn: {
    paddingVertical: 13,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '60',
    backgroundColor: COLORS.goldGlow,
  },
  shareTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.goldDark,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  callout: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  calloutTxt: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.goldDark,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

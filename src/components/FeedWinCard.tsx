import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { WealthWin } from '../types';
import { COLORS, FONTS, SPACING, RADIUS, TIERS } from '../constants/theme';
import { useRealProfile } from '../services/userProfile';

const { width } = Dimensions.get('window');

const WIN_ACCENT: Record<string, string> = {
  savings:    COLORS.gold,
  tier:       COLORS.gold,
  debt:       COLORS.tierSilver,
  investment: COLORS.gold,
  default:    COLORS.gold,
};

interface Props {
  win: WealthWin;
  index: number;
  total: number;
}

export default function FeedWinCard({ win, index, total }: Props) {
  const { name, tier } = useRealProfile();
  const accent    = WIN_ACCENT[win.category] ?? WIN_ACCENT.default;
  const glowAnim  = useRef(new Animated.Value(0.4)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1400, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1400, useNativeDriver: false }),
      ])
    ).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.14] });

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await Share.share({
      message: `${win.title} — ${win.value}\n${win.subtitle}\n\nBuilding wealth with VAULT`,
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topAccent, { backgroundColor: accent }]} />
      <Animated.View style={[styles.glow, { backgroundColor: accent, opacity: glowOpacity }]} />
      <View style={styles.inner}>

        <View style={styles.topRow}>
          <View style={[styles.tag, { borderColor: accent + '50', backgroundColor: accent + '10' }]}>
            <Text style={[styles.tagTxt, { color: accent }]}>WEALTH WIN</Text>
          </View>
          <Text style={styles.counter}>{index + 1} / {total}</Text>
        </View>

        <Animated.View style={[styles.body, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.winLabel}>{win.subtitle}</Text>
          <Text style={styles.winTitle}>{win.title}</Text>
          <View style={[styles.valueLine, { backgroundColor: accent }]} />
          <Text style={[styles.winValue, { color: accent, fontFamily: FONTS.display }]}>{win.value}</Text>
          <Text style={styles.memberLine}>
            {name.toUpperCase()} · {TIERS[tier].name.toUpperCase()} MEMBER
          </Text>
        </Animated.View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.shareBtn, { borderColor: accent + '60' }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Text style={[styles.shareTxt, { color: accent }]}>Share this win ↑</Text>
          </TouchableOpacity>
          <Text style={styles.swipeHint}>↑ swipe for next</Text>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width, backgroundColor: COLORS.background, overflow: 'hidden' },
  topAccent: { height: 3 },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    top: '20%',
    width: 300,
    height: 300,
    borderRadius: 150,
  },

  inner: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 80,
    paddingBottom: SPACING.xl,
    justifyContent: 'space-between',
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  tagTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  counter: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },

  body: { alignItems: 'flex-start', gap: 14 },
  winLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },
  winTitle: {
    fontSize: 28,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    lineHeight: 34,
    letterSpacing: FONTS.tracking.tight,
  },
  valueLine: { height: 2, width: 48, borderRadius: 1 },
  winValue: { fontSize: 64, fontWeight: FONTS.weights.light, lineHeight: 70, letterSpacing: -2 },
  memberLine: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
    marginTop: 4,
  },

  actions: { gap: 10 },
  shareBtn: { paddingVertical: 16, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1 },
  shareTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },
  swipeHint: { textAlign: 'center', fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wider },
});

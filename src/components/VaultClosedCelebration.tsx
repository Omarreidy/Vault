import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { pickVaultClosedHeadline } from '../services/ritual';

const { width } = Dimensions.get('window');

// Single floating gold particle — same burst language as TierUnlockCelebration,
// duplicated locally so each celebration component stays self-contained.
function Particle({ delay }: { delay: number }) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  const angle = Math.random() * Math.PI * 2;
  const distance = 70 + Math.random() * 100;
  const targetX = Math.cos(angle) * distance;
  const targetY = Math.sin(angle) * distance - 30;
  const size = 3 + Math.random() * 5;

  useEffect(() => {
    const duration = 800 + Math.random() * 500;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      ]),
      Animated.parallel([
        Animated.timing(x,       { toValue: targetX, duration, useNativeDriver: true }),
        Animated.timing(y,       { toValue: targetY, duration, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration, delay: duration * 0.4, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: size / 2,
      backgroundColor: COLORS.gold,
      opacity,
      transform: [{ translateX: x }, { translateY: y }, { scale }],
    }} />
  );
}

interface Props {
  visible: boolean;
  streakDays: number;
  xpToday: number;
  onClose: () => void;
}

// The dopamine hit for closing today's 3 moves. Fires once per day, right
// when the third move completes — the ritual's payoff moment.
export default function VaultClosedCelebration({ visible, streakDays, xpToday, onClose }: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale     = useRef(new Animated.Value(0)).current;
  const badgeGlow      = useRef(new Animated.Value(0)).current;
  const textOpacity    = useRef(new Animated.Value(0)).current;
  const textY          = useRef(new Animated.Value(20)).current;
  const btnOpacity     = useRef(new Animated.Value(0)).current;
  const [showParticles, setShowParticles] = useState(false);
  const [headline] = useState(pickVaultClosedHeadline);

  useEffect(() => {
    if (!visible) return;

    overlayOpacity.setValue(0);
    badgeScale.setValue(0);
    badgeGlow.setValue(0);
    textOpacity.setValue(0);
    textY.setValue(20);
    btnOpacity.setValue(0);
    setShowParticles(false);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.timing(overlayOpacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();

    const t1 = setTimeout(() => {
      Animated.spring(badgeScale, { toValue: 1, useNativeDriver: true, tension: 70, friction: 7 }).start();
      setShowParticles(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 220);

    const t2 = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(badgeGlow, { toValue: 1, duration: 850, useNativeDriver: true }),
          Animated.timing(badgeGlow, { toValue: 0.3, duration: 850, useNativeDriver: true }),
        ])
      ).start();
    }, 400);

    const t3 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(textY,       { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 600);

    const t4 = setTimeout(() => {
      Animated.timing(btnOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, 1000);

    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [visible]);

  if (!visible) return null;

  const glowSize = badgeGlow.interpolate({ inputRange: [0, 1], outputRange: [110, 150] });
  const glowOpacity = badgeGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] });

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.content}>

        <View style={styles.badgeArea}>
          <Animated.View style={[
            styles.glow,
            { width: glowSize, height: glowSize, borderRadius: 999, opacity: glowOpacity },
          ]} />
          <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
            <Text style={styles.badgeGlyph}>◉</Text>
          </Animated.View>
          {showParticles && (
            <View style={styles.particleOrigin}>
              {Array.from({ length: 16 }).map((_, i) => <Particle key={i} delay={i * 40} />)}
            </View>
          )}
        </View>

        <Animated.View style={[styles.textBlock, { opacity: textOpacity, transform: [{ translateY: textY }] }]}>
          <Text style={styles.eyebrow}>VAULT CLOSED</Text>
          <Text style={styles.headline}>{headline}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statTxt}>{streakDays}-day streak</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statTxt}>+{xpToday} XP today</Text>
            </View>
          </View>
          <Text style={styles.sub}>Your cohort will see today's moves. New moves drop tomorrow.</Text>
        </Animated.View>

        <Animated.View style={{ opacity: btnOpacity, alignSelf: 'stretch' }}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onClose();
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.continueTxt}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5,5,8,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  content: {
    width: width - SPACING.xl * 2,
    alignItems: 'center',
    gap: SPACING.xl,
  },

  badgeArea: { alignItems: 'center', justifyContent: 'center', width: 180, height: 180 },
  glow: { position: 'absolute', backgroundColor: COLORS.gold },
  badge: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 2, borderColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,169,110,0.08)',
  },
  badgeGlyph: { fontSize: 34, color: COLORS.gold },
  particleOrigin: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },

  textBlock: { alignItems: 'center', gap: 10 },
  eyebrow: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: FONTS.tracking.widest * 2,
    fontWeight: FONTS.weights.semibold,
  },
  headline: {
    fontFamily: FONTS.display,
    fontSize: 32,
    fontWeight: FONTS.weights.light,
    color: '#F2EFE9',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(201,169,110,0.3)',
    backgroundColor: 'rgba(201,169,110,0.08)',
  },
  statEmoji: { fontSize: 12 },
  statTxt: { fontSize: FONTS.sizes.sm, color: COLORS.gold, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },
  sub: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 20,
  },

  continueBtn: {
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  continueTxt: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: FONTS.tracking.wide,
    fontWeight: FONTS.weights.semibold,
  },
});

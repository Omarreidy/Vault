import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions, Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TierName } from '../types';
import { TIERS, FONTS, SPACING, RADIUS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const TIER_PERKS: Record<TierName, string[]> = {
  BRONZE:   ['Daily wealth moves', 'Basic concierge (5/mo)', 'Velocity score'],
  SILVER:   ['Unlimited moves', 'Concierge (20/mo)', 'Goals tracker', 'Weekly report'],
  GOLD:     ['Priority concierge', 'Exclusive partner rates', 'Leaderboard access', 'Advanced insights'],
  PLATINUM: ['Unlimited concierge', 'Premium partner rates', 'Personal wealth report', 'Early feature access'],
  BLACK:    ['Dedicated advisor', 'Centurion-level perks', 'White-glove onboarding', 'Private community'],
};

const TIER_HEADLINES: Record<TierName, string> = {
  BRONZE:   'Your journey begins.',
  SILVER:   'Moving up.',
  GOLD:     'You\'re in the top 30%.',
  PLATINUM: 'Elite territory.',
  BLACK:    'You\'ve arrived.',
};

// Single floating particle
function Particle({ color, delay }: { color: string; delay: number }) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  const angle = Math.random() * Math.PI * 2;
  const distance = 80 + Math.random() * 120;
  const targetX = Math.cos(angle) * distance;
  const targetY = Math.sin(angle) * distance - 40;
  const size = 3 + Math.random() * 5;

  useEffect(() => {
    const duration = 900 + Math.random() * 600;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: false }),
        Animated.spring(scale,   { toValue: 1, useNativeDriver: false, tension: 200, friction: 8 }),
      ]),
      Animated.parallel([
        Animated.timing(x,       { toValue: targetX,  duration, useNativeDriver: false }),
        Animated.timing(y,       { toValue: targetY,  duration, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0, duration, delay: duration * 0.4, useNativeDriver: false }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity,
      transform: [{ translateX: x }, { translateY: y }, { scale }],
    }} />
  );
}

interface Props {
  tier: TierName;
  visible: boolean;
  onClose: () => void;
}

export default function TierUnlockCelebration({ tier, visible, onClose }: Props) {
  const info = TIERS[tier];

  // Core animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale     = useRef(new Animated.Value(0)).current;
  const badgeGlow      = useRef(new Animated.Value(0)).current;
  const titleY         = useRef(new Animated.Value(30)).current;
  const titleOpacity   = useRef(new Animated.Value(0)).current;
  // Fixed 5 slots — hooks cannot be called inside .map()
  const pa0 = { opacity: useRef(new Animated.Value(0)).current, y: useRef(new Animated.Value(16)).current };
  const pa1 = { opacity: useRef(new Animated.Value(0)).current, y: useRef(new Animated.Value(16)).current };
  const pa2 = { opacity: useRef(new Animated.Value(0)).current, y: useRef(new Animated.Value(16)).current };
  const pa3 = { opacity: useRef(new Animated.Value(0)).current, y: useRef(new Animated.Value(16)).current };
  const pa4 = { opacity: useRef(new Animated.Value(0)).current, y: useRef(new Animated.Value(16)).current };
  const perkAnims = [pa0, pa1, pa2, pa3, pa4].slice(0, TIER_PERKS[tier].length);
  const btnOpacity     = useRef(new Animated.Value(0)).current;
  const [showParticles, setShowParticles] = useState(false);

  const ROMAN: Record<TierName, string> = {
    BRONZE: 'I', SILVER: 'II', GOLD: 'III', PLATINUM: 'IV', BLACK: 'V',
  };

  useEffect(() => {
    if (!visible) return;

    // Reset
    overlayOpacity.setValue(0);
    badgeScale.setValue(0);
    badgeGlow.setValue(0);
    titleY.setValue(30);
    titleOpacity.setValue(0);
    btnOpacity.setValue(0);
    perkAnims.forEach(p => { p.opacity.setValue(0); p.y.setValue(16); });
    setShowParticles(false);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Sequence
    Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: false }).start();

    setTimeout(() => {
      Animated.spring(badgeScale, { toValue: 1, useNativeDriver: false, tension: 60, friction: 7 }).start();
      setShowParticles(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 300);

    // Pulsing glow loop
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(badgeGlow, { toValue: 1, duration: 900, useNativeDriver: false }),
          Animated.timing(badgeGlow, { toValue: 0.3, duration: 900, useNativeDriver: false }),
        ])
      ).start();
    }, 500);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(titleY,       { toValue: 0, duration: 400, useNativeDriver: false }),
      ]).start();
    }, 700);

    perkAnims.forEach((anim, i) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(anim.y,       { toValue: 0, duration: 300, useNativeDriver: false }),
        ]).start();
      }, 1000 + i * 140);
    });

    setTimeout(() => {
      Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: false }).start();
    }, 1600);
  }, [visible]);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await Share.share({
      message: `Just unlocked ${info.name} tier on VAULT 🏆\n${TIER_HEADLINES[tier]}\n\nBuilding wealth differently.`,
    });
  };

  const glowSize = badgeGlow.interpolate({ inputRange: [0, 1], outputRange: [120, 160] });
  const glowOpacity = badgeGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>

        {/* Content */}
        <View style={styles.content}>

          {/* Badge + glow + particles */}
          <View style={styles.badgeArea}>
            {/* Glow behind badge */}
            <Animated.View style={[
              styles.glow,
              {
                width: glowSize, height: glowSize,
                borderRadius: 999,
                backgroundColor: info.color,
                opacity: glowOpacity,
              },
            ]} />

            {/* Badge */}
            <Animated.View style={[
              styles.badge,
              {
                borderColor: info.color,
                transform: [{ scale: badgeScale }],
                shadowColor: info.color,
              },
            ]}>
              <Text style={[styles.badgeNumeral, { color: info.color, fontFamily: FONTS.display }]}>
                {ROMAN[tier]}
              </Text>
            </Animated.View>

            {/* Particles */}
            {showParticles && (
              <View style={styles.particleOrigin}>
                {Array.from({ length: 18 }).map((_, i) => (
                  <Particle key={i} color={info.color} delay={i * 40} />
                ))}
              </View>
            )}
          </View>

          {/* Text */}
          <Animated.View style={[styles.textBlock, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
            <Text style={styles.unlockLabel}>TIER UNLOCKED</Text>
            <Text style={[styles.tierName, { color: info.color, fontFamily: FONTS.display }]}>
              {info.name}
            </Text>
            <Text style={styles.headline}>{TIER_HEADLINES[tier]}</Text>
          </Animated.View>

          {/* Perks */}
          <View style={styles.perksBlock}>
            {TIER_PERKS[tier].map((perk, i) => (
              <Animated.View
                key={perk}
                style={[
                  styles.perkRow,
                  { opacity: perkAnims[i].opacity, transform: [{ translateY: perkAnims[i].y }] },
                ]}
              >
                <View style={[styles.perkDot, { backgroundColor: info.color }]} />
                <Text style={styles.perkTxt}>{perk}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Buttons */}
          <Animated.View style={[styles.buttons, { opacity: btnOpacity }]}>
            <TouchableOpacity style={[styles.shareBtn, { borderColor: info.color + '60' }]} onPress={handleShare} activeOpacity={0.8}>
              <Text style={[styles.shareBtnTxt, { color: info.color }]}>Share this moment ↑</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.continueBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.continueTxt}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,8,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: width - SPACING.xl * 2,
    alignItems: 'center',
    gap: SPACING.xl,
  },

  badgeArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  glow: {
    position: 'absolute',
  },
  badge: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  badgeNumeral: {
    fontSize: 32,
    fontWeight: FONTS.weights.light,
  },
  particleOrigin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  textBlock: { alignItems: 'center', gap: 8 },
  unlockLabel: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: FONTS.tracking.widest * 2,
    fontWeight: FONTS.weights.semibold,
  },
  tierName: {
    fontSize: 52,
    fontWeight: FONTS.weights.light,
    letterSpacing: 2,
    lineHeight: 58,
  },
  headline: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: FONTS.tracking.wide,
  },

  perksBlock: {
    alignSelf: 'stretch',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  perkDot: { width: 5, height: 5, borderRadius: 2.5 },
  perkTxt: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.7)', letterSpacing: FONTS.tracking.wide },

  buttons: { alignSelf: 'stretch', gap: SPACING.sm },
  shareBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  shareBtnTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },
  continueBtn: {
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  continueTxt: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: FONTS.tracking.wide,
    fontWeight: FONTS.weights.medium,
  },
});

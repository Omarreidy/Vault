import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

interface Props {
  trigger: 'moves' | 'streak';
  streakDays?: number;
  movesCompleted?: number;
  onConnect: () => void;
  onDismiss: () => void;
}

export default function PlaidNudge({ trigger, streakDays, movesCompleted, onConnect, onDismiss }: Props) {
  const slideY  = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY,  { toValue: 0, tension: 60, friction: 9, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
  }, []);

  const headline = trigger === 'moves'
    ? `You've completed ${movesCompleted} moves`
    : `${streakDays}-day streak 🔥`;

  const sub = trigger === 'moves'
    ? "These are generic moves. Connect your bank and we'll show you moves based on YOUR actual accounts — worth 3x more."
    : "You're building momentum. Connect your bank so your score reflects what you're actually doing with your money.";

  return (
    <Animated.View style={[styles.wrap, CARD_SHADOW, { opacity, transform: [{ translateY: slideY }] }]}>
      <View style={styles.topBar} />
      <View style={styles.inner}>
        <View style={styles.top}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🏦</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} activeOpacity={0.7}>
            <Text style={styles.dismissTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.sub}>{sub}</Text>

        <View style={styles.trustRow}>
          {['Read-only', '256-bit encryption', 'Plaid — used by Venmo'].map(t => (
            <View key={t} style={styles.trustPill}>
              <Text style={styles.trustCheck}>✓</Text>
              <Text style={styles.trustTxt}>{t}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.cta}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onConnect();
          }}
          activeOpacity={0.88}
        >
          <Text style={styles.ctaTxt}>Connect my bank →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDismiss} activeOpacity={0.7}>
          <Text style={styles.notNow}>Not now</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.gold + '30',
    overflow: 'hidden',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  topBar: { height: 2, backgroundColor: COLORS.gold },
  inner: { padding: SPACING.lg, gap: SPACING.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.goldGlow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.gold + '40',
  },
  icon: { fontSize: 22 },
  dismissBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  dismissTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, fontWeight: FONTS.weights.bold },
  headline: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: -0.3 },
  sub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },
  trustRow: { gap: 6 },
  trustPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustCheck: { fontSize: FONTS.sizes.xs, color: '#7EB8A4', fontWeight: FONTS.weights.bold },
  trustTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim },
  cta: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#08080C', letterSpacing: 0.3 },
  notNow: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center', letterSpacing: FONTS.tracking.wide },
});

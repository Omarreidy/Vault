import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Modal, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const { width, height } = Dimensions.get('window');


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
  const bgOpacity   = useRef(new Animated.Value(0)).current;
  const cardScale   = useRef(new Animated.Value(0.93)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const shimmerX    = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    if (!visible) return;
    bgOpacity.setValue(0);
    cardScale.setValue(0.93);
    cardOpacity.setValue(0);
    shimmerX.setValue(-width);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    Animated.parallel([
      Animated.timing(bgOpacity,   { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.spring(cardScale,   { toValue: 1, tension: 60, friction: 9, delay: 80, useNativeDriver: false }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 320, delay: 80, useNativeDriver: false }),
    ]).start(() => {
      Animated.loop(
        Animated.timing(shimmerX, { toValue: width * 2, duration: 2200, delay: 400, useNativeDriver: false }),
      ).start();
    });
  }, [visible]);

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
            <View style={styles.header}>
              <Text style={styles.eyebrow}>VAULT · WEALTH RECAP</Text>
              <Text style={styles.month}>YOUR 2026 RECAP</Text>
              <Text style={styles.headline}>Your story is just beginning.</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Not-ready state */}
            <View style={styles.notReadyBlock}>
              <Text style={styles.notReadyGlyph}>◈</Text>
              <Text style={styles.notReadyTitle}>Your first recap isn't ready yet</Text>
              <Text style={styles.notReadySub}>
                Connect your bank accounts and build for a full month. VAULT will generate your personalized Wealth Recap — score changes, net worth growth, moves completed, and your percentile ranking.
              </Text>
            </View>

            {/* Close */}
            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={styles.shareBtn}>
                <LinearGradient
                  colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.shareBtnGrad}
                >
                  <Text style={styles.shareBtnTxt}>Got It</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

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
  notReadyBlock: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  notReadyGlyph: { fontSize: 48, color: COLORS.gold },
  notReadyTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold, color: COLORS.text, textAlign: 'center', letterSpacing: FONTS.tracking.tight },
  notReadySub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center', lineHeight: 22 },
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

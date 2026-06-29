import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { usePlaid } from '../context/PlaidContext';
import { fetchLiveScore, getTierFromScore } from '../services/velocity';
import { getStreak } from '../services/streak';
import { loadStats } from '../services/progressStats';
import {
  getAchievements, buildAchievementContext, netWorthOf, Achievement,
} from '../services/achievements';

const { width } = Dimensions.get('window');

interface Benefit {
  icon: string;
  label: string;
  value: string;
  legendary?: boolean;
}

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;

// A single staggered benefit row that fades + slides in with a haptic tick.
function BenefitRow({ benefit, index, onReveal }: { benefit: Benefit; index: number; onReveal: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const delay = 900 + index * 280;
    const t = setTimeout(() => {
      onReveal();
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[styles.benefitRow, benefit.legendary && styles.benefitRowLegendary, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.benefitIconWrap, benefit.legendary && styles.benefitIconWrapLegendary]}>
        <Text style={styles.benefitIcon}>{benefit.icon}</Text>
      </View>
      <View style={styles.benefitText}>
        <Text style={styles.benefitLabel}>{benefit.label}</Text>
        <Text style={[styles.benefitValue, benefit.legendary && styles.benefitValueLegendary]}>{benefit.value}</Text>
      </View>
      <Text style={styles.benefitCheck}>✓</Text>
    </Animated.View>
  );
}

export default function BankConnectedScreen({ onDone }: { onDone: () => void }) {
  const { plaidSummary, refresh } = usePlaid();
  const [loading, setLoading] = useState(true);
  const [scoreTotal, setScoreTotal] = useState(0);
  const [tier, setTier] = useState('BRONZE');
  const [percentile, setPercentile] = useState<number | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [displayScore, setDisplayScore] = useState(0);

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.9)).current;
  const glow = useRef(new Animated.Value(0.3)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Make sure the just-saved bank data is loaded into context.
      try { await refresh(); } catch {}

      const [scoreRes, streak, stats] = await Promise.all([
        fetchLiveScore().catch(() => null),
        getStreak().catch(() => 0),
        loadStats().catch(() => null),
      ]);
      if (cancelled) return;

      const total = scoreRes?.total ?? 0;
      const tierName = scoreRes?.tier ?? getTierFromScore(total);
      const pct = scoreRes?.percentile ?? null;
      setScoreTotal(total);
      setTier(tierName);
      setPercentile(pct);

      // Re-read the freshest summary directly (context may still be settling).
      const summary = plaidSummary;
      const nw = netWorthOf(summary ?? undefined) ?? 0;

      // Which achievements does the bank connection light up?
      let unlockedBankAchievements: Achievement[] = [];
      try {
        const ach = await getAchievements(buildAchievementContext({
          streak: streak ?? 0,
          score: total,
          movesActed: stats?.movesActedTotal ?? 0,
          plaidConnected: true,
          plaid: summary,
        }));
        const BANK_IDS = ['a6', 'a11']; // 10K Club, 100K Club
        unlockedBankAchievements = ach.filter(a => a.unlocked && BANK_IDS.includes(a.id));
      } catch {}

      const list: Benefit[] = [];
      list.push({ icon: '◉', label: 'Wealth Velocity Score', value: total > 0 ? `${total} · ${tierName} tier` : 'Now live' });
      if (summary) {
        list.push({ icon: '◐', label: 'Net Worth Tracking', value: `${fmtMoney(nw)} · live` });
      }
      if (pct != null) {
        const top = Math.max(1, 100 - pct);
        list.push({ icon: '◇', label: 'Cohort Ranking', value: `Top ${top}% of your bracket` });
      }
      for (const a of unlockedBankAchievements) {
        list.push({ icon: a.icon, label: `${a.title} unlocked`, value: a.description, legendary: a.rarity === 'legendary' });
      }
      list.push({ icon: '✦', label: 'Personalized Money Moves', value: 'Tailored to your accounts' });
      list.push({ icon: '◈', label: 'Concierge Upgraded', value: 'Now knows your real finances' });

      if (cancelled) return;
      setBenefits(list);
      setLoading(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Header in.
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(headerScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();

      // Pulsing glow loop.
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.3, duration: 1400, useNativeDriver: true }),
        ])
      ).start();

      // Score count-up.
      if (total > 0) {
        const steps = 40;
        const dur = 1300;
        let i = 0;
        const timer = setInterval(() => {
          i++;
          const eased = 1 - Math.pow(1 - i / steps, 3); // easeOutCubic
          setDisplayScore(Math.round(total * eased));
          if (i >= steps) { setDisplayScore(total); clearInterval(timer); }
        }, dur / steps);
      }

      // CTA fades in after the benefits have revealed.
      Animated.timing(ctaOpacity, {
        toValue: 1, duration: 500, delay: 900 + list.length * 280 + 300, useNativeDriver: true,
      }).start();
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onDone();
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingTxt}>Opening the vault…</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <Animated.View style={{ opacity: headerOpacity, transform: [{ scale: headerScale }], alignItems: 'center' }}>
            <View style={styles.glyphRow}>
              {['◈', '◆', '◈', '◆', '◈'].map((g, i) => (
                <Text key={i} style={styles.glyph}>{g}</Text>
              ))}
            </View>
            <Text style={styles.eyebrow}>BANK CONNECTED</Text>
            <Text style={styles.title}>You're in{'\n'}the VAULT</Text>

            {/* Score hero */}
            <View style={styles.scoreWrap}>
              <Animated.View style={[styles.scoreGlow, { opacity: glow }]} />
              <Text style={styles.scoreLabel}>WEALTH VELOCITY</Text>
              <Text style={styles.scoreNum}>{displayScore}</Text>
              <View style={styles.tierPill}>
                <Text style={styles.tierTxt}>{tier} TIER</Text>
              </View>
            </View>
          </Animated.View>

          {/* Benefits */}
          <View style={styles.benefits}>
            <Text style={styles.unlockedHeader}>{benefits.length} BENEFITS UNLOCKED</Text>
            {benefits.map((b, i) => (
              <BenefitRow
                key={`${b.label}-${i}`}
                benefit={b}
                index={i}
                onReveal={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})}
              />
            ))}
          </View>

          <Animated.View style={{ opacity: ctaOpacity, width: '100%' }}>
            <TouchableOpacity style={styles.cta} onPress={handleDone} activeOpacity={0.85}>
              <Text style={styles.ctaTxt}>See my numbers →</Text>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const GOLD = COLORS.gold;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0A09' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingTxt: { color: COLORS.gold, fontSize: FONTS.sizes.sm, letterSpacing: 1, fontWeight: FONTS.weights.semibold },

  content: { padding: SPACING.xl, paddingBottom: SPACING.xxl, alignItems: 'center', gap: SPACING.xl },

  glyphRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  glyph: { color: GOLD, fontSize: 14, opacity: 0.8 },
  eyebrow: { color: GOLD, fontSize: 11, fontWeight: FONTS.weights.bold, letterSpacing: 4, marginBottom: SPACING.sm },
  title: {
    fontFamily: FONTS.display, color: '#F5F1E8', fontSize: 44, lineHeight: 48,
    textAlign: 'center', fontWeight: FONTS.weights.light, letterSpacing: -0.5,
  },

  scoreWrap: { alignItems: 'center', marginTop: SPACING.xl, paddingVertical: SPACING.lg, position: 'relative' },
  scoreGlow: {
    position: 'absolute', top: 10, width: 220, height: 220, borderRadius: 110,
    backgroundColor: COLORS.goldGlowStrong,
  },
  scoreLabel: { color: 'rgba(245,241,232,0.5)', fontSize: 10, fontWeight: FONTS.weights.bold, letterSpacing: 3 },
  scoreNum: {
    fontFamily: FONTS.display, color: GOLD, fontSize: 84, lineHeight: 92,
    fontWeight: FONTS.weights.light, letterSpacing: -2,
  },
  tierPill: {
    paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: GOLD + '60', backgroundColor: COLORS.goldGlow,
  },
  tierTxt: { color: GOLD, fontSize: 11, fontWeight: FONTS.weights.bold, letterSpacing: 2 },

  benefits: { width: '100%', gap: SPACING.sm },
  unlockedHeader: {
    color: 'rgba(245,241,232,0.45)', fontSize: 10, fontWeight: FONTS.weights.bold,
    letterSpacing: 3, marginBottom: SPACING.xs, textAlign: 'center',
  },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(201,169,110,0.18)',
    padding: SPACING.md,
  },
  benefitRowLegendary: { borderColor: GOLD + '70', backgroundColor: COLORS.goldGlow },
  benefitIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.goldGlow,
    borderWidth: 1, borderColor: GOLD + '40', alignItems: 'center', justifyContent: 'center',
  },
  benefitIconWrapLegendary: { backgroundColor: COLORS.goldGlowStrong, borderColor: GOLD },
  benefitIcon: { color: GOLD, fontSize: 18 },
  benefitText: { flex: 1, gap: 2 },
  benefitLabel: { color: '#F5F1E8', fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  benefitValue: { color: 'rgba(245,241,232,0.55)', fontSize: FONTS.sizes.xs },
  benefitValueLegendary: { color: GOLD },
  benefitCheck: { color: COLORS.green, fontSize: 16, fontWeight: FONTS.weights.bold },

  cta: {
    width: '100%', backgroundColor: GOLD, borderRadius: RADIUS.full,
    paddingVertical: 17, alignItems: 'center', marginTop: SPACING.lg,
  },
  ctaTxt: { color: '#08080C', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, letterSpacing: 0.5 },
});

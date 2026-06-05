import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Animated, Linking, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const SUPABASE_URL = 'https://gvdfypehwmemootjizmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs';

const PERKS = [
  { icon: '◈', title: 'Unlimited AI Concierge', sub: 'Ask anything, any time — no limits' },
  { icon: '◆', title: 'Priority wealth moves', sub: 'First access to high-impact opportunities' },
  { icon: '◉', title: 'Advanced Signal tab', sub: 'Real-time alerts when your stocks move' },
  { icon: '◇', title: 'Exclusive partner rates', sub: 'Better rates on loans, cards, and accounts' },
  { icon: '○', title: 'Premium tier badge', sub: 'Platinum status in your cohort' },
  { icon: '✦', title: 'Monthly wealth report', sub: 'Deep analysis of your financial progress' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UpgradeScreen({ visible, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, tension: 60, friction: 9, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]).start();
    }
  }, [visible]);

  const handleUpgrade = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setLoading(true);
    setError('');
    try {
      // Try to get user — gracefully fall back if session not available
      let userId = 'guest';
      let email = 'guest@vault.app';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          userId = session.user.id;
          email = session.user.email ?? email;
        }
      } catch {}

      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: userId,
          email,
          success_url: 'https://vaultreidy.netlify.app?subscribed=true',
          cancel_url: 'https://vaultreidy.netlify.app?cancelled=true',
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) {
        // On web use window.location to avoid browser popup blocking
        if (typeof window !== 'undefined' && window.location) {
          window.location.href = data.url;
        } else {
          await Linking.openURL(data.url);
        }
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      setError('Could not start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Animated.View style={[styles.hero, { opacity, transform: [{ scale }] }]}>
            <Text style={styles.heroEye}>VAULT PREMIUM</Text>
            <Text style={styles.heroTitle}>Wealth without limits.</Text>
            <Text style={styles.heroSub}>
              Everything in VAULT — unlocked. The tools that actually move the needle.
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>$13</Text>
              <View>
                <Text style={styles.pricePer}>/month</Text>
                <Text style={styles.priceSub}>Cancel anytime</Text>
              </View>
            </View>
          </Animated.View>

          {/* Perks */}
          <View style={styles.perks}>
            {PERKS.map((p, i) => (
              <View key={i} style={[styles.perk, CARD_SHADOW, { shadowOpacity: 0.06 }]}>
                <View style={styles.perkIcon}>
                  <Text style={styles.perkIconTxt}>{p.icon}</Text>
                </View>
                <View style={styles.perkText}>
                  <Text style={styles.perkTitle}>{p.title}</Text>
                  <Text style={styles.perkSub}>{p.sub}</Text>
                </View>
                <Text style={styles.perkCheck}>✓</Text>
              </View>
            ))}
          </View>

          {/* Social proof */}
          <View style={[styles.proofCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
            <Text style={styles.proofQuote}>
              "Paid for itself in the first week. Found $840/yr in subscriptions I forgot about."
            </Text>
            <Text style={styles.proofAuthor}>— Gold member, 34, Seattle</Text>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          {/* CTA */}
          <TouchableOpacity
            style={styles.ctaWrap}
            onPress={handleUpgrade}
            disabled={loading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Text style={styles.ctaTxt}>
                {loading ? 'Opening checkout…' : 'Start Premium — $13/mo →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.legal}>
            Billed monthly. Cancel anytime from your account settings.{'\n'}
            Secure checkout powered by Stripe.
          </Text>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, alignItems: 'flex-end' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  closeTxt: { fontSize: 12, color: COLORS.textDim, fontWeight: FONTS.weights.bold },

  scroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },

  hero: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.lg },
  heroEye: { fontSize: 9, color: COLORS.gold, letterSpacing: FONTS.tracking.widest * 2, fontWeight: FONTS.weights.bold },
  heroTitle: {
    fontFamily: FONTS.display, fontSize: 38, fontWeight: FONTS.weights.light,
    color: COLORS.text, letterSpacing: -1, textAlign: 'center',
  },
  heroSub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center', lineHeight: 22 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.sm },
  price: {
    fontFamily: FONTS.display, fontSize: 64, fontWeight: FONTS.weights.light,
    color: COLORS.gold, letterSpacing: -3, lineHeight: 70,
  },
  pricePer: { fontSize: FONTS.sizes.lg, color: COLORS.textDim, marginTop: 16 },
  priceSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },

  perks: { gap: SPACING.sm },
  perk: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  perkIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.goldGlow, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.gold + '30',
  },
  perkIconTxt: { fontSize: 16, color: COLORS.gold },
  perkText: { flex: 1, gap: 2 },
  perkTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  perkSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  perkCheck: { fontSize: FONTS.sizes.md, color: '#7EB8A4', fontWeight: FONTS.weights.bold },

  proofCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.gold + '30',
    padding: SPACING.lg, gap: SPACING.sm,
  },
  proofQuote: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontStyle: 'italic', lineHeight: 22 },
  proofAuthor: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },

  error: { fontSize: FONTS.sizes.xs, color: COLORS.red, textAlign: 'center' },

  ctaWrap: { borderRadius: RADIUS.full, overflow: 'hidden' },
  cta: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  ctaTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#08080C', letterSpacing: 0.3 },

  legal: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 18, letterSpacing: FONTS.tracking.normal,
  },
});

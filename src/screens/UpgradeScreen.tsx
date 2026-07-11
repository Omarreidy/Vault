import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import PolicyModal from '../components/PolicyModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../constants/legal';
import { syncPremiumStatus } from '../services/premium';

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
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [priceString, setPriceString] = useState('$9.99');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, tension: 60, friction: 9, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]).start();
      loadOffering();
    }
  }, [visible]);

  const loadOffering = async () => {
    if (Platform.OS === 'web') return;
    try {
      const Purchases = require('react-native-purchases').default;
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.monthly ?? offerings.current?.availablePackages?.[0];
      if (pkg?.product?.priceString) {
        setPriceString(pkg.product.priceString);
      }
    } catch {}
  };

  const handleUpgrade = async () => {
    if (Platform.OS === 'web') {
      setError('Open the VAULT app on your iPhone to upgrade.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setLoading(true);
    setError('');
    try {
      const Purchases = require('react-native-purchases').default;
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.monthly ?? offerings.current?.availablePackages?.[0];
      if (!pkg) throw new Error('No subscription available');

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['premium']) {
        // Persist the entitlement so premium survives app restarts.
        await syncPremiumStatus();
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      if (!err.userCancelled) {
        setError('Purchase failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS === 'web') return;
    setRestoring(true);
    setError('');
    try {
      const Purchases = require('react-native-purchases').default;
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['premium']) {
        await syncPremiumStatus();
        onSuccess?.();
        onClose();
      } else {
        setError('No active subscription found.');
      }
    } catch {
      setError('Could not restore. Please try again.');
    } finally {
      setRestoring(false);
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
              <Text style={styles.price}>{priceString}</Text>
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

          {/* Stat callout */}
          <View style={[styles.proofCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
            <Text style={styles.proofQuote}>
              VAULT members who connect their accounts identify an average of $600–$1,200/year in optimizable spending within the first 30 days.
            </Text>
            <Text style={styles.proofAuthor}>◆  Based on connected account analysis</Text>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          {/* CTA */}
          <TouchableOpacity
            style={styles.ctaWrap}
            onPress={handleUpgrade}
            disabled={loading || restoring}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Text style={styles.ctaTxt}>
                {loading ? 'Processing…' : `Start Premium — ${priceString}/mo →`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRestore} disabled={loading || restoring} style={styles.restoreBtn}>
            <Text style={styles.restoreTxt}>
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            {priceString}/month, billed by Apple. Cancel anytime in your iPhone Settings.{'\n'}
            Payment processed securely by Apple. Subscription auto-renews unless canceled at least 24 hours before the end of the period.
          </Text>

          {/* Terms + Privacy — required by App Store guideline 3.1.2 */}
          <View style={styles.policyRow}>
            <TouchableOpacity onPress={() => setShowTerms(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.policyLink}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={styles.policyDot}>·</Text>
            <TouchableOpacity onPress={() => setShowPrivacy(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.policyLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        <PolicyModal
          visible={showTerms}
          title="Terms of Service"
          content={TERMS_OF_SERVICE}
          onClose={() => setShowTerms(false)}
        />
        <PolicyModal
          visible={showPrivacy}
          title="Privacy Policy"
          content={PRIVACY_POLICY}
          onClose={() => setShowPrivacy(false)}
        />
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
  closeTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, fontWeight: FONTS.weights.bold },

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

  restoreBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  restoreTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textDecorationLine: 'underline' },

  legal: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 18, letterSpacing: FONTS.tracking.normal,
  },
  policyRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: SPACING.sm, marginTop: SPACING.xs,
  },
  policyLink: {
    fontSize: FONTS.sizes.xs, color: COLORS.textDim,
    textDecorationLine: 'underline', letterSpacing: FONTS.tracking.normal,
  },
  policyDot: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
});

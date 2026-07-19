import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import PolicyModal from '../components/PolicyModal';
import DisclaimerCard from '../components/DisclaimerCard';
import AcknowledgementCheckbox from '../components/AcknowledgementCheckbox';
import { recordAcceptance } from '../services/legalConsent';
import {
  ACKNOWLEDGEMENTS, IMPORTANT_DISCLOSURES, PRIVACY_POLICY, TERMS_OF_SERVICE,
} from '../constants/legal';
import { COLORS, FONTS, SPACING, RADIUS, DISPLAY_FONT } from '../constants/theme';

// Plain-language summaries of the full disclosures — conspicuous by design.
// Full documents are one tap away below.
const CARDS = [
  {
    icon: '◆',
    title: 'Educational, always',
    body: 'Everything in VAULT — feed moves, scores, verdicts, research, AI answers — is educational information. It is never financial, investment, legal, or tax advice.',
  },
  {
    icon: '✦',
    title: 'AI can be wrong',
    body: 'VAULT’s AI is built to sharpen your thinking — not replace professional guidance. It can be inaccurate or incomplete. Verify anything important before acting.',
  },
  {
    icon: '▲',
    title: 'Research, not recommendations',
    body: 'Company research and market data are for learning. Nothing here is ever a suggestion to buy, sell, or hold any investment.',
  },
  {
    icon: '≈',
    title: 'Estimates, not promises',
    body: 'Scores, verdicts, budgets, and projections are estimates. VAULT guarantees no financial outcome — your results are your own.',
  },
  {
    icon: '⬦',
    title: 'Not a bank',
    body: 'VAULT is not a bank, broker-dealer, or investment adviser. Your money never moves through us — bank access is read-only.',
  },
];

interface Props {
  userId: string;
  onComplete: () => void;
}

export default function LegalAcknowledgementScreen({ userId, onComplete }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | 'terms' | 'privacy' | 'disclosures'>(null);

  const allChecked = ACKNOWLEDGEMENTS.every((a) => checked[a.id]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;
  const btnGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  useEffect(() => {
    Animated.timing(btnGlow, {
      toValue: allChecked ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
    if (allChecked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [allChecked, btnGlow]);

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  const handleContinue = async () => {
    if (!allChecked || saving) return;
    setSaving(true);
    await recordAcceptance(userId);
    onComplete();
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <Text style={styles.eyebrow}>BEFORE YOU ENTER</Text>
          <Text style={styles.headline}>
            Know what VAULT is.{'\n'}
            <Text style={styles.headlineAccent}>And what it isn’t.</Text>
          </Text>
          <Text style={styles.sub}>
            Sixty seconds of clarity now, so there’s never a surprise later.
          </Text>

          <View style={styles.cards}>
            {CARDS.map((card) => (
              <DisclaimerCard key={card.title} {...card} />
            ))}
          </View>

          <View style={styles.linksRow}>
            <Text style={styles.linksLabel}>Read the full documents: </Text>
            <TouchableOpacity onPress={() => setModal('disclosures')} accessibilityRole="link">
              <Text style={styles.link}>Disclosures</Text>
            </TouchableOpacity>
            <Text style={styles.linksLabel}> · </Text>
            <TouchableOpacity onPress={() => setModal('terms')} accessibilityRole="link">
              <Text style={styles.link}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.linksLabel}> · </Text>
            <TouchableOpacity onPress={() => setModal('privacy')} accessibilityRole="link">
              <Text style={styles.link}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.acks}>
            {ACKNOWLEDGEMENTS.map((ack) => (
              <AcknowledgementCheckbox
                key={ack.id}
                label={ack.text}
                checked={!!checked[ack.id]}
                onToggle={() => toggle(ack.id)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btn, !allChecked && styles.btnLocked]}
            onPress={handleContinue}
            disabled={!allChecked || saving}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: !allChecked || saving }}
            accessibilityLabel="Agree and enter VAULT"
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.btnGlow,
                { opacity: btnGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) },
              ]}
            />
            <Text style={[styles.btnTxt, !allChecked && styles.btnTxtLocked]}>
              {saving ? 'One moment…' : allChecked ? 'Agree & enter VAULT →' : 'Acknowledge all three to continue'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.audit}>
            Your acceptance is recorded with today’s date and the current document versions.
          </Text>
        </Animated.View>
      </ScrollView>

      <PolicyModal
        visible={modal === 'disclosures'}
        title="Important Disclosures"
        content={IMPORTANT_DISCLOSURES}
        onClose={() => setModal(null)}
      />
      <PolicyModal
        visible={modal === 'terms'}
        title="Terms of Service"
        content={TERMS_OF_SERVICE}
        onClose={() => setModal(null)}
      />
      <PolicyModal
        visible={modal === 'privacy'}
        title="Privacy Policy"
        content={PRIVACY_POLICY}
        onClose={() => setModal(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08080C' },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  eyebrow: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.heavy,
    letterSpacing: FONTS.tracking.widest,
    color: COLORS.gold,
    marginBottom: SPACING.md,
  },
  headline: {
    fontFamily: DISPLAY_FONT,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: FONTS.weights.light,
    color: '#E8E0D5',
    letterSpacing: FONTS.tracking.tight,
  },
  headlineAccent: {
    color: COLORS.goldLight,
    fontStyle: 'italic',
  },
  sub: {
    fontSize: FONTS.sizes.lg,
    lineHeight: 24,
    color: '#B0A99F',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  cards: {
    gap: SPACING.sm + 2,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  linksLabel: {
    fontSize: FONTS.sizes.sm,
    color: '#6B6560',
  },
  link: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.gold,
    textDecorationLine: 'underline',
  },
  acks: {
    gap: SPACING.sm + 2,
    marginBottom: SPACING.xl,
  },
  btn: {
    borderRadius: RADIUS.full,
    paddingVertical: 17,
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    overflow: 'hidden',
  },
  btnLocked: {
    backgroundColor: '#191713',
    borderWidth: 1,
    borderColor: '#26221C',
  },
  btnGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.goldLight,
    opacity: 0,
  },
  btnTxt: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: '#08080C',
    letterSpacing: FONTS.tracking.wide,
  },
  btnTxtLocked: {
    color: '#6B6560',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  audit: {
    fontSize: FONTS.sizes.sm,
    lineHeight: 18,
    color: '#4A4540',
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});

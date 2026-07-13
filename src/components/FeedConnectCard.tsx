import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { track, EVENTS } from '../services/analytics';

interface Props {
  onConnect: () => void;
  onSkip: () => void;
  index: number;
  total: number;
}

const UNLOCKS = [
  { icon: '◉', text: 'Your real Wealth Velocity score — live, not estimated' },
  { icon: '◆', text: 'Moves generated from your actual balances' },
  { icon: '◬', text: 'A financial independence date from your real net worth' },
];

const TRUST = ['Read-only access', 'Bank-level encryption', 'Powered by Plaid'];

// Full-height feed card shown once, early, when no bank is connected.
// This is the activation moment: everything personal in VAULT unlocks here.
export default function FeedConnectCard({ onConnect, onSkip, index, total }: Props) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    track(EVENTS.CONNECT_CARD_VIEWED, { index });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topAccent} />
      <View style={[styles.inner, { paddingBottom: SPACING.xl + insets.bottom }]}>

        <View>
          <View style={styles.topRow}>
            <View style={styles.tag}>
              <View style={styles.tagDot} />
              <Text style={styles.tagTxt}>UNLOCK</Text>
            </View>
            <Text style={styles.counter}>{index + 1} / {total}</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>Your real score is waiting.</Text>
            <Text style={styles.desc}>
              Everything you've seen so far is an estimate. Connect your bank and
              VAULT rebuilds around your actual money.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.unlockList}>
            {UNLOCKS.map(u => (
              <View key={u.text} style={styles.unlockRow}>
                <Text style={styles.unlockIcon}>{u.icon}</Text>
                <Text style={styles.unlockTxt}>{u.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.trustRow}>
            {TRUST.map(t => (
              <View key={t} style={styles.trustPill}>
                <Text style={styles.trustCheck}>✓</Text>
                <Text style={styles.trustTxt}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                track(EVENTS.CONNECT_CARD_DISMISSED, { index });
                onSkip();
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Not now — skip connecting a bank"
            >
              <Text style={styles.skipTxt}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                track(EVENTS.CONNECT_CARD_CTA, { index });
                onConnect();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Connect my bank to unlock my real score"
            >
              <Text style={styles.actTxt}>Connect my bank →</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
      <View style={styles.bottomAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', backgroundColor: COLORS.background },
  topAccent: { height: 3, backgroundColor: COLORS.gold },
  bottomAccent: { height: 3, backgroundColor: COLORS.gold },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    justifyContent: 'space-between',
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
    backgroundColor: COLORS.goldGlow, borderColor: COLORS.gold + '35',
  },
  tagDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.gold },
  tagTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest, color: COLORS.gold },
  counter: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },

  body: { paddingTop: SPACING.lg, gap: 16 },
  title: {
    fontSize: 30,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    lineHeight: 36,
    letterSpacing: FONTS.tracking.tight,
  },
  desc: { fontSize: FONTS.sizes.md, color: COLORS.textDim, lineHeight: FONTS.sizes.md * 1.75 },

  bottomSection: { gap: SPACING.md },

  unlockList: { gap: SPACING.sm },
  unlockRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingVertical: 12, paddingHorizontal: SPACING.md,
  },
  unlockIcon: { fontSize: FONTS.sizes.md, color: COLORS.gold, width: 20, textAlign: 'center' },
  unlockTxt: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.text, lineHeight: 20, fontWeight: FONTS.weights.medium },

  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'center' },
  trustPill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustCheck: { fontSize: FONTS.sizes.xs, color: '#7EB8A4', fontWeight: FONTS.weights.bold },
  trustTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  actions: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'stretch' },
  skipBtn: { flex: 1, paddingVertical: 14, paddingHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md },
  skipTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.text, letterSpacing: FONTS.tracking.wide },
  actBtn: { flex: 2.5, paddingVertical: 14, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gold },
  actTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: '#08080C', letterSpacing: FONTS.tracking.wide },
});

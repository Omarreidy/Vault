import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gvdfypehwmemootjizmd.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs';

interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  balances: { current: number; available: number; iso_currency_code: string };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (accounts: PlaidAccount[]) => void;
}

// Web version — opens Plaid in a new tab since WebView isn't available on web
export default function PlaidLinkScreen({ visible, onClose, onSuccess }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) fetchLinkToken();
  }, [visible]);

  const fetchLinkToken = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/plaid-link-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: user?.id ?? 'guest' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLinkToken(data.link_token);
    } catch {
      setError('Could not connect to bank service. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPlaid = () => {
    if (!linkToken) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // On web, open Plaid Link in a new tab
    const url = `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkToken}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
    // Note: on web we can't capture the callback — show a manual confirmation
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Connect Bank</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeTxt}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🏦</Text>
          </View>
          <Text style={styles.title}>Connect your accounts</Text>
          <Text style={styles.sub}>
            Tap below to open Plaid in a new tab. Connect your bank, then come back to the app.
          </Text>

          <View style={styles.badges}>
            {['256-bit encryption', 'Read-only access', 'Used by Venmo & Robinhood'].map(b => (
              <View key={b} style={[styles.badge, CARD_SHADOW, { shadowOpacity: 0.06 }]}>
                <Text style={styles.badgeCheck}>✓</Text>
                <Text style={styles.badgeTxt}>{b}</Text>
              </View>
            ))}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          {loading ? (
            <ActivityIndicator color={COLORS.gold} size="large" style={{ marginTop: SPACING.lg }} />
          ) : (
            <TouchableOpacity
              style={[styles.btn, !linkToken && styles.btnOff]}
              onPress={handleOpenPlaid}
              disabled={!linkToken}
              activeOpacity={0.85}
            >
              <Text style={styles.btnTxt}>Open Plaid to connect →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => { onSuccess([]); onClose(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.doneTxt}>I've connected my bank ✓</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  closeTxt: { fontSize: 20, color: COLORS.textDim, lineHeight: 22 },
  divider: { height: 1, backgroundColor: COLORS.border },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACING.xl, gap: SPACING.lg,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.goldGlow, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.gold + '40',
  },
  icon: { fontSize: 36 },
  title: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, textAlign: 'center' },
  sub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center', lineHeight: 22 },
  badges: { width: '100%', gap: SPACING.sm },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
  },
  badgeCheck: { fontSize: FONTS.sizes.md, color: '#7EB8A4', fontWeight: FONTS.weights.bold },
  badgeTxt: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: FONTS.weights.medium },
  error: { fontSize: FONTS.sizes.xs, color: COLORS.red, textAlign: 'center' },
  btn: {
    width: '100%', backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center',
  },
  btnOff: { opacity: 0.5 },
  btnTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#08080C', letterSpacing: 0.3 },
  doneBtn: { paddingVertical: 12 },
  doneTxt: { fontSize: FONTS.sizes.sm, color: COLORS.green, fontWeight: FONTS.weights.medium },
});

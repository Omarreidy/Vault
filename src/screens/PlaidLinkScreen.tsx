import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';
import BankConnectedScreen from './BankConnectedScreen';
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

export default function PlaidLinkScreen({ visible, onClose, onSuccess }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebView, setShowWebView] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<PlaidAccount[]>([]);

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
    } catch (err: any) {
      setError('Could not connect to bank service. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      if (msg.action === 'plaidSuccess') {
        setShowWebView(false);
        setLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Please sign in before connecting a bank.');
        const res = await fetch(`${SUPABASE_URL}/functions/v1/plaid-exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ public_token: msg.public_token, user_id: user.id }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        // Show the cinematic celebration; the parent's onSuccess fires when the
        // user taps through it (see BankConnectedScreen onDone below).
        setConnectedAccounts(data.accounts ?? []);
        setShowCelebration(true);
      } else if (msg.action === 'plaidError') {
        setError(msg.error || 'Could not open bank connection. Please try again.');
        setShowWebView(false);
      } else if (msg.action === 'plaidExit') {
        setShowWebView(false);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setShowWebView(false);
    } finally {
      setLoading(false);
    }
  };

  // Plaid Link hosted page with postMessage bridge.
  // NOTE: this HTML is rendered with baseUrl https://cdn.plaid.com so the WebView
  // has a real https origin — Plaid's Link script silently refuses to initialize
  // (blank screen) when the document origin is null/about:blank.
  const plaidHtml = linkToken ? `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html,body{margin:0;padding:0;height:100%;background:#FAFAF7;font-family:-apple-system,system-ui,sans-serif;}
  .loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#8a8a85;}
  .spinner{width:32px;height:32px;border:3px solid #e5e5e0;border-top-color:#C9A24B;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:14px;}
  @keyframes spin{to{transform:rotate(360deg);}}
</style>
</head>
<body>
<div class="loading"><div class="spinner"></div><div>Opening secure connection…</div></div>
<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
<script>
  function post(o){ try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch(e){} }
  function start(){
    if (typeof Plaid === 'undefined') {
      post({ action: 'plaidError', error: 'Could not load Plaid. Check your connection and try again.' });
      return;
    }
    try {
      var handler = Plaid.create({
        token: '${linkToken}',
        onSuccess: function(public_token, metadata) {
          post({ action: 'plaidSuccess', public_token: public_token, metadata: metadata });
        },
        onExit: function(err, metadata) {
          post({ action: 'plaidExit', error: err });
        },
      });
      handler.open();
    } catch (e) {
      post({ action: 'plaidError', error: String(e && e.message ? e.message : e) });
    }
  }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
</script>
</body>
</html>` : '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {showCelebration ? (
        <BankConnectedScreen onDone={() => {
          const acc = connectedAccounts;
          setShowCelebration(false);
          onSuccess(acc);
          onClose();
        }} />
      ) : (
      <SafeAreaView style={styles.root}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Connect Bank</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close bank connection"
          >
            <Text style={styles.closeTxt}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        {showWebView && linkToken ? (
          <WebView
            source={{ html: plaidHtml, baseUrl: 'https://cdn.plaid.com' }}
            onMessage={handleWebViewMessage}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            // Keep OAuth bank logins inside this WebView instead of trying to open
            // a (blocked) popup window — this is what lets OAuth banks work embedded.
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically
            startInLoadingState
            onError={(e) => {
              setError('Connection error: ' + (e.nativeEvent?.description ?? 'unknown'));
              setShowWebView(false);
            }}
          />
        ) : (
          <View style={styles.content}>

            {/* Icon */}
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>🏦</Text>
            </View>

            <Text style={styles.title}>Connect your accounts</Text>
            <Text style={styles.sub}>
              VAULT uses Plaid — the same technology trusted by Venmo, Robinhood, and 7,000+ apps.
              Your credentials never touch our servers.
            </Text>

            {/* Trust badges */}
            <View style={styles.badges}>
              {['256-bit encryption', 'Read-only access', 'Bank-level security'].map(b => (
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
                onPress={() => linkToken && setShowWebView(true)}
                disabled={!linkToken}
                activeOpacity={0.85}
              >
                <Text style={styles.btnTxt}>Connect bank account →</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.legal}>
              By connecting, you agree to Plaid's Privacy Policy. VAULT stores read-only account data. We never store your login credentials.
            </Text>
          </View>
        )}
      </SafeAreaView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: -0.5 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  closeTxt: { fontSize: 20, color: COLORS.textDim, lineHeight: 22 },
  divider: { height: 1, backgroundColor: COLORS.border },
  webview: { flex: 1 },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACING.xl, gap: SPACING.lg,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.goldGlow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.gold + '40',
  },
  icon: { fontSize: 36 },
  title: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: -0.5, textAlign: 'center' },
  sub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center', lineHeight: 22 },
  badges: { width: '100%', gap: SPACING.sm },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
  },
  badgeCheck: { fontSize: FONTS.sizes.md, color: COLORS.green, fontWeight: FONTS.weights.bold },
  badgeTxt: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: FONTS.weights.medium },
  error: { fontSize: FONTS.sizes.xs, color: COLORS.red, textAlign: 'center' },
  btn: {
    width: '100%', backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center',
  },
  btnOff: { opacity: 0.5 },
  btnTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#08080C', letterSpacing: 0.3 },
  legal: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: 16 },
});

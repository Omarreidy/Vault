import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, Linking, Share, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import TierBadge from '../components/TierBadge';
import PolicyModal from '../components/PolicyModal';
import { COLORS, FONTS, SPACING, RADIUS, TIERS, CARD_SHADOW } from '../constants/theme';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../constants/legal';
import { resetOnboarding } from '../services/onboarding';
import { useRealProfile } from '../services/userProfile';
import { supabase } from '../services/supabase';
import PlaidLinkScreen from './PlaidLinkScreen';
import UpgradeScreen from './UpgradeScreen';

const NOTIF_PREFS_KEY  = '@vault_notif_prefs';
const CURRENCY_KEY     = '@vault_currency';
const LANGUAGE_KEY     = '@vault_language';
const DARK_MODE_KEY    = '@vault_dark_mode';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const LANGUAGES  = ['English', 'Spanish', 'French', 'German', 'Portuguese'];

const APP_STORE_URL  = 'https://apps.apple.com/app/id6740384574';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.getvault.app';
const INVITE_URL     = 'https://getvault.app';

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, sub, value, onChange }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onChange(v);
        }}
        trackColor={{ false: COLORS.border, true: COLORS.gold + '80' }}
        thumbColor={value ? COLORS.gold : COLORS.textMuted}
        ios_backgroundColor={COLORS.border}
      />
    </View>
  );
}

function LinkRow({ label, sub, value, onPress, danger }: {
  label: string; sub?: string; value?: string; onPress: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, danger && { color: COLORS.red }]}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        <Text style={[styles.chevron, danger && { color: COLORS.red }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.sectionCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
        {children}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.rowDivider} />;
}

function PickerSheet({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.root}>
        <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.handle} />
          <Text style={pickerStyles.title}>{title}</Text>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={pickerStyles.option}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onSelect(opt); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[pickerStyles.optionTxt, opt === selected && pickerStyles.optionTxtActive]}>
                {opt}
              </Text>
              {opt === selected && <Text style={pickerStyles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={pickerStyles.cancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={pickerStyles.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onResetOnboarding?: () => void;
}

export default function SettingsScreen({ onClose, onResetOnboarding }: Props) {
  const { tier, name } = useRealProfile();
  const info = TIERS[tier];

  // Notification toggles
  const [notifMoves,   setNotifMoves]   = useState(true);
  const [notifStreak,  setNotifStreak]  = useState(true);
  const [notifScore,   setNotifScore]   = useState(true);
  const [notifWeekly,  setNotifWeekly]  = useState(true);
  const [notifInsight, setNotifInsight] = useState(false);

  // Preferences
  const [darkMode,  setDarkMode]  = useState(false);
  const [currency,  setCurrency]  = useState('USD');
  const [language,  setLanguage]  = useState('English');

  // Modals
  const [showPlaid,      setShowPlaid]      = useState(false);
  const [connectedBanks, setConnectedBanks] = useState(0);
  const [showUpgrade,    setShowUpgrade]    = useState(false);
  const [showPrivacy,    setShowPrivacy]    = useState(false);
  const [showTerms,      setShowTerms]      = useState(false);
  const [showCurrency,   setShowCurrency]   = useState(false);
  const [showLanguage,   setShowLanguage]   = useState(false);

  // ── Load persisted prefs on mount ─────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.multiGet([NOTIF_PREFS_KEY, CURRENCY_KEY, LANGUAGE_KEY, DARK_MODE_KEY])
      .then(pairs => {
        for (const [key, val] of pairs) {
          if (!val) continue;
          if (key === NOTIF_PREFS_KEY) {
            const p = JSON.parse(val);
            if (p.moves   !== undefined) setNotifMoves(p.moves);
            if (p.streak  !== undefined) setNotifStreak(p.streak);
            if (p.score   !== undefined) setNotifScore(p.score);
            if (p.weekly  !== undefined) setNotifWeekly(p.weekly);
            if (p.insight !== undefined) setNotifInsight(p.insight);
          }
          if (key === CURRENCY_KEY)  setCurrency(val);
          if (key === LANGUAGE_KEY)  setLanguage(val);
          if (key === DARK_MODE_KEY) setDarkMode(val === 'true');
        }
      })
      .catch(() => {});
  }, []);

  // ── Persist notification prefs whenever any toggle changes ────────────────
  useEffect(() => {
    AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({
      moves: notifMoves, streak: notifStreak, score: notifScore,
      weekly: notifWeekly, insight: notifInsight,
    })).catch(() => {});
  }, [notifMoves, notifStreak, notifScore, notifWeekly, notifInsight]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCurrency = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowCurrency(true);
  };

  const handleLanguage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowLanguage(true);
  };

  const handlePrivacy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowPrivacy(true);
  };

  const handleTerms = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowTerms(true);
  };

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const profileJson = await AsyncStorage.getItem('@vault_onboarding_result').catch(() => null);
      const profile = profileJson ? JSON.parse(profileJson) : {};
      const lines = [
        'VAULT DATA EXPORT',
        `Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`,
        '',
        'PROFILE',
        `Name: ${profile.name || name || '—'}`,
        `Score: ${profile.score ?? '—'}`,
        `Tier: ${tier}`,
        `Email: ${user?.email ?? '—'}`,
        '',
        'PREFERENCES',
        `Currency: ${currency}`,
        `Language: ${language}`,
        '',
        'NOTIFICATIONS',
        `New wealth moves: ${notifMoves ? 'On' : 'Off'}`,
        `Streak reminder: ${notifStreak ? 'On' : 'Off'}`,
        `Score updates: ${notifScore ? 'On' : 'Off'}`,
        `Weekly report: ${notifWeekly ? 'On' : 'Off'}`,
        `Market insights: ${notifInsight ? 'On' : 'Off'}`,
        '',
        'VAULT · Building wealth differently',
        'getvault.app',
      ];
      await Share.share({
        title: 'My VAULT Data Export',
        message: lines.join('\n'),
      });
    } catch {}
  };

  const handleRate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const url = Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open the store listing.')
    );
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await Share.share({
        title: 'Join VAULT',
        message:
          `I've been using VAULT to track my financial moves and build wealth. Join me — it's free.\n\n${INVITE_URL}`,
        url: INVITE_URL,
      });
    } catch {}
  };

  const handleRestorePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (Platform.OS === 'web') return;
    try {
      const Purchases = require('react-native-purchases').default;
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['premium']) {
        Alert.alert('Restored!', 'Your Premium subscription is active.', [{ text: 'Great' }]);
      } else {
        Alert.alert('No subscription found', 'No active subscription found on this account.\n\nContact support@getvault.app if you believe this is an error.', [{ text: 'OK' }]);
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.', [{ text: 'OK' }]);
    }
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut().catch(() => {});
            await AsyncStorage.multiRemove([
              '@vault_onboarding_result',
              '@vault_onboarding_answers',
              NOTIF_PREFS_KEY,
              CURRENCY_KEY,
              LANGUAGE_KEY,
              DARK_MODE_KEY,
            ]).catch(() => {});
            onResetOnboarding?.();
            onClose();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                try { await supabase.from('profiles').delete().eq('id', user.id); } catch {}
              }
              await supabase.auth.signOut().catch(() => {});
              await AsyncStorage.clear().catch(() => {});
            } catch {}
            onResetOnboarding?.();
            onClose();
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Replay Onboarding',
      'This will restart the onboarding experience. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
            onResetOnboarding?.();
            onClose();
          },
        },
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <UpgradeScreen
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
      <PolicyModal
        visible={showPrivacy}
        title="Privacy Policy"
        content={PRIVACY_POLICY}
        onClose={() => setShowPrivacy(false)}
      />
      <PolicyModal
        visible={showTerms}
        title="Terms of Service"
        content={TERMS_OF_SERVICE}
        onClose={() => setShowTerms(false)}
      />
      <PickerSheet
        visible={showCurrency}
        title="Currency"
        options={CURRENCIES}
        selected={currency}
        onSelect={v => { setCurrency(v); AsyncStorage.setItem(CURRENCY_KEY, v).catch(() => {}); }}
        onClose={() => setShowCurrency(false)}
      />
      <PickerSheet
        visible={showLanguage}
        title="Language"
        options={LANGUAGES}
        selected={language}
        onSelect={v => { setLanguage(v); AsyncStorage.setItem(LANGUAGE_KEY, v).catch(() => {}); }}
        onClose={() => setShowLanguage(false)}
      />
      <PlaidLinkScreen
        visible={showPlaid}
        onClose={() => setShowPlaid(false)}
        onSuccess={(accounts) => {
          setConnectedBanks(accounts.length);
          setShowPlaid(false);
          Alert.alert('Connected!', `${accounts.length} account${accounts.length !== 1 ? 's' : ''} linked successfully.`);
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={[styles.profileCard, CARD_SHADOW, { shadowOpacity: 0.09 }]}>
          <TierBadge tier={tier} size="md" showLabel={false} />
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={[styles.profileTier, { color: info.color }]}>{info.name} Member</Text>
          </View>
          <TouchableOpacity
            style={[styles.upgradePill, { borderColor: info.color + '50' }]}
            onPress={() => {
              if (tier !== 'BLACK') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShowUpgrade(true);
              }
            }}
            activeOpacity={tier === 'BLACK' ? 1 : 0.7}
          >
            <Text style={[styles.upgradeTxt, { color: info.color }]}>
              {tier === 'BLACK' ? 'Max tier' : 'Upgrade →'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Membership */}
        <Section title="MEMBERSHIP">
          <LinkRow
            label="Current plan"
            value="Free"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowUpgrade(true);
            }}
          />
          <Divider />
          <LinkRow
            label="Upgrade to Premium"
            sub="$9.99/mo · Unlimited concierge · All features"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              setShowUpgrade(true);
            }}
          />
          <Divider />
          <LinkRow label="Restore purchase" onPress={handleRestorePurchase} />
        </Section>

        {/* Notifications */}
        <Section title="NOTIFICATIONS">
          <ToggleRow label="New wealth moves"   sub="Daily personalised moves"     value={notifMoves}   onChange={setNotifMoves} />
          <Divider />
          <ToggleRow label="Streak reminder"    sub="Before your streak breaks"    value={notifStreak}  onChange={setNotifStreak} />
          <Divider />
          <ToggleRow label="Score updates"      sub="Weekly velocity change"       value={notifScore}   onChange={setNotifScore} />
          <Divider />
          <ToggleRow label="Weekly report"      sub="Every Monday morning"         value={notifWeekly}  onChange={setNotifWeekly} />
          <Divider />
          <ToggleRow label="Market insights"    sub="When news affects your money" value={notifInsight} onChange={setNotifInsight} />
        </Section>

        {/* Preferences */}
        <Section title="PREFERENCES">
          <LinkRow label="Currency" value={currency} onPress={handleCurrency} />
          <Divider />
          <LinkRow label="Language" value={language} onPress={handleLanguage} />
          <Divider />
          <ToggleRow label="Dark mode" sub="Coming soon" value={darkMode} onChange={() => {}} />
        </Section>

        {/* Connected accounts */}
        <Section title="CONNECTED ACCOUNTS">
          <LinkRow
            label="Bank accounts"
            sub={connectedBanks > 0
              ? `${connectedBanks} account${connectedBanks !== 1 ? 's' : ''} connected`
              : 'Connect via Plaid'}
            value={connectedBanks > 0 ? '✓' : ''}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowPlaid(true);
            }}
          />
          <Divider />
          <LinkRow label="Investment accounts" sub="Brokerage sync — coming soon" onPress={() => {}} />
        </Section>

        {/* Privacy & Data */}
        <Section title="PRIVACY & DATA">
          <LinkRow label="Privacy policy"    onPress={handlePrivacy} />
          <Divider />
          <LinkRow label="Terms of service"  onPress={handleTerms} />
          <Divider />
          <LinkRow label="Export my data"    sub="Download a copy of your data" onPress={handleExport} />
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <LinkRow label="Version" value="1.0.0 (1)" onPress={() => {}} />
          <Divider />
          <LinkRow label="Rate VAULT"  sub="Help us grow"       onPress={handleRate} />
          <Divider />
          <LinkRow label="Share VAULT" sub="Invite a friend"    onPress={handleShare} />
        </Section>

        {/* Account */}
        <Section title="ACCOUNT">
          <LinkRow label="Replay onboarding" sub="For testing" onPress={handleResetOnboarding} />
          <Divider />
          <LinkRow label="Sign out"      onPress={handleSignOut} />
          <Divider />
          <LinkRow label="Delete account" onPress={handleDeleteAccount} danger />
        </Section>

        <Text style={styles.footer}>VAULT · Building wealth differently</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.sheetBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  closeTxt: { fontSize: 20, color: COLORS.textDim, lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  scroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  profileText: { flex: 1, gap: 3 },
  profileName: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  profileTier: { fontSize: FONTS.sizes.sm, letterSpacing: FONTS.tracking.wide },
  upgradePill: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  upgradeTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },

  section: { gap: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest, fontWeight: FONTS.weights.semibold, paddingLeft: 4 },
  sectionCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    minHeight: 52,
  },
  rowLeft: { flex: 1, gap: 2 },
  rowLabel: { fontSize: FONTS.sizes.md, color: COLORS.text, letterSpacing: FONTS.tracking.normal },
  rowSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },
  chevron: { fontSize: 20, color: COLORS.textMuted, lineHeight: 22 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginLeft: SPACING.md },

  footer: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    textAlign: 'center', letterSpacing: FONTS.tracking.widest,
    paddingTop: SPACING.sm,
  },
});

const pickerStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
    marginBottom: SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  optionTxt: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  optionTxtActive: {
    color: COLORS.gold,
    fontWeight: FONTS.weights.semibold,
  },
  check: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gold,
    fontWeight: FONTS.weights.bold,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  cancelTxt: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textMuted,
  },
});

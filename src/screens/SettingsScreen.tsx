import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, Linking, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import TierBadge from '../components/TierBadge';
import PolicyModal from '../components/PolicyModal';
import { COLORS, FONTS, SPACING, RADIUS, TIERS, CARD_SHADOW } from '../constants/theme';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../constants/legal';
import { resetOnboarding } from '../services/onboarding';
import { syncDailyReminder, syncWeeklyRecap, getPushPermission, PushPermission, teardownPushForSignOut } from '../services/push';
import {
  getNotifPrefs, setNotifPrefs, NOTIF_PREFS_KEY,
  getNotifMeta, setNotifMeta, isPausedNow, DEFAULT_NOTIF_META, NOTIF_META_KEY,
  syncPrefsToServer, fetchServerPrefs, DEFAULT_NOTIF_PREFS,
} from '../services/notificationPrefs';
import { CURRENCY_KEY, LANGUAGE_KEY, SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES } from '../services/locale';
import { useRealProfile } from '../services/userProfile';
import { usePlaid } from '../context/PlaidContext';
import { supabase } from '../services/supabase';
import { syncPremiumStatus } from '../services/premium';
import PlaidLinkScreen from './PlaidLinkScreen';
import UpgradeScreen from './UpgradeScreen';

const DARK_MODE_KEY    = '@vault_dark_mode';

const CURRENCIES = [...SUPPORTED_CURRENCIES];
const LANGUAGES  = [...SUPPORTED_LANGUAGES];

// "Pause" is indefinite until the member resumes — a far-future instant the
// server dispatcher compares against, not a countdown we'd have to refresh.
const PAUSE_INDEFINITE = '2099-12-31T00:00:00.000Z';

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${h < 12 ? 'AM' : 'PM'}`;
});
const fmtHour = (h: number) => HOUR_LABELS[((h % 24) + 24) % 24];

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
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
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
        accessibilityLabel={label}
      />
    </View>
  );
}

function LinkRow({ label, sub, value, onPress, danger }: {
  label: string; sub?: string; value?: string; onPress?: () => void; danger?: boolean;
}) {
  const content = (
    <>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, danger && { color: COLORS.red }]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {onPress ? <Text style={[styles.chevron, danger && { color: COLORS.red }]}>›</Text> : null}
      </View>
    </>
  );
  // Display-only rows (no onPress) render as a plain row — no chevron, not tappable.
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
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

// Rendered as an inline absolute overlay, NOT a nested <Modal>. SettingsScreen
// itself is presented inside a pageSheet Modal (ProfileScreen), and iOS
// silently drops a second Modal presented from within one — that was the
// "tapping Currency/Language does nothing" bug.
function PickerSheet({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={pickerStyles.root}>
      <TouchableOpacity
        style={pickerStyles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close picker"
      />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.title}>{title}</Text>
        {/* Scrolls because the 24-hour quiet-hours list is taller than the screen */}
        <ScrollView style={pickerStyles.optionList} bounces={false}>
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
        </ScrollView>
        <TouchableOpacity style={pickerStyles.cancel} onPress={onClose} activeOpacity={0.7}>
          <Text style={pickerStyles.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onResetOnboarding?: () => void;
}

export default function SettingsScreen({ onClose, onResetOnboarding }: Props) {
  const { tier, name, isPremium } = useRealProfile();
  const { plaidConnected, plaidSummary, hardRefresh: refreshPlaid } = usePlaid();
  const info = TIERS[tier];

  // Notification toggles
  const [notifMoves,   setNotifMoves]   = useState(true);
  const [notifStreak,  setNotifStreak]  = useState(true);
  const [notifScore,   setNotifScore]   = useState(true);
  const [notifWeekly,  setNotifWeekly]  = useState(true);
  const [notifInsight, setNotifInsight] = useState(false);
  const [paused,       setPaused]       = useState(false);
  const [quietStart,   setQuietStart]   = useState(DEFAULT_NOTIF_META.quietStart);
  const [quietEnd,     setQuietEnd]     = useState(DEFAULT_NOTIF_META.quietEnd);
  const [showQuietStart, setShowQuietStart] = useState(false);
  const [showQuietEnd,   setShowQuietEnd]   = useState(false);
  // Gate persisting until stored prefs have loaded, so the mount render can't
  // clobber saved settings with the defaults above.
  const [prefsLoaded,  setPrefsLoaded]  = useState(false);
  // Real OS permission — shown so the toggles never claim pushes that iOS blocks.
  const [pushPermission, setPushPermission] = useState<PushPermission>('unavailable');

  // Preferences
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

  // ── Load persisted prefs on mount (server copy wins — cross-device sync) ──
  useEffect(() => {
    (async () => {
      try {
        const server = await fetchServerPrefs();
        const prefs = server?.prefs ?? await getNotifPrefs();
        const meta  = server?.meta  ?? await getNotifMeta();
        setNotifMoves(prefs.moves);
        setNotifStreak(prefs.streak);
        setNotifScore(prefs.score);
        setNotifWeekly(prefs.weekly);
        setNotifInsight(prefs.insight);
        setQuietStart(meta.quietStart);
        setQuietEnd(meta.quietEnd);
        setPaused(isPausedNow(meta));
      } catch {}
      setPrefsLoaded(true);
    })();

    getPushPermission().then(setPushPermission).catch(() => {});

    AsyncStorage.multiGet([CURRENCY_KEY, LANGUAGE_KEY])
      .then(pairs => {
        for (const [key, val] of pairs) {
          if (!val) continue;
          if (key === CURRENCY_KEY)  setCurrency(val);
          if (key === LANGUAGE_KEY)  setLanguage(val);
        }
      })
      .catch(() => {});
  }, []);

  // ── Persist notification prefs whenever anything changes ──────────────────
  // Write-through: AsyncStorage (offline truth) + notification_prefs table
  // (what the server dispatcher enforces), then re-sync local schedules.
  useEffect(() => {
    if (!prefsLoaded) return;
    const prefs = {
      moves: notifMoves, streak: notifStreak, score: notifScore,
      weekly: notifWeekly, insight: notifInsight,
    };
    const meta = {
      quietStart, quietEnd,
      pausedUntil: paused ? PAUSE_INDEFINITE : null,
    };
    Promise.all([setNotifPrefs(prefs), setNotifMeta(meta)])
      .then(() => Promise.all([
        syncPrefsToServer(prefs, meta),
        // streak toggle controls the daily reminder; weekly toggle the recap
        syncDailyReminder(),
        syncWeeklyRecap(),
      ]))
      .catch(() => {});
  }, [prefsLoaded, notifMoves, notifStreak, notifScore, notifWeekly, notifInsight, paused, quietStart, quietEnd]);

  const handleResetNotifs = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setNotifMoves(DEFAULT_NOTIF_PREFS.moves);
    setNotifStreak(DEFAULT_NOTIF_PREFS.streak);
    setNotifScore(DEFAULT_NOTIF_PREFS.score);
    setNotifWeekly(DEFAULT_NOTIF_PREFS.weekly);
    setNotifInsight(DEFAULT_NOTIF_PREFS.insight);
    setQuietStart(DEFAULT_NOTIF_META.quietStart);
    setQuietEnd(DEFAULT_NOTIF_META.quietEnd);
    setPaused(false);
  };

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
        `Weekly recap: ${notifWeekly ? 'On' : 'Off'}`,
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
        await syncPremiumStatus();
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
            // Before signOut — clearing profiles.push_token needs the live
            // session, and local reminders must not outlive the account.
            await teardownPushForSignOut();
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
              // Fully delete the account server-side: bank data, profile, AND the
              // auth user itself (App Store guideline 5.1.1(v)).
              const { error } = await supabase.functions.invoke('delete-account');
              if (error) throw error;
            } catch (e) {
              Alert.alert(
                'Could not delete account',
                'Something went wrong. Please check your connection and try again, or email support@getvault.app.',
                [{ text: 'OK' }]
              );
              return;
            }
            // Clear the local session/state only after the server confirms deletion.
            await supabase.auth.signOut().catch(() => {});
            await AsyncStorage.clear().catch(() => {});
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
      <PlaidLinkScreen
        visible={showPlaid}
        onClose={() => setShowPlaid(false)}
        onSuccess={(accounts) => {
          setConnectedBanks(accounts.length);
          setShowPlaid(false);
          refreshPlaid();
          Alert.alert('Connected!', `${accounts.length} account${accounts.length !== 1 ? 's' : ''} linked successfully.`);
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
        >
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
              if (!isPremium) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShowUpgrade(true);
              }
            }}
            activeOpacity={isPremium ? 1 : 0.7}
          >
            <Text style={[styles.upgradeTxt, { color: info.color }]}>
              {isPremium ? '✦ Premium' : 'Upgrade →'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Membership — the plan row must reflect the real entitlement; a
            paying subscriber should never read "Free" or be sold an upgrade. */}
        <Section title="MEMBERSHIP">
          {isPremium ? (
            <>
              <LinkRow label="Current plan" value="Premium" />
              <Divider />
              <LinkRow
                label="Manage subscription"
                sub="Billed by Apple · Change or cancel anytime"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {});
                }}
              />
            </>
          ) : (
            <>
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
                sub="Unlimited AI Concierge · billed monthly via the App Store"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  setShowUpgrade(true);
                }}
              />
            </>
          )}
          <Divider />
          <LinkRow label="Restore purchase" onPress={handleRestorePurchase} />
        </Section>

        {/* Notifications */}
        <Section title="NOTIFICATIONS">
          {pushPermission === 'denied' && (
            <>
              <TouchableOpacity
                style={styles.permBanner}
                onPress={() => Linking.openSettings().catch(() => {})}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open device notification settings"
              >
                <Text style={styles.permBannerTxt}>
                  Notifications are turned off for VAULT in your device Settings.
                  These preferences take effect once they're re-enabled.
                </Text>
                <Text style={styles.permBannerCta}>Open Settings →</Text>
              </TouchableOpacity>
              <Divider />
            </>
          )}
          <ToggleRow label="New wealth moves"   sub="Daily personalised moves"     value={notifMoves}   onChange={setNotifMoves} />
          <Divider />
          <ToggleRow label="Streak reminder"    sub="Daily at 5pm, before your streak breaks" value={notifStreak}  onChange={setNotifStreak} />
          <Divider />
          <ToggleRow label="Score updates"      sub="Weekly velocity change"       value={notifScore}   onChange={setNotifScore} />
          <Divider />
          <ToggleRow label="Weekly recap"       sub="Sunday evening summary"       value={notifWeekly}  onChange={setNotifWeekly} />
          <Divider />
          <ToggleRow label="Market insights"    sub="When news affects your money" value={notifInsight} onChange={setNotifInsight} />
          <Divider />
          <ToggleRow
            label="Pause all"
            sub={paused ? 'Paused — nothing sends until you resume' : 'Temporarily silence every VAULT notification'}
            value={paused}
            onChange={setPaused}
          />
          <Divider />
          <LinkRow
            label="Quiet hours"
            sub="No pushes during this window, your local time"
            value={`${fmtHour(quietStart)} – ${fmtHour(quietEnd)}`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setShowQuietStart(true);
            }}
          />
          <Divider />
          <LinkRow
            label="Reset notification settings"
            sub="Back to the defaults"
            onPress={handleResetNotifs}
          />
        </Section>

        {/* Preferences */}
        <Section title="PREFERENCES">
          <LinkRow label="Currency" value={currency} onPress={handleCurrency} />
          <Divider />
          <LinkRow label="Language" value={language} onPress={handleLanguage} />
        </Section>

        {/* Connected accounts — read the live Plaid state, not just what was
            linked this session, so an already-connected member sees the truth. */}
        <Section title="CONNECTED ACCOUNTS">
          {(() => {
            const accountCount = plaidConnected
              ? (plaidSummary?.accountCount ?? Math.max(connectedBanks, 1))
              : connectedBanks;
            return (
              <LinkRow
                label="Bank accounts"
                sub={accountCount > 0
                  ? `${accountCount} account${accountCount !== 1 ? 's' : ''} connected`
                  : 'Connect via Plaid'}
                value={accountCount > 0 ? '✓' : ''}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setShowPlaid(true);
                }}
              />
            );
          })()}
        </Section>

        {/* Account — sign out lives here, easy to find */}
        <Section title="ACCOUNT">
          <LinkRow label="Sign out" onPress={handleSignOut} />
          <Divider />
          <LinkRow label="Replay onboarding" sub="Restart the intro experience" onPress={handleResetOnboarding} />
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
          <LinkRow label="Version" value="1.0.0" />
          <Divider />
          <LinkRow label="Rate VAULT"  sub="Help us grow"       onPress={handleRate} />
          <Divider />
          <LinkRow label="Share VAULT" sub="Invite a friend"    onPress={handleShare} />
        </Section>

        {/* Danger zone — kept isolated at the very bottom, behind its own confirm */}
        <Section title="DANGER ZONE">
          <LinkRow label="Delete account" sub="Permanently erase your account and data" onPress={handleDeleteAccount} danger />
        </Section>

        <Text style={styles.footer}>VAULT · Building wealth differently</Text>

      </ScrollView>

      {/* Inline overlays — rendered last so they stack above the scroll content */}
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
      <PickerSheet
        visible={showQuietStart}
        title="Quiet hours begin"
        options={HOUR_LABELS}
        selected={fmtHour(quietStart)}
        onSelect={v => setQuietStart(HOUR_LABELS.indexOf(v))}
        onClose={() => { setShowQuietStart(false); setShowQuietEnd(true); }}
      />
      <PickerSheet
        visible={showQuietEnd}
        title="Quiet hours end"
        options={HOUR_LABELS}
        selected={fmtHour(quietEnd)}
        onSelect={v => setQuietEnd(HOUR_LABELS.indexOf(v))}
        onClose={() => setShowQuietEnd(false)}
      />
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

  permBanner: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 6,
    backgroundColor: COLORS.goldGlow,
  },
  permBannerTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 17 },
  permBannerCta: { fontSize: FONTS.sizes.xs, color: COLORS.gold, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },

  footer: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    textAlign: 'center', letterSpacing: FONTS.tracking.widest,
    paddingTop: SPACING.sm,
  },
});

// Spreading StyleSheet.absoluteFill yields {} (it's a registered style ref,
// not an object) — the original backdrop had no positioning at all. Literal
// fill values sidestep that and the stale @types/react-native pin.
const ABSOLUTE_FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

const pickerStyles = StyleSheet.create({
  root: {
    ...ABSOLUTE_FILL,
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    ...ABSOLUTE_FILL,
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
  optionList: { maxHeight: 360 },
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

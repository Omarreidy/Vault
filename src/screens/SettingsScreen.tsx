import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Switch, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MOCK_USER } from '../services/mockData';
import TierBadge from '../components/TierBadge';
import { COLORS, FONTS, SPACING, RADIUS, TIERS, CARD_SHADOW } from '../constants/theme';
import { resetOnboarding, useUserName } from '../services/onboarding';
import PlaidLinkScreen from './PlaidLinkScreen';
import UpgradeScreen from './UpgradeScreen';

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

interface Props {
  onClose: () => void;
  onResetOnboarding?: () => void;
}

export default function SettingsScreen({ onClose, onResetOnboarding }: Props) {
  const { tier } = MOCK_USER;
  const name = useUserName(MOCK_USER.name);
  const info = TIERS[tier];

  // Notification toggles
  const [notifMoves,   setNotifMoves]   = useState(true);
  const [notifStreak,  setNotifStreak]  = useState(true);
  const [notifScore,   setNotifScore]   = useState(true);
  const [notifWeekly,  setNotifWeekly]  = useState(true);
  const [notifInsight, setNotifInsight] = useState(false);

  // Preferences
  const [darkMode, setDarkMode] = useState(false);
  const [showPlaid, setShowPlaid] = useState(false);
  const [connectedBanks, setConnectedBanks] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleResetOnboarding = async () => {
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
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <UpgradeScreen
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
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
          <View style={[styles.upgradePill, { borderColor: info.color + '50' }]}>
            <Text style={[styles.upgradeTxt, { color: info.color }]}>
              {tier === 'BLACK' ? 'Max tier' : 'Upgrade →'}
            </Text>
          </View>
        </View>

        {/* Subscription */}
        <Section title="MEMBERSHIP">
          <LinkRow label="Current plan" value="Free" onPress={() => {}} />
          <Divider />
          <LinkRow
            label="Upgrade to Premium"
            sub="$13/mo · Unlimited concierge · All features"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setShowUpgrade(true); }}
          />
          <Divider />
          <LinkRow label="Restore purchase" onPress={() => {}} />
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
          <LinkRow label="Currency" value="USD" onPress={() => {}} />
          <Divider />
          <LinkRow label="Language" value="English" onPress={() => {}} />
          <Divider />
          <ToggleRow label="Dark mode" sub="Coming soon" value={darkMode} onChange={setDarkMode} />
        </Section>

        {/* Connected accounts */}
        <Section title="CONNECTED ACCOUNTS">
          <LinkRow
            label="Bank accounts"
            sub={connectedBanks > 0 ? `${connectedBanks} account${connectedBanks !== 1 ? 's' : ''} connected` : 'Connect via Plaid'}
            value={connectedBanks > 0 ? '✓' : ''}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setShowPlaid(true); }}
          />
          <Divider />
          <LinkRow label="Investment accounts" sub="Brokerage sync — coming soon" onPress={() => {}} />
        </Section>

        {/* Privacy */}
        <Section title="PRIVACY & DATA">
          <LinkRow label="Privacy policy"    onPress={() => {}} />
          <Divider />
          <LinkRow label="Terms of service"  onPress={() => {}} />
          <Divider />
          <LinkRow label="Export my data"    sub="Download a copy of your data" onPress={() => {}} />
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <LinkRow label="Version"    value="1.0.0 (1)" onPress={() => {}} />
          <Divider />
          <LinkRow label="Rate VAULT" sub="Help us grow"  onPress={() => {}} />
          <Divider />
          <LinkRow label="Share VAULT" sub="Invite a friend" onPress={() => {}} />
        </Section>

        {/* Danger zone */}
        <Section title="ACCOUNT">
          <LinkRow label="Replay onboarding" sub="For testing" onPress={handleResetOnboarding} />
          <Divider />
          <LinkRow label="Sign out"     onPress={() => {}} />
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

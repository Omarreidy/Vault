import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Share, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import { REFERRAL, ReferralInvite } from '../services/referral';

function SpotDot({ filled, index }: { filled: boolean; index: number }) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      delay: index * 80,
      tension: 120,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <Animated.View style={[
      styles.spot,
      filled ? styles.spotFilled : styles.spotEmpty,
      { transform: [{ scale }] },
    ]}>
      {filled && <Text style={styles.spotCheck}>✓</Text>}
    </Animated.View>
  );
}

function InviteRow({ invite, index }: { invite: ReferralInvite; index: number }) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: 400 + index * 100, useNativeDriver: false }),
      Animated.timing(slideY,  { toValue: 0, duration: 320, delay: 400 + index * 100, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.inviteRow, { opacity, transform: [{ translateY: slideY }] }]}>
      <View style={[styles.inviteAvatar, invite.status === 'accepted' && styles.inviteAvatarAccepted]}>
        <Text style={[styles.inviteInitials, invite.status === 'accepted' && { color: COLORS.gold }]}>
          {invite.initials}
        </Text>
      </View>
      <View style={styles.inviteInfo}>
        <Text style={styles.inviteName}>{invite.name}</Text>
        <Text style={styles.inviteTime}>
          {invite.status === 'accepted' ? `Joined ${invite.daysAgo}d ago` : 'Invite sent · Pending'}
        </Text>
      </View>
      <View style={[styles.inviteStatusBadge, invite.status === 'accepted' ? styles.badgeAccepted : styles.badgePending]}>
        <Text style={[styles.inviteStatusTxt, invite.status === 'accepted' ? styles.badgeAcceptedTxt : styles.badgePendingTxt]}>
          {invite.status === 'accepted' ? `+${invite.xpEarned} XP` : 'Pending'}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ReferralCard() {
  const [copied, setCopied] = useState(false);
  const xpScale   = useRef(new Animated.Value(0.88)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(xpScale,   { toValue: 1, useNativeDriver: false, tension: 60, friction: 9, delay: 200 }),
      Animated.timing(xpOpacity, { toValue: 1, duration: 400, useNativeDriver: false, delay: 200 }),
    ]).start();
  }, []);

  const handleCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (Platform.OS === 'web') {
      try { (navigator as any).clipboard?.writeText(`https://${REFERRAL.inviteLink}`); } catch {}
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        message:
          `Join my VAULT cohort — we're building wealth together.\n\n` +
          `Use my link: https://${REFERRAL.inviteLink}\n` +
          `Code: ${REFERRAL.inviteCode}\n\n` +
          `You'll be matched with people at your exact financial stage. We both get +${REFERRAL.xpPerReferral} XP when you join.`,
      });
    } catch {}
  };

  const spotsLeft = REFERRAL.cohortSpotsTotal - REFERRAL.cohortSpotsFilled;

  return (
    <View style={styles.wrap}>

      {/* XP earned card */}
      <Animated.View style={[styles.xpCard, CARD_SHADOW, { opacity: xpOpacity, transform: [{ scale: xpScale }] }]}>
        <View style={styles.topAccent} />
        <View style={styles.xpInner}>
          <View>
            <Text style={styles.xpEyebrow}>XP EARNED FROM REFERRALS</Text>
            <Text style={styles.xpVal}>{REFERRAL.totalXpEarned} XP</Text>
          </View>
          <View style={styles.xpRight}>
            <Text style={styles.xpPerLabel}>per referral</Text>
            <Text style={styles.xpPerVal}>+{REFERRAL.xpPerReferral}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Cohort spots */}
      <View style={[styles.spotsCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
        <Text style={styles.sectionEye}>COHORT SPOTS</Text>
        <Text style={styles.spotsTitle}>
          {REFERRAL.cohortSpotsFilled} of {REFERRAL.cohortSpotsTotal} filled
          {'  '}<Text style={styles.spotsLeft}>{spotsLeft} open</Text>
        </Text>
        <View style={styles.spotsRow}>
          {Array.from({ length: REFERRAL.cohortSpotsTotal }).map((_, i) => (
            <SpotDot key={i} filled={i < REFERRAL.cohortSpotsFilled} index={i} />
          ))}
        </View>
        <Text style={styles.spotsSub}>
          Each person you invite joins your cohort and builds alongside you.
        </Text>
      </View>

      {/* Invite link */}
      <View style={[styles.linkCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
        <Text style={styles.sectionEye}>YOUR INVITE LINK</Text>
        <View style={styles.linkRow}>
          <Text style={styles.linkTxt} numberOfLines={1}>{REFERRAL.inviteLink}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
            <Text style={styles.copyTxt}>{copied ? '✓ Copied' : 'Copy'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <Text style={styles.shareBtnTxt}>Invite to Your Cohort  →</Text>
        </TouchableOpacity>
      </View>

      {/* Invite history */}
      <View style={[styles.historyCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
        <Text style={styles.sectionEye}>INVITES SENT · {REFERRAL.invites.length}</Text>
        <View style={styles.historyList}>
          {REFERRAL.invites.map((inv, i) => (
            <InviteRow key={inv.id} invite={inv} index={i} />
          ))}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.lg },

  xpCard: {
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  topAccent: { height: 2, backgroundColor: COLORS.gold },
  xpInner: {
    padding: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpEyebrow: {
    fontSize: 9,
    color: COLORS.gold,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.widest,
    marginBottom: 6,
  },
  xpVal: {
    fontFamily: FONTS.display,
    fontSize: 42,
    fontWeight: FONTS.weights.light,
    color: COLORS.background,
    letterSpacing: -1,
  },
  xpRight: { alignItems: 'flex-end', gap: 4 },
  xpPerLabel: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(242,239,233,0.4)',
    letterSpacing: FONTS.tracking.wide,
  },
  xpPerVal: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.gold,
  },

  spotsCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionEye: {
    fontSize: 9,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
  },
  spotsTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  spotsLeft: { color: COLORS.gold },
  spotsRow: { flexDirection: 'row', gap: SPACING.md },
  spot: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  spotFilled: { backgroundColor: COLORS.goldDark },
  spotEmpty: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  spotCheck: { fontSize: 16, color: '#FFF', fontWeight: FONTS.weights.bold },
  spotsSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    lineHeight: 17,
    letterSpacing: FONTS.tracking.wide,
  },

  linkCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingLeft: SPACING.md,
    overflow: 'hidden',
  },
  linkTxt: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    letterSpacing: FONTS.tracking.wide,
    paddingVertical: SPACING.md,
  },
  copyBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.text,
    minWidth: 72,
    alignItems: 'center',
  },
  copyTxt: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.background,
    letterSpacing: FONTS.tracking.wide,
  },
  shareBtn: {
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnTxt: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.background,
    letterSpacing: FONTS.tracking.wide,
  },

  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  historyList: { gap: SPACING.md },

  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  inviteAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.sheetBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  inviteAvatarAccepted: {
    borderColor: COLORS.gold + '60',
    backgroundColor: COLORS.goldGlow,
  },
  inviteInitials: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textDim,
    letterSpacing: 0.5,
  },
  inviteInfo: { flex: 1, gap: 2 },
  inviteName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  inviteTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wide,
  },
  inviteStatusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  badgeAccepted: {
    backgroundColor: COLORS.goldGlow,
    borderColor: COLORS.gold + '40',
  },
  badgePending: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  inviteStatusTxt: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.wide,
  },
  badgeAcceptedTxt: { color: COLORS.goldDark },
  badgePendingTxt: { color: COLORS.textMuted },
});

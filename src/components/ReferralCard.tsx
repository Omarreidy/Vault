import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Platform,
  TextInput, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import {
  ReferralInfo, ReferralInvite, fetchReferralInfo, redeemReferralCode,
  shareInvite, XP_PER_REFERRAL, COHORT_SPOTS, REDEEM_ERROR_MESSAGES,
} from '../services/referral';
import { addXP } from '../services/progressStats';

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

  const initials = invite.name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Animated.View style={[styles.inviteRow, { opacity, transform: [{ translateY: slideY }] }]}>
      <View style={[styles.inviteAvatar, styles.inviteAvatarAccepted]}>
        <Text style={[styles.inviteInitials, { color: COLORS.gold }]}>{initials}</Text>
      </View>
      <View style={styles.inviteInfo}>
        <Text style={styles.inviteName}>{invite.name}</Text>
        <Text style={styles.inviteTime}>
          {invite.daysAgo === 0 ? 'Joined today' : `Joined ${invite.daysAgo}d ago`}
        </Text>
      </View>
      <View style={[styles.inviteStatusBadge, styles.badgeAccepted]}>
        <Text style={[styles.inviteStatusTxt, styles.badgeAcceptedTxt]}>
          +{XP_PER_REFERRAL} XP
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ReferralCard() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const [codeInput, setCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const xpScale   = useRef(new Animated.Value(0.88)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const data = await fetchReferralInfo();
    setInfo(data);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(xpScale,   { toValue: 1, useNativeDriver: false, tension: 60, friction: 9, delay: 200 }),
      Animated.timing(xpOpacity, { toValue: 1, duration: 400, useNativeDriver: false, delay: 200 }),
    ]).start();
  }, []);

  const handleCopy = () => {
    if (!info?.code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (Platform.OS === 'web') {
      try { (navigator as any).clipboard?.writeText(info.code); } catch {}
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // No clipboard module in this build — the share sheet covers native.
      shareInvite(info.code);
    }
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    shareInvite(info?.code);
  };

  const handleRedeem = async () => {
    const code = codeInput.trim();
    if (!code || redeeming) return;
    setRedeeming(true);
    setRedeemMsg(null);
    const result = await redeemReferralCode(code);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await addXP(result.xp ?? XP_PER_REFERRAL);
      setRedeemMsg({ ok: true, text: `Code accepted — +${result.xp ?? XP_PER_REFERRAL} XP added ✓` });
      setCodeInput('');
      load();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setRedeemMsg({ ok: false, text: REDEEM_ERROR_MESSAGES[result.error ?? 'network'] });
    }
    setRedeeming(false);
  };

  if (!loaded) {
    return (
      <View style={[styles.loadingCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  if (!info) {
    return (
      <View style={[styles.loadingCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
        <Text style={styles.errorTxt}>Couldn't load your referral info.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoaded(false); load(); }} activeOpacity={0.85}>
          <Text style={styles.retryTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filled = Math.min(info.invites.length, COHORT_SPOTS);
  const spotsLeft = COHORT_SPOTS - filled;

  return (
    <View style={styles.wrap}>

      {/* XP earned card */}
      <Animated.View style={[styles.xpCard, CARD_SHADOW, { opacity: xpOpacity, transform: [{ scale: xpScale }] }]}>
        <View style={styles.topAccent} />
        <View style={styles.xpInner}>
          <View>
            <Text style={styles.xpEyebrow}>XP EARNED FROM REFERRALS</Text>
            <Text style={styles.xpVal}>{info.xpEarned} XP</Text>
          </View>
          <View style={styles.xpRight}>
            <Text style={styles.xpPerLabel}>per referral</Text>
            <Text style={styles.xpPerVal}>+{XP_PER_REFERRAL}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Cohort spots */}
      <View style={[styles.spotsCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
        <Text style={styles.sectionEye}>COHORT SPOTS</Text>
        <Text style={styles.spotsTitle}>
          {filled} of {COHORT_SPOTS} filled
          {'  '}<Text style={styles.spotsLeft}>{spotsLeft} open</Text>
        </Text>
        <View style={styles.spotsRow}>
          {Array.from({ length: COHORT_SPOTS }).map((_, i) => (
            <SpotDot key={i} filled={i < filled} index={i} />
          ))}
        </View>
        <Text style={styles.spotsSub}>
          Each person you invite joins your cohort and builds alongside you.
        </Text>
      </View>

      {/* Invite code */}
      <View style={[styles.linkCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
        <Text style={styles.sectionEye}>YOUR INVITE CODE</Text>
        <View style={styles.linkRow}>
          <Text style={styles.codeTxt} numberOfLines={1}>{info.code}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
            <Text style={styles.copyTxt}>
              {copied ? '✓ Copied' : Platform.OS === 'web' ? 'Copy' : 'Share'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <Text style={styles.shareBtnTxt}>Invite to Your Cohort  →</Text>
        </TouchableOpacity>
      </View>

      {/* Redeem a code */}
      {!info.redeemed && (
        <View style={[styles.linkCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
          <Text style={styles.sectionEye}>HAVE AN INVITE CODE?</Text>
          <View style={styles.linkRow}>
            <TextInput
              style={styles.codeInput}
              value={codeInput}
              onChangeText={text => { setCodeInput(text.toUpperCase()); setRedeemMsg(null); }}
              placeholder="Enter code"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              returnKeyType="done"
              onSubmitEditing={handleRedeem}
            />
            <TouchableOpacity
              style={[styles.copyBtn, (!codeInput.trim() || redeeming) && { opacity: 0.5 }]}
              onPress={handleRedeem}
              activeOpacity={0.8}
              disabled={!codeInput.trim() || redeeming}
            >
              {redeeming
                ? <ActivityIndicator size="small" color={COLORS.background} />
                : <Text style={styles.copyTxt}>Apply</Text>}
            </TouchableOpacity>
          </View>
          {redeemMsg && (
            <Text style={[styles.redeemMsg, { color: redeemMsg.ok ? COLORS.gold : COLORS.textDim }]}>
              {redeemMsg.text}
            </Text>
          )}
          <Text style={styles.spotsSub}>
            Joined through a friend? Enter their code — you both earn +{XP_PER_REFERRAL} XP.
          </Text>
        </View>
      )}
      {info.redeemed && redeemMsg?.ok && (
        <Text style={[styles.redeemMsg, { color: COLORS.gold }]}>{redeemMsg.text}</Text>
      )}

      {/* Invite history */}
      <View style={[styles.historyCard, CARD_SHADOW, { shadowOpacity: 0.07 }]}>
        <Text style={styles.sectionEye}>INVITES ACCEPTED · {info.invites.length}</Text>
        {info.invites.length === 0 ? (
          <Text style={styles.emptyTxt}>
            No invites accepted yet. Share your code — you'll see everyone who joins
            through it here.
          </Text>
        ) : (
          <View style={styles.historyList}>
            {info.invites.map((inv, i) => (
              <InviteRow key={`${inv.name}-${i}`} invite={inv} index={i} />
            ))}
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.lg },

  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.full,
  },
  retryTxt: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.background,
    letterSpacing: FONTS.tracking.wide,
  },

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
  codeTxt: {
    flex: 1,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: 3,
    paddingVertical: SPACING.md,
  },
  codeInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    letterSpacing: 2,
    paddingVertical: SPACING.md,
  },
  copyBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.text,
    minWidth: 72,
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
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
  redeemMsg: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
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
  emptyTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    lineHeight: 20,
  },

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
  inviteStatusTxt: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.wide,
  },
  badgeAcceptedTxt: { color: COLORS.goldDark },
});

import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Share, SafeAreaView, Animated, Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import WealthWinCard from './WealthWinCard';
import { WealthWin } from '../types';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW_STRONG } from '../constants/theme';
import { MOCK_USER } from '../services/mockData';
import { TIERS } from '../constants/theme';

const { height } = Dimensions.get('window');

interface Props {
  win: WealthWin | null;
  visible: boolean;
  onClose: () => void;
}

export default function WinShareModal({ win, visible, onClose }: Props) {
  const btnScale = useRef(new Animated.Value(1)).current;

  if (!win) return null;

  const handleShare = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.94, duration: 80, useNativeDriver: false }),
      Animated.timing(btnScale, { toValue: 1,    duration: 120, useNativeDriver: false }),
    ]).start();

    const tierInfo = TIERS[MOCK_USER.tier];
    await Share.share({
      message:
        `${win.title}\n` +
        `${win.value}\n\n` +
        `${win.subtitle}\n\n` +
        `Tracked with VAULT · ${tierInfo.name} Member`,
      title: `VAULT Win — ${win.title}`,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Share Your Win</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Card preview */}
        <View style={styles.previewArea}>
          <WealthWinCard
            win={win}
            userName={MOCK_USER.name}
            tier={TIERS[MOCK_USER.tier].name}
          />
          <Text style={styles.previewHint}>
            Screenshot this and share it anywhere
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Animated.View style={[styles.shareWrap, { transform: [{ scale: btnScale }] }]}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.88}>
              <Text style={styles.shareBtnTxt}>Share</Text>
              <Text style={styles.shareBtnIcon}>↑</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelTxt}>Not now</Text>
          </TouchableOpacity>
        </View>

        {/* Social proof nudge */}
        <Text style={styles.nudge}>
          Members who share wins are 2× more likely to hit their next tier
        </Text>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.sheetBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  closeTxt: { fontSize: 20, color: COLORS.textDim, lineHeight: 22 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  previewHint: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wide,
    textAlign: 'center',
  },

  actions: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  shareWrap: { width: '100%' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    ...CARD_SHADOW_STRONG,
    shadowOpacity: 0.15,
  },
  shareBtnTxt: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.background,
    letterSpacing: FONTS.tracking.wide,
  },
  shareBtnIcon: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.background,
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wide,
  },

  nudge: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    letterSpacing: FONTS.tracking.normal,
    lineHeight: 18,
  },
});

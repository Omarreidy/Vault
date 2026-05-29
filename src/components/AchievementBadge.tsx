import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Achievement } from '../services/achievements';
import { COLORS, FONTS, RADIUS, CARD_SHADOW } from '../constants/theme';

const RARITY_COLORS = {
  common: COLORS.tierSilver,
  rare: COLORS.gold,
  legendary: '#9B59B6',
};

interface Props {
  achievement: Achievement;
  size?: 'sm' | 'md';
}

export default function AchievementBadge({ achievement, size = 'md' }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const rarityColor = RARITY_COLORS[achievement.rarity];
  const isSmall = size === 'sm';

  const onPress = () => {
    if (!achievement.unlocked) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
    ]).start();
  };

  const hasProgress = !achievement.unlocked && achievement.progress !== undefined && achievement.target !== undefined;
  const pct = hasProgress ? Math.round((achievement.progress! / achievement.target!) * 100) : 0;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.badge,
          isSmall && styles.badgeSm,
          achievement.unlocked ? [styles.unlocked, { borderColor: rarityColor + '50' }, CARD_SHADOW, { shadowOpacity: 0.08, shadowRadius: 12 }]
                                : styles.locked,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.icon, isSmall && styles.iconSm, !achievement.unlocked && styles.iconLocked]}>
          {achievement.icon}
        </Text>
        <Text style={[styles.title, isSmall && styles.titleSm, !achievement.unlocked && styles.textLocked]} numberOfLines={2}>
          {achievement.title}
        </Text>
        {achievement.unlocked && achievement.unlockedAt && !isSmall && (
          <Text style={styles.date}>
            {achievement.unlockedAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Text>
        )}
        {hasProgress && !isSmall && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: rarityColor }]} />
            </View>
            <Text style={styles.progressTxt}>{pct}%</Text>
          </View>
        )}
        {!achievement.unlocked && !hasProgress && (
          <Text style={styles.lockTxt}>—</Text>
        )}
        {achievement.unlocked && (
          <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: 'center',
    gap: 5,
    minHeight: 110,
    flex: 1,
  },
  badgeSm: { padding: 10, minHeight: 80 },
  unlocked: { borderColor: COLORS.border },
  locked: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.sheetBg,
    opacity: 0.6,
  },
  icon: { fontSize: 24, fontFamily: FONTS.display },
  iconSm: { fontSize: 18 },
  iconLocked: { opacity: 0.4 },
  title: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, color: COLORS.text, textAlign: 'center', lineHeight: 15, letterSpacing: FONTS.tracking.wide },
  titleSm: { fontSize: 9 },
  textLocked: { color: COLORS.textMuted },
  date: { fontSize: 9, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  rarityDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  lockTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  progressWrap: { width: '100%', gap: 3 },
  progressTrack: { height: 2, backgroundColor: COLORS.border, borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 1 },
  progressTxt: { fontSize: 9, color: COLORS.textMuted, textAlign: 'right', letterSpacing: FONTS.tracking.wide },
});

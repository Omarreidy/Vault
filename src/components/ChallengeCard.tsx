import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Challenge } from '../services/challenges';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

interface Props {
  challenge: Challenge;
  onComplete?: (id: string) => void;
}

export default function ChallengeCard({ challenge, onComplete }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const progress = Math.min(challenge.progress / challenge.target, 1);
  const pct = Math.round(progress * 100);

  const handlePress = () => {
    if (challenge.completed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => onComplete?.(challenge.id));
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.card, challenge.completed && styles.cardDone, CARD_SHADOW, { shadowOpacity: 0.07, shadowRadius: 12 }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <View style={styles.top}>
          <Text style={[styles.icon, challenge.completed && styles.iconDone]}>{challenge.icon}</Text>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardTxt}>+{challenge.reward} pts</Text>
          </View>
        </View>
        <Text style={[styles.title, challenge.completed && styles.titleDone]}>{challenge.title}</Text>
        <Text style={styles.desc}>{challenge.description}</Text>

        {/* Progress bar */}
        <View style={styles.barTrack}>
          <View style={[styles.barFill, {
            width: `${pct}%` as any,
            backgroundColor: challenge.completed ? COLORS.green : COLORS.gold,
          }]} />
        </View>
        <Text style={styles.progressTxt}>
          {challenge.completed ? 'Complete ✓' : `${challenge.progress} / ${challenge.target}`}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 6,
  },
  cardDone: {
    borderColor: COLORS.green + '40',
    backgroundColor: COLORS.green + '06',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { fontFamily: FONTS.display, fontSize: 20, color: COLORS.gold },
  iconDone: { color: COLORS.green },
  rewardBadge: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
  },
  rewardTxt: { fontSize: FONTS.sizes.xs, color: COLORS.gold, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },
  title: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.text, lineHeight: 18 },
  titleDone: { color: COLORS.textDim },
  desc: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 16 },
  barTrack: { height: 2, backgroundColor: COLORS.border, borderRadius: 1, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 1 },
  progressTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
});

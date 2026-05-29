import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TierName } from '../types';
import { COLORS, FONTS, TIERS } from '../constants/theme';

const TIER_ROMAN: Record<TierName, string> = {
  BRONZE: 'I', SILVER: 'II', GOLD: 'III', PLATINUM: 'IV', BLACK: 'V',
};

interface Props {
  tier: TierName;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function TierBadge({ tier, size = 'md', showLabel = true }: Props) {
  const info = TIERS[tier];
  const dim = size === 'sm' ? 34 : size === 'lg' ? 64 : 46;
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 22 : 15;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.ring,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            borderColor: info.color,
            shadowColor: info.color,
          },
        ]}
      >
        {/* Inner fill hint */}
        <View style={[styles.innerFill, { backgroundColor: info.color, borderRadius: dim / 2 }]} />
        <Text style={[styles.numeral, { fontSize, color: info.color, fontFamily: FONTS.display }]}>
          {TIER_ROMAN[tier]}
        </Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: info.color }]}>
          {info.name.toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
  ring: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  innerFill: {
    position: 'absolute',
    inset: 0,
    opacity: 0.06,
  },
  numeral: {
    fontWeight: FONTS.weights.light,
  },
  label: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: FONTS.tracking.widest,
  },
});

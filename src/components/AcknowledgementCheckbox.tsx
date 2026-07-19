import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

interface Props {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

// Deliberate, satisfying acknowledgement: whole row is tappable, the box pops
// on check, and the state is exposed to screen readers as a real checkbox.
export default function AcknowledgementCheckbox({ label, checked, onToggle }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.15, tension: 300, friction: 6, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 300, friction: 6, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  return (
    <TouchableOpacity
      style={[styles.row, checked && styles.rowChecked]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[styles.box, checked && styles.boxChecked, { transform: [{ scale }] }]}
      >
        {checked && <Text style={styles.check}>✓</Text>}
      </Animated.View>
      <Text style={[styles.label, checked && styles.labelChecked]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#1E1C1A',
    backgroundColor: '#111014',
  },
  rowChecked: {
    borderColor: 'rgba(201,169,110,0.45)',
    backgroundColor: 'rgba(201,169,110,0.06)',
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#4A4540',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.gold,
  },
  check: {
    fontSize: 14,
    fontWeight: FONTS.weights.heavy,
    color: '#08080C',
    lineHeight: 17,
  },
  label: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    lineHeight: 20,
    color: '#B0A99F',
  },
  labelChecked: {
    color: '#E8E0D5',
  },
});

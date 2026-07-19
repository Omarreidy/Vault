import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

// One-line disclaimer placed at the point of reliance — quiet enough not to
// hurt the design, conspicuous enough to count. Reuse on any surface that
// presents estimates, research, or AI-generated conclusions.
export default function InlineDisclaimer({ text }: { text: string }) {
  return (
    <View style={styles.row} accessibilityRole="text">
      <Text style={styles.icon}>ⓘ</Text>
      <Text style={styles.txt}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  icon: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 1,
  },
  txt: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textDim,
    letterSpacing: FONTS.tracking.wide,
  },
});

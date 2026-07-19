import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

interface Props {
  icon: string;
  title: string;
  body: string;
}

// Dark, premium disclosure card — reusable anywhere a feature needs a
// conspicuous plain-language disclaimer (acknowledgement screen, future
// feature intros, upgrade flows).
export default function DisclaimerCard({ icon, title, body }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.iconBadge}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#1E1C1A',
    backgroundColor: '#111014',
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(201,169,110,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,110,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
    color: COLORS.gold,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: '#E8E0D5',
    letterSpacing: FONTS.tracking.tight,
    marginBottom: 4,
  },
  body: {
    fontSize: FONTS.sizes.md,
    lineHeight: 20,
    color: '#B0A99F',
  },
});

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { WealthMove } from '../types';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW_STRONG } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - SPACING.xl * 2, 420);

const CATEGORY_META: Record<string, { accent: string; tag: string }> = {
  savings:    { accent: COLORS.green,        tag: 'SAVINGS'     },
  investment: { accent: COLORS.gold,         tag: 'INVESTMENT'  },
  debt:       { accent: COLORS.tierSilver,   tag: 'DEBT'        },
  spending:   { accent: COLORS.tierPlatinum, tag: 'SPENDING'    },
  opportunity:{ accent: '#C9A96E',           tag: 'OPPORTUNITY' },
};

const EFFORT_LABELS = { instant: '< 1 min', quick: '5 min', medium: '30 min' };

interface Props {
  move: WealthMove;
  onAccept: () => void;
  onSkip: () => void;
}

export default function WealthCard({ move, onAccept, onSkip }: Props) {
  const meta = CATEGORY_META[move.category] ?? CATEGORY_META.opportunity;
  const acceptScale = useRef(new Animated.Value(1)).current;
  const skipScale = useRef(new Animated.Value(1)).current;

  const press = (anim: Animated.Value, cb: () => void) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(cb);
  };

  return (
    <View style={[styles.card, { width: CARD_WIDTH }, CARD_SHADOW_STRONG]}>
      {/* Top accent */}
      <View style={[styles.accent, { backgroundColor: meta.accent }]} />

      <View style={styles.inner}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={[styles.tag, { backgroundColor: meta.accent + '15', borderColor: meta.accent + '30' }]}>
            <Text style={[styles.tagText, { color: meta.accent }]}>{meta.tag}</Text>
          </View>
          <Text style={styles.effort}>{EFFORT_LABELS[move.effort]}</Text>
        </View>

        {/* Content */}
        <View style={styles.body}>
          <Text style={styles.title}>{move.title}</Text>
          <Text style={styles.desc}>{move.description}</Text>
        </View>

        {/* Impact — the hero number */}
        <View style={styles.impactBlock}>
          <Text style={styles.impactLabel}>POTENTIAL VALUE</Text>
          <Text style={[styles.impactNum, { color: meta.accent, fontFamily: FONTS.display }]}>
            {move.impact}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Actions */}
        <View style={styles.actions}>
          <Animated.View style={{ flex: 1, transform: [{ scale: skipScale }] }}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => press(skipScale, onSkip)}
              activeOpacity={1}
            >
              <Text style={styles.skipTxt}>Skip</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ flex: 2.5, transform: [{ scale: acceptScale }] }}>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: meta.accent }]}
              onPress={() => press(acceptScale, onAccept)}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptTxt}>{move.actionLabel}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  accent: { height: 3 },
  inner: { padding: SPACING.lg, gap: SPACING.md, minHeight: 360 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tagText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  effort: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },

  body: { flex: 1, gap: 10, paddingTop: SPACING.sm },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    lineHeight: FONTS.sizes.xl * 1.3,
    letterSpacing: FONTS.tracking.tight,
  },
  desc: { fontSize: FONTS.sizes.md, color: COLORS.textDim, lineHeight: FONTS.sizes.md * 1.7 },

  impactBlock: { gap: 4 },
  impactLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  impactNum: { fontSize: 42, fontWeight: FONTS.weights.light, lineHeight: 46, letterSpacing: -1 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  actions: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'stretch' },
  skipBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  skipTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, letterSpacing: FONTS.tracking.wide },
  acceptBtn: { flex: 2.5, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  acceptTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: '#FFFFFF', letterSpacing: FONTS.tracking.wide },
});

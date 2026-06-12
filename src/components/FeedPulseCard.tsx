import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Insight } from '../services/insights';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const { width } = Dimensions.get('window');

const TAG_COLORS: Record<string, string> = {
  MACRO:   COLORS.tierSilver,
  MARKETS: COLORS.gold,
  CAREER:  COLORS.goldDark,
  CREDIT:  COLORS.gold,
  ECONOMY: COLORS.tierPlatinum,
};

const IMPACT_COLORS: Record<string, string> = {
  positive: COLORS.goldDark,
  negative: COLORS.red,
  neutral:  COLORS.gold,
};

interface Props {
  insight: Insight;
  onSave: () => void;
  onAskConcierge?: () => void;
  index: number;
  total: number;
}

export default function FeedPulseCard({ insight, onSave, onAskConcierge, index, total }: Props) {
  const [saved, setSaved] = useState(insight.saved);
  const saveScale = useRef(new Animated.Value(1)).current;
  const tagColor    = TAG_COLORS[insight.tag]    ?? COLORS.gold;
  const impactColor = IMPACT_COLORS[insight.impactType] ?? COLORS.gold;

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(saveScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(saveScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
    ]).start();
    setSaved(s => !s);
    onSave();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topAccent, { backgroundColor: tagColor }]} />
      <View style={styles.inner}>

        <View style={styles.topRow}>
          <View style={[styles.tag, { backgroundColor: tagColor + '15', borderColor: tagColor + '35' }]}>
            <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
            <Text style={[styles.tagTxt, { color: tagColor }]}>{insight.tag}</Text>
          </View>
          <View style={styles.topRight}>
            <Text style={styles.counter}>{index + 1} / {total}</Text>
            <Animated.View style={{ transform: [{ scale: saveScale }] }}>
              <TouchableOpacity onPress={handleSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={[styles.saveIcon, saved && { color: COLORS.gold }]}>
                  {saved ? '◆' : '◇'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.eyebrow}>PULSE · {insight.timeAgo.toUpperCase()}</Text>
          <Text style={styles.headline} numberOfLines={4}>{insight.headline}</Text>
          <View style={styles.divider} />
          <Text style={styles.bodyTxt} numberOfLines={5}>{insight.body}</Text>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.impactHeader}>WHAT THIS MEANS FOR YOU</Text>
          <View style={[styles.impactPill, { borderColor: impactColor + '40', backgroundColor: impactColor + '10' }]}>
            <View style={[styles.impactDot, { backgroundColor: impactColor }]} />
            <Text style={[styles.impactTxt, { color: impactColor }]}>{insight.impact}</Text>
          </View>
          {onAskConcierge && (
            <TouchableOpacity style={styles.conciergeBtn} onPress={onAskConcierge} activeOpacity={0.8}>
              <Text style={styles.conciergeTxt}>✦ Ask Concierge about this</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.swipeHint}>↑ swipe for next</Text>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width, backgroundColor: COLORS.background },
  topAccent: { height: 3 },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 80,
    paddingBottom: SPACING.xl,
    justifyContent: 'space-between',
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  tagDot: { width: 5, height: 5, borderRadius: 2.5 },
  tagTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counter: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  saveIcon: { fontSize: 18, color: COLORS.textMuted, fontFamily: FONTS.display },

  body: { flex: 1, justifyContent: 'center', gap: 16, overflow: 'hidden' },
  eyebrow: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  headline: {
    fontSize: 26,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    lineHeight: 34,
    letterSpacing: FONTS.tracking.tight,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  bodyTxt: { fontSize: FONTS.sizes.md, color: COLORS.textDim, lineHeight: FONTS.sizes.md * 1.75 },

  bottom: { gap: 12 },
  impactHeader: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  impactPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: RADIUS.lg, borderWidth: 1,
  },
  impactDot: { width: 6, height: 6, borderRadius: 3 },
  impactTxt: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, lineHeight: 22 },
  swipeHint: { textAlign: 'center', fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wider },
  conciergeBtn: {
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '50',
    backgroundColor: COLORS.goldGlow,
  },
  conciergeTxt: { fontSize: FONTS.sizes.xs, color: COLORS.gold, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },
});

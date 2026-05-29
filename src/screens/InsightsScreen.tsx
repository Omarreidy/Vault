import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { INSIGHTS, Insight } from '../services/insights';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const IMPACT_COLORS = {
  positive: COLORS.green,
  negative: COLORS.red,
  neutral: COLORS.gold,
};

const IMPACT_BG = {
  positive: COLORS.green + '10',
  negative: COLORS.red + '10',
  neutral: COLORS.goldGlow,
};

function InsightCard({ insight, onSave }: { insight: Insight; onSave: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const impactColor = IMPACT_COLORS[insight.impactType];
  const impactBg = IMPACT_BG[insight.impactType];

  return (
    <TouchableOpacity
      style={[styles.card, CARD_SHADOW, { shadowOpacity: 0.08 }]}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.85}
    >
      <View style={[styles.cardAccent, { backgroundColor: impactColor }]} />
      <View style={styles.cardInner}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={[styles.tagBadge, { backgroundColor: impactBg, borderColor: impactColor + '30' }]}>
            <Text style={[styles.tagTxt, { color: impactColor }]}>{insight.tag}</Text>
          </View>
          <View style={styles.topRight}>
            <Text style={styles.timeAgo}>{insight.timeAgo}</Text>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onSave(insight.id); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.saveIcon, insight.saved && { color: COLORS.gold }]}>
                {insight.saved ? '◆' : '◇'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>{insight.headline}</Text>

        {/* Body — expanded only */}
        {expanded && (
          <Text style={styles.body}>{insight.body}</Text>
        )}

        {/* Impact pill */}
        <View style={[styles.impactPill, { backgroundColor: impactBg, borderColor: impactColor + '30' }]}>
          <View style={[styles.impactDot, { backgroundColor: impactColor }]} />
          <Text style={[styles.impactTxt, { color: impactColor }]}>{insight.impact}</Text>
        </View>

        {!expanded && (
          <Text style={styles.readMore}>Tap to read more →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function InsightsScreen() {
  const [insights, setInsights] = useState<Insight[]>(INSIGHTS);
  const [filter, setFilter] = useState<string>('All');

  const FILTERS = ['All', 'MACRO', 'MARKETS', 'CAREER', 'CREDIT', 'ECONOMY'];

  const toggleSave = (id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, saved: !i.saved } : i));
  };

  const filtered = filter === 'All' ? insights : insights.filter(i => i.tag === filter);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Pulse</Text>
        <Text style={styles.pageSub}>Markets & money — what it means for you.</Text>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          bounces={false}
        >
          {FILTERS.map(f => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.75}
              >
                {active && <View style={styles.chipDot} />}
                <Text style={[styles.filterTxt, active && styles.filterTxtActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.divider} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.map(i => (
          <InsightCard key={i.id} insight={i} onSave={toggleSave} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  pageTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  pageSub: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    marginTop: 3,
    lineHeight: 18,
  },

  filterBar: {
    backgroundColor: COLORS.background,
    paddingBottom: SPACING.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 2,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.gold + '60',
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.gold,
  },
  filterTxt: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textDim,
    fontWeight: FONTS.weights.medium,
    letterSpacing: FONTS.tracking.widest,
  },
  filterTxtActive: {
    color: COLORS.gold,
    fontWeight: FONTS.weights.bold,
  },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },

  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, overflow: 'hidden' },
  cardAccent: { height: 2 },
  cardInner: { padding: SPACING.md, gap: SPACING.md },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  tagTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  timeAgo: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  saveIcon: { fontSize: 16, color: COLORS.textMuted, fontFamily: FONTS.display },

  headline: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, lineHeight: 24, letterSpacing: FONTS.tracking.tight },
  body: { fontSize: FONTS.sizes.md, color: COLORS.textDim, lineHeight: FONTS.sizes.md * 1.7 },

  impactPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, borderWidth: 1 },
  impactDot: { width: 5, height: 5, borderRadius: 2.5 },
  impactTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, flex: 1, lineHeight: 16 },

  readMore: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
});

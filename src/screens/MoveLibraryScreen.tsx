import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ALL_MOVES } from '../services/mockData';
import { fetchPersonalizedMoves } from '../services/feed';
import { usePlaid } from '../context/PlaidContext';
import { WealthMove } from '../types';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const CATEGORIES = [
  { key: 'all',         label: 'All',        icon: '◈' },
  { key: 'savings',     label: 'Savings',    icon: '💰' },
  { key: 'investment',  label: 'Investment', icon: '📈' },
  { key: 'debt',        label: 'Debt',       icon: '⛓'  },
  { key: 'spending',    label: 'Spending',   icon: '🔍' },
  { key: 'opportunity', label: 'Opportunity',icon: '⚡' },
];

const CATEGORY_COLORS: Record<string, string> = {
  savings:     COLORS.green,
  investment:  COLORS.gold,
  debt:        COLORS.tierSilver,
  spending:    COLORS.tierPlatinum,
  opportunity: '#D4A853',
};

const EFFORT_LABELS = { instant: '< 1 min', quick: '5 min', medium: '30 min' };

function MoveRow({ move, onPress }: { move: WealthMove; onPress: () => void }) {
  const accent = CATEGORY_COLORS[move.category] ?? COLORS.gold;
  return (
    <TouchableOpacity
      style={[styles.moveRow, CARD_SHADOW, { shadowOpacity: 0.07 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.moveAccent, { backgroundColor: accent }]} />
      <View style={styles.moveContent}>
        <View style={styles.moveTop}>
          <Text style={styles.moveTitle} numberOfLines={1}>{move.title}</Text>
          <Text style={[styles.moveImpact, { color: accent }]}>{move.impact}</Text>
        </View>
        <Text style={styles.moveDesc} numberOfLines={2}>{move.description}</Text>
        <View style={styles.moveBottom}>
          <View style={[styles.effortPill, { borderColor: accent + '40' }]}>
            <Text style={[styles.effortTxt, { color: accent }]}>{EFFORT_LABELS[move.effort]}</Text>
          </View>
          <Text style={styles.moveCat}>{move.category.toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MoveDetail({ move, onClose }: { move: WealthMove; onClose: () => void }) {
  const accent = CATEGORY_COLORS[move.category] ?? COLORS.gold;
  return (
    <SafeAreaView style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailHeaderTitle}>Wealth Move</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.detailDivider} />
      <ScrollView contentContainerStyle={styles.detailScroll}>
        <View style={[styles.detailAccentLine, { backgroundColor: accent }]} />
        <View style={styles.detailBody}>
          <View style={[styles.detailTag, { backgroundColor: accent + '15', borderColor: accent + '40' }]}>
            <Text style={[styles.detailTagTxt, { color: accent }]}>
              {move.category.toUpperCase()} · {EFFORT_LABELS[move.effort]}
            </Text>
          </View>
          <Text style={styles.detailTitle}>{move.title}</Text>
          <Text style={styles.detailDesc}>{move.description}</Text>

          <View style={[styles.detailImpactCard, { borderColor: accent + '30', backgroundColor: accent + '08' }]}>
            <Text style={styles.detailImpactLabel}>POTENTIAL VALUE</Text>
            <Text style={[styles.detailImpactValue, { color: accent, fontFamily: FONTS.display }]}>
              {move.impact}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.detailCta, { backgroundColor: accent }]}
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); onClose(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.detailCtaTxt}>{move.actionLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailSkip} onPress={onClose}>
            <Text style={styles.detailSkipTxt}>Not right now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface Props { onClose: () => void }

export default function MoveLibraryScreen({ onClose }: Props) {
  const { plaidConnected } = usePlaid();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedMove, setSelectedMove] = useState<WealthMove | null>(null);
  const [personalizedMoves, setPersonalizedMoves] = useState<WealthMove[]>([]);

  useEffect(() => {
    if (plaidConnected) {
      fetchPersonalizedMoves().then(moves => {
        if (moves) setPersonalizedMoves(moves);
      });
    }
  }, [plaidConnected]);

  const allMoves = plaidConnected && personalizedMoves.length > 0
    ? [...personalizedMoves, ...ALL_MOVES.filter(m => !personalizedMoves.find(p => p.id === m.id))]
    : ALL_MOVES;

  const filtered = activeCategory === 'all'
    ? allMoves
    : allMoves.filter(m => m.category === activeCategory);

  const totalImpact = allMoves.reduce((sum, m) => sum + m.impactValue, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Move Library</Text>
          <Text style={styles.headerSub}>{allMoves.length} moves · ${totalImpact.toLocaleString()}+ total opportunity</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {CATEGORIES.map(cat => {
          const active = activeCategory === cat.key;
          const count = cat.key === 'all' ? allMoves.length : allMoves.filter(m => m.category === cat.key).length;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterIcon, active && { opacity: 1 }]}>{cat.icon}</Text>
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{cat.label}</Text>
              <Text style={[styles.filterCount, active && styles.filterCountActive]}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.divider} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.map(move => (
          <MoveRow key={move.id} move={move} onPress={() => setSelectedMove(move)} />
        ))}
      </ScrollView>

      {/* Move detail modal */}
      <Modal visible={!!selectedMove} animationType="slide" presentationStyle="pageSheet">
        {selectedMove && <MoveDetail move={selectedMove} onClose={() => setSelectedMove(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  headerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, marginTop: 3, letterSpacing: FONTS.tracking.wide },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.sheetBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  closeTxt: { fontSize: 20, color: COLORS.textDim, lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  filterRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  filterChipActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  filterIcon: { fontSize: 12, opacity: 0.7 },
  filterLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, fontWeight: FONTS.weights.medium, letterSpacing: FONTS.tracking.wide },
  filterLabelActive: { color: COLORS.background },
  filterCount: {
    fontSize: 9, color: COLORS.textMuted, fontWeight: FONTS.weights.bold,
    backgroundColor: COLORS.sheetBg, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.2)', color: COLORS.background },

  scroll: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl },

  moveRow: {
    flexDirection: 'row', backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border, overflow: 'hidden',
  },
  moveAccent: { width: 3 },
  moveContent: { flex: 1, padding: SPACING.md, gap: 6 },
  moveTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  moveTitle: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  moveImpact: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.wide },
  moveDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 17 },
  moveBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  effortPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full, borderWidth: 1 },
  effortTxt: { fontSize: 9, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },
  moveCat: { fontSize: 9, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },

  // Detail
  detailContainer: { flex: 1, backgroundColor: COLORS.background },
  detailHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  detailHeaderTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  detailDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  detailScroll: { paddingBottom: SPACING.xxl },
  detailAccentLine: { height: 3 },
  detailBody: { padding: SPACING.lg, gap: SPACING.lg },
  detailTag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1 },
  detailTagTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  detailTitle: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.bold, color: COLORS.text, lineHeight: 36, letterSpacing: FONTS.tracking.tight },
  detailDesc: { fontSize: FONTS.sizes.md, color: COLORS.textDim, lineHeight: FONTS.sizes.md * 1.7 },
  detailImpactCard: {
    padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, gap: 4,
  },
  detailImpactLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  detailImpactValue: { fontSize: 42, fontWeight: FONTS.weights.light, lineHeight: 46, letterSpacing: -1 },
  detailCta: { paddingVertical: 16, borderRadius: RADIUS.full, alignItems: 'center' },
  detailCtaTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#fff', letterSpacing: FONTS.tracking.wide },
  detailSkip: { paddingVertical: 12, alignItems: 'center' },
  detailSkipTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
});

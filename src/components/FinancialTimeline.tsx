import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import {
  TimelineEntry, TimelineMonth,
  CATEGORY_COLORS, daysAgoLabel, useTimeline, TIMELINE_TOTALS,
} from '../services/financialTimeline';

// ─── Stat pill at the top ───────────────────────────────────────────────────

function StatPill({ label, value, delay }: { label: string; value: string; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 340, delay, useNativeDriver: false }),
      Animated.timing(slideY,  { toValue: 0, duration: 340, delay, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.statPill, { opacity, transform: [{ translateY: slideY }] }]}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </Animated.View>
  );
}

// ─── Month header ────────────────────────────────────────────────────────────

function MonthHeader({ month, index }: { month: TimelineMonth; index: number }) {
  const GRADE_COLORS: Record<string, string> = {
    S: COLORS.gold, A: '#7EB8A4', B: COLORS.textDim, C: COLORS.textMuted,
  };

  return (
    <View style={styles.monthHeader}>
      <View style={styles.monthLeft}>
        {month.isBest && <Text style={styles.crown}>👑</Text>}
        <Text style={styles.monthLabel}>{month.label}</Text>
      </View>
      <View style={styles.monthStats}>
        <Text style={styles.monthStat}>{month.movesCount} moves</Text>
        <Text style={styles.monthDot}>·</Text>
        <Text style={styles.monthStat}>+{month.xpEarned} XP</Text>
        {month.netWorthGain > 0 && (
          <>
            <Text style={styles.monthDot}>·</Text>
            <Text style={[styles.monthStat, { color: COLORS.goldDark }]}>
              +${month.netWorthGain.toLocaleString()}
            </Text>
          </>
        )}
      </View>
      <View style={[styles.gradeBadge, { borderColor: GRADE_COLORS[month.grade] + '60' }]}>
        <Text style={[styles.gradeText, { color: GRADE_COLORS[month.grade] }]}>{month.grade}</Text>
      </View>
    </View>
  );
}

// ─── Single timeline entry ───────────────────────────────────────────────────

function EntryRow({
  entry,
  index,
  isLast,
  monthIndex,
}: {
  entry: TimelineEntry;
  index: number;
  isLast: boolean;
  monthIndex: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned]     = useState(entry.isPinned ?? false);

  const opacity   = useRef(new Animated.Value(0)).current;
  const slideX    = useRef(new Animated.Value(20)).current;
  const pinScale  = useRef(new Animated.Value(1)).current;
  const expandH   = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.7)).current;

  const totalDelay = (monthIndex * 60) + (index * 80) + 200;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 380, delay: totalDelay, useNativeDriver: false }),
      Animated.timing(slideX,     { toValue: 0, duration: 380, delay: totalDelay, useNativeDriver: false }),
      Animated.spring(iconScale,  { toValue: 1, delay: totalDelay + 60, tension: 120, friction: 8, useNativeDriver: false }),
    ]).start();
  }, []);

  const handlePress = () => {
    if (!entry.impact) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !expanded;
    setExpanded(next);
    Animated.timing(expandH, {
      toValue: next ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  };

  const handlePin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.sequence([
      Animated.spring(pinScale, { toValue: 1.5, tension: 200, friction: 6, useNativeDriver: false }),
      Animated.spring(pinScale, { toValue: 1,   tension: 200, friction: 6, useNativeDriver: false }),
    ]).start(() => setPinned(p => !p));
  };

  const catColor  = CATEGORY_COLORS[entry.category];
  const isSpecial = entry.type === 'net_worth' || entry.type === 'joined';

  const impactHeight = expandH.interpolate({ inputRange: [0, 1], outputRange: [0, 68] });
  const impactOpacity = expandH.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <Animated.View style={{ opacity, transform: [{ translateX: slideX }] }}>
      <TouchableOpacity
        activeOpacity={entry.impact ? 0.85 : 1}
        onPress={handlePress}
        style={[styles.entryRow, isSpecial && styles.entryRowSpecial]}
      >
        {/* Thread + icon column */}
        <View style={styles.threadCol}>
          <Animated.View style={[
            styles.iconCircle,
            { borderColor: catColor + '60', transform: [{ scale: iconScale }] },
            isSpecial && { backgroundColor: COLORS.goldGlow, borderColor: COLORS.gold + '80' },
          ]}>
            <Text style={[styles.iconGlyph, { color: catColor }, isSpecial && { color: COLORS.gold }]}>
              {entry.icon}
            </Text>
          </Animated.View>
          {!isLast && <View style={[styles.thread, { backgroundColor: catColor + '30' }]} />}
        </View>

        {/* Content */}
        <View style={styles.entryContent}>
          <View style={styles.entryTop}>
            <View style={styles.entryTitleRow}>
              {entry.onStreak && <Text style={styles.streakFire}>🔥</Text>}
              <Text style={[styles.entryTitle, isSpecial && { color: COLORS.gold }]} numberOfLines={2}>
                {entry.title}
              </Text>
            </View>
            <View style={styles.entryRight}>
              {entry.xp && (
                <View style={styles.xpPill}>
                  <Text style={styles.xpTxt}>+{entry.xp}</Text>
                </View>
              )}
              <Animated.View style={{ transform: [{ scale: pinScale }] }}>
                <TouchableOpacity onPress={handlePin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.pinIcon, pinned && styles.pinIconActive]}>
                    {pinned ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {entry.sub && <Text style={styles.entrySub}>{entry.sub}</Text>}

          <View style={styles.entryMeta}>
            <View style={[styles.catDot, { backgroundColor: catColor }]} />
            <Text style={styles.catLabel}>{entry.category.toUpperCase()}</Text>
            <Text style={styles.entryDate}>{daysAgoLabel(entry.daysAgo)}</Text>
            {entry.impact && (
              <Text style={[styles.tapHint, expanded && { color: COLORS.goldDark }]}>
                {expanded ? '▴ hide impact' : '▾ see impact'}
              </Text>
            )}
          </View>

          {/* Expandable impact */}
          <Animated.View style={[styles.impactBox, { maxHeight: impactHeight, opacity: impactOpacity }]}>
            <View style={styles.impactInner}>
              <Text style={styles.impactEye}>IMPACT</Text>
              <Text style={styles.impactTxt}>{entry.impact}</Text>
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Month block ─────────────────────────────────────────────────────────────

function MonthBlock({ month, monthIndex }: { month: TimelineMonth; monthIndex: number }) {
  return (
    <View style={styles.monthBlock}>
      <MonthHeader month={month} index={monthIndex} />
      <View style={[styles.monthCard, CARD_SHADOW, { shadowOpacity: 0.06 }]}>
        {month.entries.map((entry, i) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            index={i}
            isLast={i === month.entries.length - 1}
            monthIndex={monthIndex}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Top summary ribbon ───────────────────────────────────────────────────────

function SummaryRibbon() {
  const scale   = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, tension: 60, friction: 9, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.ribbon, CARD_SHADOW, { opacity, transform: [{ scale }] }]}>
      <View style={styles.ribbonAccent} />
      <View style={styles.ribbonBody}>
        <View style={styles.ribbonLeft}>
          <Text style={styles.ribbonEye}>YOUR FINANCIAL BIOGRAPHY</Text>
          <Text style={styles.ribbonTitle}>
            {TIMELINE_TOTALS.totalMoves} moves · {TIMELINE_TOTALS.monthsActive} months
          </Text>
          <Text style={styles.ribbonSub}>
            +${TIMELINE_TOTALS.totalNetWorthGain.toLocaleString()} net worth since joining
          </Text>
        </View>
        <View style={styles.ribbonXP}>
          <Text style={styles.ribbonXPVal}>{TIMELINE_TOTALS.totalXp}</Text>
          <Text style={styles.ribbonXPLbl}>XP TOTAL</Text>
        </View>
      </View>
      <View style={styles.pillRow}>
        <StatPill label="MOVES" value={String(TIMELINE_TOTALS.totalMoves)} delay={100} />
        <StatPill label="MONTHS" value={String(TIMELINE_TOTALS.monthsActive)} delay={180} />
        <StatPill label="NET GAIN" value={`+$${(TIMELINE_TOTALS.totalNetWorthGain / 1000).toFixed(1)}K`} delay={260} />
        <StatPill label="XP" value={String(TIMELINE_TOTALS.totalXp)} delay={340} />
      </View>
    </Animated.View>
  );
}

// ─── Greene empty state ───────────────────────────────────────────────────────

function EmptyBiography() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: false }).start();
  }, []);

  return (
    <Animated.View style={[styles.emptyWrap, { opacity }]}>
      <Text style={styles.emptyGlyph}>◆</Text>
      <Text style={styles.emptyTitle}>Your biography is blank.</Text>
      <Text style={styles.emptySub}>
        You cannot win a war on a false map.{'\n'}
        Take your first wealth move to begin building a real record.
      </Text>
      <View style={styles.emptyHint}>
        <Text style={styles.emptyHintText}>
          Every master starts here. Every entry is real.
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────

export default function FinancialTimeline() {
  const { months, totals, loading } = useTimeline();
  const hasOnlyJoined = months.length === 1 && months[0].entries.length === 1 && months[0].entries[0].type === 'joined';
  const showEmpty = !loading && (months.length === 0 || hasOnlyJoined);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {!showEmpty && (
        <>
          <View style={[styles.ribbon, CARD_SHADOW]}>
            <View style={styles.ribbonAccent} />
            <View style={styles.ribbonBody}>
              <View style={styles.ribbonLeft}>
                <Text style={styles.ribbonEye}>YOUR FINANCIAL BIOGRAPHY</Text>
                <Text style={styles.ribbonTitle}>
                  {totals.totalMoves} moves · {totals.monthsActive} months
                </Text>
                <Text style={styles.ribbonSub}>
                  +${totals.totalNetWorthGain.toLocaleString()} net worth since joining
                </Text>
              </View>
              <View style={styles.ribbonXP}>
                <Text style={styles.ribbonXPVal}>{totals.totalXp}</Text>
                <Text style={styles.ribbonXPLbl}>XP TOTAL</Text>
              </View>
            </View>
            <View style={styles.pillRow}>
              <StatPill label="MOVES"   value={String(totals.totalMoves)}   delay={100} />
              <StatPill label="MONTHS"  value={String(totals.monthsActive)} delay={180} />
              <StatPill label="NET GAIN" value={`+$${(totals.totalNetWorthGain / 1000).toFixed(1)}K`} delay={260} />
              <StatPill label="XP"      value={String(totals.totalXp)}      delay={340} />
            </View>
          </View>

          {months.map((month, i) => (
            <MonthBlock key={month.id} month={month} monthIndex={i} />
          ))}
        </>
      )}

      {showEmpty && <EmptyBiography />}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.lg },

  // Ribbon
  ribbon: {
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  ribbonAccent: { height: 2, backgroundColor: COLORS.gold },
  ribbonBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  ribbonLeft: { flex: 1, gap: 4 },
  ribbonEye: { fontSize: 9, color: COLORS.gold, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  ribbonTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.background, letterSpacing: -0.3 },
  ribbonSub:  { fontSize: FONTS.sizes.sm, color: 'rgba(242,239,233,0.5)', letterSpacing: 0.2 },
  ribbonXP: { alignItems: 'flex-end', gap: 2 },
  ribbonXPVal: { fontSize: 36, fontWeight: FONTS.weights.light, color: COLORS.gold, letterSpacing: -1 },
  ribbonXPLbl: { fontSize: 8, color: 'rgba(201,169,110,0.6)', letterSpacing: 1.5, fontWeight: FONTS.weights.bold },
  pillRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    gap: 2,
  },
  statVal: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.background },
  statLbl: { fontSize: 7, color: 'rgba(242,239,233,0.4)', letterSpacing: 1.2, fontWeight: FONTS.weights.bold },

  // Nudge
  nudgeBanner: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
  },
  nudgeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.goldDark,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // Month
  monthBlock: { gap: SPACING.sm },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: 2,
  },
  monthLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  crown: { fontSize: 12 },
  monthLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
  },
  monthStats: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  monthStat:  { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  monthDot:   { fontSize: FONTS.sizes.xs, color: COLORS.border },
  gradeBadge: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  gradeText: { fontSize: 11, fontWeight: FONTS.weights.bold },

  monthCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  // Entry row
  entryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  entryRowSpecial: {
    backgroundColor: COLORS.goldGlow,
    borderBottomColor: COLORS.gold + '20',
  },

  threadCol: { alignItems: 'center', width: 36, paddingTop: 2 },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
  },
  iconGlyph: { fontSize: 13 },
  thread: { flex: 1, width: 1.5, marginTop: 4 },

  entryContent: { flex: 1, gap: 5 },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  entryTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  streakFire: { fontSize: 11, lineHeight: 18 },
  entryTitle: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    lineHeight: 20,
  },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpPill: {
    paddingHorizontal: 7, paddingVertical: 2,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  xpTxt: { fontSize: 9, fontWeight: FONTS.weights.bold, color: COLORS.goldDark },
  pinIcon: { fontSize: 16, color: COLORS.border },
  pinIconActive: { color: COLORS.gold },

  entrySub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 18 },

  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catDot: { width: 5, height: 5, borderRadius: 2.5 },
  catLabel: {
    fontSize: 8, fontWeight: FONTS.weights.bold,
    color: COLORS.textMuted, letterSpacing: 0.8,
  },
  entryDate: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  tapHint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: FONTS.weights.medium },

  // Impact expand
  impactBox: { overflow: 'hidden' },
  impactInner: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '30',
  },
  impactEye: {
    fontSize: 8, fontWeight: FONTS.weights.bold,
    color: COLORS.gold, letterSpacing: 1.5,
  },
  impactTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.goldDark,
    lineHeight: 18,
  },

  // Empty biography state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  emptyGlyph: {
    fontSize: 32,
    color: COLORS.gold,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptySub: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyHint: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
  },
  emptyHintText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.goldDark,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

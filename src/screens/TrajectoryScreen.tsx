import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
  Animated, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Line, Text as SvgText, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import { computeTrajectory, DEFAULT_TRAJECTORY_INPUTS, TrajectoryInputs, TrajectoryPoint } from '../services/trajectory';
import { getTrajectoryInputs } from '../services/onboarding';
import FinancialTimeline from '../components/FinancialTimeline';
import PlaidLinkScreen from './PlaidLinkScreen';

const { width } = Dimensions.get('window');
const CHART_H = 220;
const CHART_W = width - SPACING.lg * 2;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;
const PLOT_W = CHART_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = CHART_H - PAD_TOP - PAD_BOTTOM;

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function formatCurrencyFull(n: number): string {
  return '$' + n.toLocaleString();
}

function buildSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

function buildAreaPath(points: { x: number; y: number }[], bottomY: number): string {
  if (points.length === 0) return '';
  const line = buildSvgPath(points);
  const lastX = points[points.length - 1].x.toFixed(1);
  const firstX = points[0].x.toFixed(1);
  return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
}

function CompoundChart({ curve, fiAge, actionsCompleted }: {
  curve: TrajectoryPoint[];
  fiAge: number;
  actionsCompleted: number;
}) {
  const animProgress = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    animProgress.setValue(0);
    setProgress(0);
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: false,
    }).start();
    const listener = animProgress.addListener(({ value }) => setProgress(value));
    return () => animProgress.removeListener(listener);
  }, [actionsCompleted]);

  const maxNW = Math.max(...curve.map(p => p.netWorth), 1);
  const minNW = Math.min(...curve.map(p => p.netWorth), 0);
  const range = maxNW - minNW || 1;

  const toX = (i: number) => PAD_LEFT + (i / (curve.length - 1)) * PLOT_W;
  const toY = (nw: number) => PAD_TOP + PLOT_H - ((nw - minNW) / range) * PLOT_H;

  const visibleCount = Math.max(2, Math.round(progress * curve.length));
  const visible = curve.slice(0, visibleCount);
  const points = visible.map((p, i) => ({ x: toX(i), y: toY(p.netWorth) }));

  // FI line x position
  const fiIndex = curve.findIndex(p => p.age >= fiAge);
  const fiX = fiIndex >= 0 ? toX(fiIndex) : null;

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(frac => ({
    value: minNW + frac * range,
    y: PAD_TOP + PLOT_H - frac * PLOT_H,
  }));

  // X-axis age labels (every ~5 years)
  const xLabels: { label: string; x: number }[] = [];
  curve.forEach((p, i) => {
    if (p.age % 5 === 0) xLabels.push({ label: `${p.age}`, x: toX(i) });
  });

  const linePath = buildSvgPath(points);
  const areaPath = buildAreaPath(points, PAD_TOP + PLOT_H);
  const lastPt = points[points.length - 1];

  return (
    <View style={styles.chartWrapper}>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <SvgGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.gold} stopOpacity="0.22" />
            <Stop offset="1" stopColor={COLORS.gold} stopOpacity="0.02" />
          </SvgGradient>
        </Defs>

        {/* Grid lines */}
        {yLabels.map((l, i) => (
          <Line
            key={i}
            x1={PAD_LEFT} y1={l.y}
            x2={PAD_LEFT + PLOT_W} y2={l.y}
            stroke={COLORS.border}
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((l, i) => (
          <SvgText
            key={i}
            x={PAD_LEFT - 6}
            y={l.y + 3}
            fontSize={8}
            fill={COLORS.textMuted}
            textAnchor="end"
          >
            {formatCurrency(l.value)}
          </SvgText>
        ))}

        {/* X-axis age labels */}
        {xLabels.map((l, i) => (
          <SvgText
            key={i}
            x={l.x}
            y={PAD_TOP + PLOT_H + 14}
            fontSize={8}
            fill={COLORS.textMuted}
            textAnchor="middle"
          >
            {l.label}
          </SvgText>
        ))}

        {/* FI marker line */}
        {fiX !== null && progress > (fiIndex / curve.length) && (
          <>
            <Line
              x1={fiX} y1={PAD_TOP}
              x2={fiX} y2={PAD_TOP + PLOT_H}
              stroke={COLORS.gold}
              strokeWidth={1}
              strokeDasharray="4,3"
            />
            <SvgText
              x={fiX + 4}
              y={PAD_TOP + 10}
              fontSize={8}
              fill={COLORS.goldDark}
              fontWeight="bold"
            >
              FI
            </SvgText>
          </>
        )}

        {/* Area fill */}
        {areaPath ? (
          <Path d={areaPath} fill="url(#area)" />
        ) : null}

        {/* Line */}
        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke={COLORS.gold}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Moving dot at tip */}
        {lastPt && progress > 0.05 && (
          <Circle
            cx={lastPt.x}
            cy={lastPt.y}
            r={4}
            fill={COLORS.gold}
          />
        )}
      </Svg>
    </View>
  );
}

const SCENARIOS = [
  { label: 'Base', savingsBoost: 0, description: 'Current trajectory' },
  { label: '+5% saved', savingsBoost: 0.05, description: 'Save 5% more of income' },
  { label: '+10% saved', savingsBoost: 0.10, description: 'Save 10% more of income' },
  { label: 'Max', savingsBoost: 0.20, description: 'Aggressive savings mode' },
];

export default function TrajectoryScreen() {
  const [activeTab, setActiveTab] = useState<'trajectory' | 'timeline'>('trajectory');
  const [actionsCompleted] = useState(0);
  const [activeScenario, setActiveScenario] = useState(0);
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [showPlaid, setShowPlaid] = useState(false);
  const [trajectoryInputs, setTrajectoryInputs] = useState<TrajectoryInputs>(DEFAULT_TRAJECTORY_INPUTS);

  useEffect(() => {
    AsyncStorage.getItem('@vault_plaid_connected').then(val => {
      setPlaidConnected(val === 'true');
    });
    getTrajectoryInputs().then(inputs => {
      if (inputs) setTrajectoryInputs(inputs);
    });
  }, []);

  const handleTab = (tab: 'trajectory' | 'timeline') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveTab(tab);
  };

  const baseInputs = { ...trajectoryInputs, actionsCompleted };

  const scenarioInputs = {
    ...baseInputs,
    annualExpenses: baseInputs.annualExpenses * (1 - SCENARIOS[activeScenario].savingsBoost),
  };

  const result = computeTrajectory(scenarioInputs);

  const fiCounterAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(fiCounterAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
    ]).start();
  }, [activeScenario]);

  const handleScenario = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveScenario(i);
  };

  const nextMilestone = result.milestones.find(m => !m.reached);
  const reachedMilestones = result.milestones.filter(m => m.reached);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header + toggle always visible */}
      <View style={styles.topBar}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Future</Text>
          <Text style={styles.pageSub}>
            {activeTab === 'trajectory' ? 'Your path to financial independence' : 'Your financial biography'}
          </Text>
        </View>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'trajectory' && styles.toggleBtnActive]}
            onPress={() => handleTab('trajectory')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleTxt, activeTab === 'trajectory' && styles.toggleTxtActive]}>
              Trajectory
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'timeline' && styles.toggleBtnActive]}
            onPress={() => handleTab('timeline')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleTxt, activeTab === 'timeline' && styles.toggleTxtActive]}>
              Timeline
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'timeline' ? (
        <FinancialTimeline />
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* spacer — header now outside scroll */}
        <View style={{ height: 0 }} />

        {/* Sample projection banner — shown until bank connected */}
        {!plaidConnected && (
          <TouchableOpacity
            style={[styles.sampleBanner, CARD_SHADOW, { shadowOpacity: 0.07 }]}
            onPress={() => setShowPlaid(true)}
            activeOpacity={0.82}
          >
            <View style={styles.sampleBannerLeft}>
              <Text style={styles.sampleBannerIcon}>◇</Text>
              <View>
                <Text style={styles.sampleBannerTitle}>Sample projection</Text>
                <Text style={styles.sampleBannerSub}>Based on a typical profile. Connect your bank to see your actual numbers.</Text>
              </View>
            </View>
            <Text style={styles.sampleBannerCta}>Connect →</Text>
          </TouchableOpacity>
        )}

        {/* FI Hero card */}
        <Animated.View style={[styles.heroCard, CARD_SHADOW, { transform: [{ scale: headerScale }] }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>FINANCIAL INDEPENDENCE</Text>
              <Text style={styles.heroAge}>Age {result.fiAge}</Text>
              <Text style={styles.heroYear}>Year {result.fiYear} · {result.yearsToFI} years away</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeTxt}>FI</Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{formatCurrencyFull(result.fiNumber)}</Text>
              <Text style={styles.heroStatLbl}>FI NUMBER</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{formatCurrencyFull(result.monthlyPassiveAtFI)}/mo</Text>
              <Text style={styles.heroStatLbl}>PASSIVE AT FI</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{result.currentSavingsRate}%</Text>
              <Text style={styles.heroStatLbl}>SAVINGS RATE</Text>
            </View>
          </View>

          {result.actionSavings > 0 && (
            <View style={styles.actionBanner}>
              <Text style={styles.actionBannerTxt}>
                ◆ Your {actionsCompleted} moves shaved {result.actionSavings} years off your FI date
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Scenario selector */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What-If Scenarios</Text>
          <Text style={styles.sectionSub}>See how small changes move your FI date</Text>
        </View>

        <View style={styles.scenarios}>
          {SCENARIOS.map((s, i) => {
            const sInputs = {
              ...baseInputs,
              annualExpenses: baseInputs.annualExpenses * (1 - s.savingsBoost),
            };
            const sResult = computeTrajectory(sInputs);
            const diff = result.yearsToFI - sResult.yearsToFI;
            const active = activeScenario === i;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.scenarioCard, active && styles.scenarioCardActive]}
                onPress={() => handleScenario(i)}
                activeOpacity={0.8}
              >
                <Text style={[styles.scenarioLabel, active && styles.scenarioLabelActive]}>{s.label}</Text>
                <Text style={[styles.scenarioAge, active && styles.scenarioAgeActive]}>Age {sResult.fiAge}</Text>
                {i > 0 && diff > 0 && (
                  <Text style={styles.scenarioDiff}>−{diff}y</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Compound growth chart */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Compound Growth</Text>
          <Text style={styles.sectionSub}>The exponential curve that changes everything</Text>
        </View>

        <View style={[styles.chartCard, CARD_SHADOW]}>
          <CompoundChart
            curve={result.curve}
            fiAge={result.fiAge}
            actionsCompleted={actionsCompleted + activeScenario}
          />
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.gold }]} />
              <Text style={styles.legendTxt}>Net worth projection</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDash, { borderColor: COLORS.gold }]} />
              <Text style={styles.legendTxt}>FI milestone</Text>
            </View>
          </View>
          <Text style={styles.chartNote}>
            Assumes {(trajectoryInputs.annualReturn * 100).toFixed(0)}% avg annual return · 4% withdrawal rule
          </Text>
        </View>

        {/* Key insight — the compound inflection point */}
        <View style={[styles.insightCard, CARD_SHADOW]}>
          <Text style={styles.insightGlyph}>◆</Text>
          <View style={styles.insightBody}>
            <Text style={styles.insightTitle}>The inflection point</Text>
            <Text style={styles.insightTxt}>
              Notice how the curve starts slow and then bends sharply upward.
              That's compounding — your money making money on money. The first{' '}
              {formatCurrency(result.fiNumber * 0.1)} takes the longest.
              The last {formatCurrency(result.fiNumber * 0.5)} comes fastest.
            </Text>
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Wealth Milestones</Text>
          <Text style={styles.sectionSub}>Every comma unlocks a new level of freedom</Text>
        </View>

        <View style={styles.milestonesCard}>
          {result.milestones.map((m, i) => {
            const isNext = m === nextMilestone;
            return (
              <View key={i} style={[styles.milestoneRow, i < result.milestones.length - 1 && styles.milestoneRowBorder]}>
                <View style={styles.milestoneLeft}>
                  <View style={[
                    styles.milestoneDot,
                    m.reached && styles.milestoneDotReached,
                    isNext && styles.milestoneDotNext,
                  ]} />
                  <View style={styles.milestoneTrack} />
                </View>
                <View style={styles.milestoneContent}>
                  <Text style={[styles.milestoneAmount, m.reached && { color: COLORS.goldDark }]}>
                    {m.label}
                  </Text>
                  <Text style={styles.milestoneAge}>
                    {m.reached
                      ? '✓ Reached'
                      : `Age ${m.age} · ${m.year}`}
                  </Text>
                </View>
                {isNext && (
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextBadgeTxt}>NEXT</Text>
                  </View>
                )}
                {m.reached && (
                  <Text style={styles.milestoneDone}>◆</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Future self snapshot */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Future Self</Text>
          <Text style={styles.sectionSub}>What your life looks like at FI</Text>
        </View>

        <View style={[styles.futureCard, CARD_SHADOW]}>
          <View style={styles.futureRow}>
            <Text style={styles.futureIcon}>🏡</Text>
            <View style={styles.futureText}>
              <Text style={styles.futureTitle}>Mortgage optional</Text>
              <Text style={styles.futureSub}>Your passive income covers housing costs without your salary</Text>
            </View>
          </View>
          <View style={styles.futureDivider} />
          <View style={styles.futureRow}>
            <Text style={styles.futureIcon}>✈️</Text>
            <View style={styles.futureText}>
              <Text style={styles.futureTitle}>Work becomes a choice</Text>
              <Text style={styles.futureSub}>{formatCurrencyFull(result.monthlyPassiveAtFI)}/mo in passive income — every month, forever</Text>
            </View>
          </View>
          <View style={styles.futureDivider} />
          <View style={styles.futureRow}>
            <Text style={styles.futureIcon}>👶</Text>
            <View style={styles.futureText}>
              <Text style={styles.futureTitle}>Generational head start</Text>
              <Text style={styles.futureSub}>
                At age {result.fiAge}, you have {formatCurrency(result.fiNumber)} in assets growing for your family
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
      )}

      <PlaidLinkScreen
        visible={showPlaid}
        onClose={() => setShowPlaid(false)}
        onSuccess={() => {
          AsyncStorage.setItem('@vault_plaid_connected', 'true');
          setPlaidConnected(true);
          setShowPlaid(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xl },

  sampleBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sampleBannerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, flex: 1 },
  sampleBannerIcon: { fontSize: 16, color: COLORS.gold, marginTop: 1 },
  sampleBannerTitle: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  sampleBannerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, marginTop: 2, lineHeight: 17, flexShrink: 1 },
  sampleBannerCta: { fontSize: FONTS.sizes.sm, color: COLORS.gold, fontWeight: FONTS.weights.semibold, marginLeft: SPACING.sm },

  topBar: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.md },
  header: { marginBottom: 0 },
  pageTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: -0.5 },
  pageSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 3, letterSpacing: 0.5 },

  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: 3,
    alignSelf: 'flex-start',
  },
  toggleBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.text,
  },
  toggleTxt: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  toggleTxtActive: {
    color: COLORS.background,
  },

  // Hero card
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  heroEyebrow: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  heroAge: { fontSize: 42, fontWeight: '300', color: COLORS.text, letterSpacing: -2, lineHeight: 48 },
  heroYear: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, marginTop: 4 },
  heroBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  heroBadgeTxt: { fontSize: FONTS.sizes.sm, fontWeight: '800', color: '#FFF', letterSpacing: 1 },

  heroStats: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: 0,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  heroStatLbl: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1, marginTop: 3 },
  heroStatDivider: { width: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 4 },

  actionBanner: {
    backgroundColor: COLORS.goldGlow,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gold + '30',
  },
  actionBannerTxt: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.goldDark,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  sectionHeader: { marginBottom: SPACING.sm, marginTop: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  sectionSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2, letterSpacing: 0.3 },

  // Scenarios
  scenarios: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  scenarioCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 3,
  },
  scenarioCardActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldGlow,
  },
  scenarioLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 0.8, fontWeight: '600' },
  scenarioLabelActive: { color: COLORS.goldDark },
  scenarioAge: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  scenarioAgeActive: { color: COLORS.text },
  scenarioDiff: { fontSize: 9, color: COLORS.goldDark, fontWeight: '700' },

  // Chart
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  chartWrapper: { paddingLeft: 0, paddingRight: 0 },
  chartLegend: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendDash: {
    width: 14, height: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  legendTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  chartNote: {
    fontSize: 9,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.lg,
    marginTop: 6,
    letterSpacing: 0.3,
  },

  // Insight card
  insightCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '30',
    padding: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    alignItems: 'flex-start',
  },
  insightGlyph: { fontSize: 16, color: COLORS.gold, marginTop: 2 },
  insightBody: { flex: 1, gap: 6 },
  insightTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  insightTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },

  // Milestones
  milestonesCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    gap: SPACING.md,
  },
  milestoneRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  milestoneLeft: { alignItems: 'center', width: 16 },
  milestoneDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.border,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
  },
  milestoneDotReached: { backgroundColor: COLORS.goldDark, borderColor: COLORS.goldDark },
  milestoneDotNext: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  milestoneTrack: { width: 1.5, flex: 1, backgroundColor: COLORS.border },
  milestoneContent: { flex: 1 },
  milestoneAmount: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  milestoneAge: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  nextBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.goldGlow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold,
  },
  nextBadgeTxt: { fontSize: 8, color: COLORS.goldDark, fontWeight: '700', letterSpacing: 1 },
  milestoneDone: { fontSize: 14, color: COLORS.goldDark },

  // Future self
  futureCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  futureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  futureIcon: { fontSize: 28, lineHeight: 36 },
  futureText: { flex: 1 },
  futureTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  futureSub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },
  futureDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg },
});

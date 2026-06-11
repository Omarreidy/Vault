import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  BELIEF_QUESTIONS, BeliefResponse, computeBeliefResult,
  BeliefResult, BeliefQuestion,
} from '../services/beliefs';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const { width } = Dimensions.get('window');

type Phase = 'intro' | 'question' | 'reframe' | 'result';

const DIMENSION_LABELS: Record<string, string> = {
  scarcity:   'Abundance',
  identity:   'Identity',
  timing:     'Timing',
  risk:       'Risk',
  worthiness: 'Worthiness',
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    Animated.timing(anim, { toValue: score, duration: 1200, useNativeDriver: false, delay: 300 }).start();
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(id);
  }, [score]);

  const SIZE = 110;
  const STROKE = 8;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const progress = (score / 100) * CIRC;

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
      <View style={{
        position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        borderWidth: STROKE, borderColor: COLORS.border,
      }} />
      {/* SVG-free progress arc via conic gradient workaround — use a rotated View */}
      <View style={{
        position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        borderWidth: STROKE, borderColor: color,
        borderRightColor: score < 25 ? 'transparent' : color,
        borderBottomColor: score < 50 ? 'transparent' : color,
        borderLeftColor: score < 75 ? 'transparent' : color,
        transform: [{ rotate: '-90deg' }],
        opacity: 0.9,
      }} />
      <Text style={{ fontSize: 28, fontWeight: '300', color: COLORS.text, letterSpacing: -1 }}>
        {display}
      </Text>
      <Text style={{ fontSize: 8, color: COLORS.textMuted, letterSpacing: 1, marginTop: 1 }}>SCORE</Text>
    </View>
  );
}

interface Props {
  onComplete?: () => void;
  index: number;
  total: number;
}

export default function BeliefsAuditCard({ onComplete, index, total }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, BeliefResponse>>({});
  const [lastResponse, setLastResponse] = useState<BeliefResponse | null>(null);
  const [result, setResult] = useState<BeliefResult | null>(null);

  // Animations
  const reframeScale   = useRef(new Animated.Value(0.88)).current;
  const reframeOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim   = useRef(new Animated.Value(0)).current;
  const resultScale    = useRef(new Animated.Value(0.88)).current;
  const resultOpacity  = useRef(new Animated.Value(0)).current;

  const currentQ: BeliefQuestion = BELIEF_QUESTIONS[qIndex];
  const progressPct = (qIndex / BELIEF_QUESTIONS.length);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPct,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [qIndex]);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPhase('question');
  };

  const handleAnswer = (resp: BeliefResponse) => {
    const isLimiting = resp === 'agree';
    // Haptic — heavier for limiting beliefs (wake-up call)
    if (isLimiting) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setTimeout(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
      80);
    }

    const newAnswers = { ...answers, [currentQ.id]: resp };
    setAnswers(newAnswers);
    setLastResponse(resp);

    // Show reframe
    reframeScale.setValue(0.88);
    reframeOpacity.setValue(0);
    setPhase('reframe');
    Animated.parallel([
      Animated.spring(reframeScale,   { toValue: 1, useNativeDriver: false, tension: 200, friction: 10 }),
      Animated.timing(reframeOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  const handleNext = () => {
    const nextIdx = qIndex + 1;
    if (nextIdx >= BELIEF_QUESTIONS.length) {
      const res = computeBeliefResult(answers);
      setResult(res);
      resultScale.setValue(0.88);
      resultOpacity.setValue(0);
      setPhase('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 120);
      Animated.parallel([
        Animated.spring(resultScale,   { toValue: 1, useNativeDriver: false, tension: 60, friction: 8 }),
        Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]).start();
    } else {
      setQIndex(nextIdx);
      setPhase('question');
    }
  };

  const isLimitingAnswer = lastResponse === 'agree';
  const reframeAccent = isLimitingAnswer ? COLORS.gold : COLORS.goldDark;

  return (
    <View style={styles.container}>
      {/* Top accent */}
      <View style={[styles.topAccent, { backgroundColor: COLORS.gold }]} />

      <View style={styles.inner}>

        {/* Header row */}
        <View style={styles.topRow}>
          <View style={styles.auditTag}>
            <View style={[styles.tagDot, { backgroundColor: COLORS.gold }]} />
            <Text style={styles.tagTxt}>BELIEFS AUDIT</Text>
          </View>
          <Text style={styles.counter}>{index + 1} / {total}</Text>
        </View>

        {/* Progress bar — only during questions */}
        {(phase === 'question' || phase === 'reframe') && (
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, {
                width: progressAnim.interpolate({
                  inputRange: [0, 1], outputRange: ['0%', '100%'],
                }),
              }]}
            />
            <Text style={styles.progressTxt}>
              {qIndex + 1} of {BELIEF_QUESTIONS.length}
            </Text>
          </View>
        )}

        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <View style={styles.phaseWrap}>
            <View style={styles.introBody}>
              <Text style={styles.introEye}>MINDSET PROFILE</Text>
              <Text style={styles.introTitle}>What do you actually believe about money?</Text>
              <View style={styles.introDivider} />
              <Text style={styles.introSub}>
                8 statements. No right answers.{'\n'}
                We'll show you what the data says about each belief — and where yours is helping or holding you back.
              </Text>
              <View style={styles.introStats}>
                {[
                  { n: '8', l: 'BELIEFS' },
                  { n: '5', l: 'DIMENSIONS' },
                  { n: '~2 min', l: 'TO COMPLETE' },
                ].map(({ n, l }) => (
                  <View key={l} style={styles.introStat}>
                    <Text style={styles.introStatN}>{n}</Text>
                    <Text style={styles.introStatL}>{l}</Text>
                  </View>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
              <Text style={styles.startTxt}>Begin Audit →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── QUESTION ── */}
        {phase === 'question' && (
          <View style={styles.phaseWrap}>
            <View style={styles.questionBody}>
              <Text style={styles.dimensionLabel}>
                {DIMENSION_LABELS[currentQ.dimension].toUpperCase()}
              </Text>
              <Text style={styles.statement}>"{currentQ.statement}"</Text>
            </View>
            <View style={styles.choiceRow}>
              {([
                { resp: 'agree' as BeliefResponse,    label: 'Agree',    sub: 'This resonates' },
                { resp: 'neutral' as BeliefResponse,  label: 'Not Sure', sub: 'Mixed feelings' },
                { resp: 'disagree' as BeliefResponse, label: 'Disagree', sub: 'Don\'t believe this' },
              ]).map(({ resp, label, sub }) => (
                <TouchableOpacity
                  key={resp}
                  style={styles.choiceBtn}
                  onPress={() => handleAnswer(resp)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.choiceLabel}>{label}</Text>
                  <Text style={styles.choiceSub}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── REFRAME ── */}
        {phase === 'reframe' && (
          <Animated.View style={[styles.phaseWrap, { opacity: reframeOpacity, transform: [{ scale: reframeScale }] }]}>
            <View style={styles.reframeBody}>
              {isLimitingAnswer && (
                <View style={styles.limitingFlag}>
                  <Text style={styles.limitingFlagTxt}>LIMITING BELIEF DETECTED</Text>
                </View>
              )}
              <Text style={styles.statementSm}>"{currentQ.statement}"</Text>
              <View style={[styles.reframePill, { borderColor: reframeAccent + '40', backgroundColor: reframeAccent + '08' }]}>
                <Text style={[styles.reframeTruth, { color: reframeAccent }]}>
                  {currentQ.reframe}
                </Text>
              </View>
              <Text style={styles.reframeDetail}>{currentQ.reframeDetail}</Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextTxt}>
                {qIndex + 1 < BELIEF_QUESTIONS.length ? 'Next →' : 'See My Results →'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── RESULT ── */}
        {phase === 'result' && result && (
          <Animated.View
            style={[styles.phaseWrap, { opacity: resultOpacity, transform: [{ scale: resultScale }] }]}
          >
            <ScrollView showsVerticalScrollIndicator={false} bounces={false} nestedScrollEnabled={true}>
              {/* Score + archetype */}
              <View style={styles.resultTop}>
                <ScoreRing score={result.mindsetScore} color={COLORS.gold} />
                <View style={styles.resultTitleCol}>
                  <Text style={styles.archetypeEye}>YOUR MONEY ARCHETYPE</Text>
                  <Text style={styles.archetypeName}>{result.archetype.name}</Text>
                  <Text style={styles.archetypeTagline}>{result.archetype.tagline}</Text>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.archetypeDesc}>{result.archetype.description}</Text>

              {/* Strength / Blindspot */}
              <View style={styles.strengthRow}>
                <View style={[styles.strengthCard, { borderColor: COLORS.goldDark + '40' }]}>
                  <Text style={styles.strengthEye}>STRENGTH</Text>
                  <Text style={styles.strengthTxt}>{result.archetype.strength}</Text>
                </View>
                <View style={[styles.strengthCard, { borderColor: COLORS.red + '30' }]}>
                  <Text style={[styles.strengthEye, { color: COLORS.red }]}>BLINDSPOT</Text>
                  <Text style={styles.strengthTxt}>{result.archetype.blindspot}</Text>
                </View>
              </View>

              {/* Dimension scores */}
              <Text style={styles.dimHeader}>BELIEF DIMENSIONS</Text>
              {Object.entries(result.dimensionScores).map(([dim, score]) => (
                <View key={dim} style={styles.dimRow}>
                  <Text style={styles.dimLabel}>{DIMENSION_LABELS[dim]}</Text>
                  <View style={styles.dimTrack}>
                    <View style={[styles.dimFill, { width: `${score}%`, backgroundColor: score >= 60 ? COLORS.goldDark : COLORS.red }]} />
                  </View>
                  <Text style={styles.dimScore}>{score}</Text>
                </View>
              ))}

              {/* Next move */}
              <View style={[styles.nextMoveCard, CARD_SHADOW, { shadowOpacity: 0.08 }]}>
                <Text style={styles.nextMoveEye}>◆ YOUR NEXT MOVE</Text>
                <Text style={styles.nextMoveTxt}>{result.archetype.nextMove}</Text>
              </View>

              {result.limitingCount > 0 && (
                <Text style={styles.limitingNote}>
                  {result.limitingCount} limiting belief{result.limitingCount > 1 ? 's' : ''} identified — each one is a wealth lever waiting to be pulled.
                </Text>
              )}
            </ScrollView>
          </Animated.View>
        )}

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
    paddingBottom: SPACING.lg,
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  auditTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.gold + '35', backgroundColor: COLORS.goldGlow },
  tagDot: { width: 5, height: 5, borderRadius: 2.5 },
  tagTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.goldDark, letterSpacing: 1.5 },
  counter: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: 1 },

  progressTrack: {
    height: 3, backgroundColor: COLORS.border, borderRadius: 2,
    marginBottom: SPACING.lg, overflow: 'hidden', position: 'relative',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 2 },
  progressTxt: {
    position: 'absolute', right: 0, top: 6,
    fontSize: 8, color: COLORS.textMuted, letterSpacing: 0.5,
  },

  phaseWrap: { flex: 1, justifyContent: 'space-between' },

  // Intro
  introBody: { flex: 1, justifyContent: 'center', gap: SPACING.md },
  introEye: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: 2, fontWeight: FONTS.weights.bold },
  introTitle: { fontSize: 26, fontWeight: FONTS.weights.bold, color: COLORS.text, lineHeight: 34, letterSpacing: -0.5 },
  introDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  introSub: { fontSize: FONTS.sizes.md, color: COLORS.textDim, lineHeight: 24 },
  introStats: { flexDirection: 'row', gap: SPACING.lg },
  introStat: { gap: 3 },
  introStatN: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
  introStatL: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1 },
  startBtn: {
    paddingVertical: 16, borderRadius: RADIUS.md,
    backgroundColor: COLORS.text, alignItems: 'center',
  },
  startTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.background, letterSpacing: 0.5 },

  // Question
  questionBody: { flex: 1, justifyContent: 'center', gap: SPACING.md },
  dimensionLabel: { fontSize: 9, color: COLORS.gold, fontWeight: FONTS.weights.bold, letterSpacing: 2 },
  statement: {
    fontSize: 22, fontWeight: FONTS.weights.semibold, color: COLORS.text,
    lineHeight: 32, letterSpacing: -0.3,
    fontStyle: 'italic',
  },
  choiceRow: { gap: SPACING.sm },
  choiceBtn: {
    paddingVertical: 14, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    backgroundColor: COLORS.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  choiceLabel: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  choiceSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },

  // Reframe
  reframeBody: { flex: 1, justifyContent: 'center', gap: SPACING.md },
  limitingFlag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.red + '12',
    borderWidth: 1, borderColor: COLORS.red + '30',
  },
  limitingFlagTxt: { fontSize: 8, color: COLORS.red, fontWeight: FONTS.weights.bold, letterSpacing: 1.2 },
  statementSm: {
    fontSize: FONTS.sizes.sm, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 20,
  },
  reframePill: {
    padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1,
  },
  reframeTruth: {
    fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, lineHeight: 26, letterSpacing: -0.2,
  },
  reframeDetail: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },
  nextBtn: {
    paddingVertical: 16, borderRadius: RADIUS.md,
    backgroundColor: COLORS.gold, alignItems: 'center',
  },
  nextTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#FFF', letterSpacing: 0.5 },

  // Result
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  resultTitleCol: { flex: 1, gap: 4 },
  archetypeEye: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1.5, fontWeight: FONTS.weights.bold },
  archetypeName: { fontSize: 22, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: -0.5 },
  archetypeTagline: { fontSize: FONTS.sizes.sm, color: COLORS.goldDark, fontStyle: 'italic', lineHeight: 18 },
  archetypeDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 22, marginBottom: SPACING.md },
  strengthRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  strengthCard: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, gap: 6 },
  strengthEye: { fontSize: 8, color: COLORS.goldDark, letterSpacing: 1.2, fontWeight: FONTS.weights.bold },
  strengthTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 18 },

  dimHeader: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: SPACING.sm, fontWeight: FONTS.weights.bold },
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 10 },
  dimLabel: { width: 72, fontSize: FONTS.sizes.xs, color: COLORS.textDim },
  dimTrack: { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  dimFill: { height: '100%', borderRadius: 2 },
  dimScore: { width: 24, fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'right' },

  nextMoveCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.gold + '30',
    padding: SPACING.md, gap: 8, marginTop: SPACING.md,
  },
  nextMoveEye: { fontSize: 9, color: COLORS.gold, fontWeight: FONTS.weights.bold, letterSpacing: 1.5 },
  nextMoveTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 22 },
  limitingNote: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    textAlign: 'center', marginTop: SPACING.md, lineHeight: 18,
    paddingBottom: SPACING.xl,
  },
});

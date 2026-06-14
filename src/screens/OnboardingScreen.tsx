import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, TextInput, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  OnboardingAnswers, calculateOnboardingScore,
  markOnboardingComplete, storeOnboardingAnswers, OnboardingResult,
} from '../services/onboarding';
import TierBadge from '../components/TierBadge';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW, CARD_SHADOW_STRONG } from '../constants/theme';
import { TIERS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const STEPS = ['hook', 'name', 'quiz', 'calculating', 'reveal', 'gaps'] as const;
type Step = typeof STEPS[number];

const AGE_OPTIONS    = ['18–24', '25–34', '35–44', '45+'];
const INCOME_OPTIONS = ['Under $40K', '$40K – $70K', '$70K – $120K', '$120K+'];
const GOAL_OPTIONS   = ['Build wealth', 'Get out of debt', 'Save more', 'Grow investments'];

interface Props { onComplete: () => void }

// ─── Animated chip ───────────────────────────────────────────────────────────
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 70, useNativeDriver: false }),
      Animated.spring(scale,  { toValue: 1,    useNativeDriver: false, tension: 200, friction: 6 }),
    ]).start(onPress);
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={press}
        activeOpacity={1}
      >
        {selected && <View style={styles.chipDot} />}
        <Text style={[styles.chipTxt, selected && styles.chipTxtSelected]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Calculating screen (flickering bars + numbers) ──────────────────────────
function CalculatingView() {
  const bars = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current,
                useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  const [num, setNum] = useState('---');

  useEffect(() => {
    bars.forEach((b, i) => {
      Animated.loop(Animated.sequence([
        Animated.timing(b, { toValue: 0.3 + Math.random() * 0.7, duration: 300 + i * 80, useNativeDriver: false }),
        Animated.timing(b, { toValue: 0.3 + Math.random() * 0.5, duration: 400 + i * 60, useNativeDriver: false }),
      ])).start();
    });
    const id = setInterval(() => setNum(String(Math.floor(Math.random() * 400 + 300))), 80);
    return () => clearInterval(id);
  }, []);

  const LABELS = ['Savings velocity', 'Investment gap', 'Spending habits', 'Debt profile'];
  const BAR_COLORS = [COLORS.green, COLORS.gold, COLORS.tierSilver, COLORS.tierPlatinum];

  return (
    <View style={styles.calcWrap}>
      <Text style={styles.calcLabel}>ANALYSING YOUR PROFILE</Text>
      <Text style={styles.calcNum}>{num}</Text>
      <View style={styles.barsWrap}>
        {bars.map((b, i) => (
          <View key={i} style={styles.barRow}>
            <Text style={styles.barLabel}>{LABELS[i]}</Text>
            <View style={styles.barTrack}>
              <Animated.View style={[styles.barFill, { flex: b, backgroundColor: BAR_COLORS[i] }]} />
              <Animated.View style={{ flex: Animated.subtract(new Animated.Value(1), b) }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Score reveal number ──────────────────────────────────────────────────────
function CountUp({ target, onDone }: { target: number; onDone: () => void }) {
  const [display, setDisplay] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    Animated.timing(anim, { toValue: target, duration: 2000, useNativeDriver: false, delay: 200 }).start(({ finished }) => {
      if (finished) { anim.removeListener(id); onDone(); }
    });
    return () => anim.removeListener(id);
  }, [target]);

  return <Text style={styles.revealScore}>{display}</Text>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep]       = useState<Step>('hook');
  const [name, setName]       = useState('');
  const [quizQ, setQuizQ]     = useState(0); // 0=age, 1=income, 2=goal
  const [age, setAge]         = useState('');
  const [income, setIncome]   = useState('');
  const [goal, setGoal]       = useState('');
  const [result, setResult]   = useState<OnboardingResult | null>(null);
  const [scoreReady, setScoreReady] = useState(false);

  // Screen fade
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Gap stagger anims
  const gapAnims = [useRef(new Animated.Value(0)).current,
                    useRef(new Animated.Value(0)).current,
                    useRef(new Animated.Value(0)).current];

  // Progress (0–1 for bar)
  const STEP_PROGRESS: Record<Step, number> = {
    hook: 0, name: 0.1, quiz: 0.35, calculating: 0.65, reveal: 0.85, gaps: 1,
  };
  const progressAnim = useRef(new Animated.Value(0)).current;

  const transitionTo = (next: Step) => {
    setStep(next);
    Animated.timing(progressAnim, {
      toValue: STEP_PROGRESS[next],
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
  }, []);

  // Auto-advance from calculating
  useEffect(() => {
    if (step !== 'calculating') return;
    const t = setTimeout(() => {
      const answers: OnboardingAnswers = { name, age, income, goal };
      const res = calculateOnboardingScore(answers);
      setResult(res);
      transitionTo('reveal');
    }, 3200);
    return () => clearTimeout(t);
  }, [step]);

  const handleGapStagger = () => {
    gapAnims.forEach((a, i) => {
      Animated.timing(a, { toValue: 1, duration: 400, delay: i * 180, useNativeDriver: false }).start();
    });
  };

  const handleComplete = async () => {
    if (!result) return;
    const answers: OnboardingAnswers = { name: name.trim(), age, income, goal };
    await storeOnboardingAnswers(answers);
    await markOnboardingComplete({ ...result, name: name.trim() });
    onComplete();
  };

  // Quiz: which question to show
  const handleChipSelect = (value: string) => {
    if (quizQ === 0) { setAge(value); setTimeout(() => setQuizQ(1), 300); }
    else if (quizQ === 1) { setIncome(value); setTimeout(() => setQuizQ(2), 300); }
    else if (quizQ === 2) { setGoal(value); setTimeout(() => transitionTo('calculating'), 400); }
  };

  const progressBarWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const showProgress = step !== 'hook';

  return (
    <View style={styles.root}>

      {/* ── HOOK ── */}
      {step === 'hook' && (
        <View style={styles.hookBg}>
          <SafeAreaView style={styles.hookSafe}>
            <Animated.View style={[styles.hookContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.hookTop}>
                <Text style={styles.hookEyebrow}>VAULT</Text>
                <Text style={styles.hookHeadline}>
                  Most people have no idea where their money is going.
                </Text>
                <Text style={styles.hookSub}>You're about to.</Text>
              </View>
              <TouchableOpacity
                style={styles.hookCta}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); transitionTo('name'); }}
                activeOpacity={0.85}
              >
                <Text style={styles.hookCtaTxt}>See where I stand</Text>
              </TouchableOpacity>
            </Animated.View>
          </SafeAreaView>
        </View>
      )}

      {/* ── ALL OTHER STEPS ── */}
      {step !== 'hook' && (
        <SafeAreaView style={styles.container}>

          {/* Progress bar */}
          {showProgress && (
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressBarWidth }]} />
            </View>
          )}

          <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* ── NAME ── */}
            {step === 'name' && (
              <View style={styles.stepWrap}>
                <Text style={styles.stepEyebrow}>STEP 1 OF 3</Text>
                <Text style={styles.stepTitle}>What should we call you?</Text>
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="First name"
                  placeholderTextColor={COLORS.textMuted}
                  autoFocus
                  returnKeyType="next"
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  style={[styles.nextBtn, !name.trim() && styles.nextBtnOff]}
                  onPress={() => name.trim() && transitionTo('quiz')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.nextBtnTxt, !name.trim() && styles.nextBtnTxtOff]}>Continue</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── QUIZ ── */}
            {step === 'quiz' && (
              <View style={styles.stepWrap}>
                {quizQ === 0 && (
                  <>
                    <Text style={styles.stepEyebrow}>STEP 2 OF 3</Text>
                    <Text style={styles.stepTitle}>How old are you,{'\n'}{name}?</Text>
                    <View style={styles.chips}>
                      {AGE_OPTIONS.map(o => (
                        <Chip key={o} label={o} selected={age === o} onPress={() => handleChipSelect(o)} />
                      ))}
                    </View>
                  </>
                )}
                {quizQ === 1 && (
                  <>
                    <Text style={styles.stepEyebrow}>STEP 2 OF 3</Text>
                    <Text style={styles.stepTitle}>What's your annual{'\n'}income range?</Text>
                    <View style={styles.chips}>
                      {INCOME_OPTIONS.map(o => (
                        <Chip key={o} label={o} selected={income === o} onPress={() => handleChipSelect(o)} />
                      ))}
                    </View>
                  </>
                )}
                {quizQ === 2 && (
                  <>
                    <Text style={styles.stepEyebrow}>STEP 3 OF 3</Text>
                    <Text style={styles.stepTitle}>What's your biggest{'\n'}money goal?</Text>
                    <View style={styles.chips}>
                      {GOAL_OPTIONS.map(o => (
                        <Chip key={o} label={o} selected={goal === o} onPress={() => handleChipSelect(o)} />
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}

            {/* ── CALCULATING ── */}
            {step === 'calculating' && <CalculatingView />}

            {/* ── REVEAL ── */}
            {step === 'reveal' && result && (
              <View style={styles.revealWrap}>
                <Text style={styles.revealEyebrow}>YOUR WEALTH VELOCITY SCORE</Text>

                <CountUp
                  target={result.score}
                  onDone={() => {
                    setScoreReady(true);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  }}
                />

                {scoreReady && (
                  <Animated.View style={styles.revealBelow}>
                    <Text style={styles.revealPercentile}>
                      This is your starting point.{' '}
                      <Text style={styles.revealPct}>Connect your accounts</Text>
                      {' '}to unlock your real score.
                    </Text>

                    <View style={styles.revealTierWrap}>
                      <TierBadge tier={result.tier} size="lg" />
                      <Text style={[styles.revealTierName, { color: TIERS[result.tier].color }]}>
                        {TIERS[result.tier].name} Member
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.revealCta}
                      onPress={() => { transitionTo('gaps'); setTimeout(handleGapStagger, 400); }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.revealCtaTxt}>See what's holding you back →</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            )}

            {/* ── GAPS ── */}
            {step === 'gaps' && result && (
              <View style={styles.gapsWrap}>
                <Text style={styles.gapsEyebrow}>YOUR MONEY GAPS</Text>
                <Text style={styles.gapsTitle}>
                  Here's what we found,{'\n'}{name}.
                </Text>
                <Text style={styles.gapsSub}>
                  VAULT will help you close every one of these.
                </Text>

                <View style={styles.gapsList}>
                  {result.gaps.map((gap, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.gapCard,
                        CARD_SHADOW,
                        { shadowOpacity: 0.08 },
                        { opacity: gapAnims[i], transform: [{ translateY: gapAnims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
                      ]}
                    >
                      <Text style={styles.gapIcon}>{gap.icon}</Text>
                      <Text style={styles.gapText}>{gap.text}</Text>
                    </Animated.View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.launchBtn}
                  onPress={handleComplete}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={[COLORS.goldLight, COLORS.gold, COLORS.goldDark]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.launchGradient}
                  >
                    <Text style={styles.launchTxt}>Show me my moves</Text>
                    <Text style={styles.launchArrow}>→</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.launchFooter}>No credit card. Free to start.</Text>
              </View>
            )}

          </Animated.View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Hook ──
  hookBg: {
    flex: 1,
    backgroundColor: '#08080C',
  },
  hookSafe: { flex: 1 },
  hookContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: height * 0.15,
    paddingBottom: SPACING.xxl,
  },
  hookTop: { gap: SPACING.lg },
  hookEyebrow: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gold,
    letterSpacing: FONTS.tracking.widest * 1.5,
    fontWeight: FONTS.weights.semibold,
  },
  hookHeadline: {
    fontFamily: FONTS.display,
    fontSize: 38,
    fontWeight: FONTS.weights.light,
    color: '#F2EFE9',
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  hookSub: {
    fontFamily: FONTS.display,
    fontSize: 38,
    fontWeight: FONTS.weights.light,
    color: COLORS.gold,
    lineHeight: 46,
  },
  hookCta: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingVertical: 18,
    alignItems: 'center',
  },
  hookCtaTxt: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: '#08080C',
    letterSpacing: FONTS.tracking.wide,
  },

  // ── Container for non-hook steps ──
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressTrack: {
    height: 2,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
  },
  stepContent: {
    flex: 1,
  },

  // ── Name + Quiz shared layout ──
  stepWrap: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: height * 0.1,
    gap: SPACING.lg,
  },
  stepEyebrow: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
    fontWeight: FONTS.weights.semibold,
  },
  stepTitle: {
    fontFamily: FONTS.display,
    fontSize: 34,
    fontWeight: FONTS.weights.light,
    color: COLORS.text,
    lineHeight: 42,
    letterSpacing: -0.5,
  },

  // ── Name input ──
  nameInput: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.light,
    color: COLORS.text,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.gold,
    paddingVertical: SPACING.sm,
    letterSpacing: FONTS.tracking.tight,
    marginTop: SPACING.sm,
  },
  nextBtn: {
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  nextBtnOff: {
    backgroundColor: COLORS.border,
  },
  nextBtnTxt: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.background,
    letterSpacing: FONTS.tracking.wide,
  },
  nextBtnTxtOff: { color: COLORS.textMuted },

  // ── Quiz chips ──
  chips: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    ...CARD_SHADOW,
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  chipSelected: {
    borderColor: COLORS.gold + '70',
    backgroundColor: COLORS.goldGlow,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.gold,
  },
  chipTxt: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textDim,
    fontWeight: FONTS.weights.medium,
  },
  chipTxtSelected: {
    color: COLORS.gold,
    fontWeight: FONTS.weights.semibold,
  },

  // ── Calculating ──
  calcWrap: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: height * 0.12,
    gap: SPACING.xl,
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
    fontWeight: FONTS.weights.semibold,
  },
  calcNum: {
    fontFamily: FONTS.display,
    fontSize: 80,
    fontWeight: FONTS.weights.light,
    color: COLORS.gold,
    letterSpacing: -2,
    lineHeight: 88,
  },
  barsWrap: {
    width: '100%',
    gap: SPACING.md,
  },
  barRow: {
    gap: 8,
  },
  barLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wider,
    textTransform: 'uppercase',
  },
  barTrack: {
    flexDirection: 'row',
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 1.5,
  },

  // ── Reveal ──
  revealWrap: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: height * 0.1,
    alignItems: 'center',
    gap: SPACING.lg,
  },
  revealEyebrow: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
    fontWeight: FONTS.weights.semibold,
    textAlign: 'center',
  },
  revealScore: {
    fontFamily: FONTS.display,
    fontSize: 100,
    fontWeight: FONTS.weights.light,
    color: COLORS.gold,
    letterSpacing: -4,
    lineHeight: 108,
    textAlign: 'center',
    shadowColor: COLORS.gold,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  revealBelow: {
    alignItems: 'center',
    gap: SPACING.lg,
    width: '100%',
  },
  revealPercentile: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },
  revealPct: {
    color: COLORS.text,
    fontWeight: FONTS.weights.bold,
  },
  revealTierWrap: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.card,
    width: '100%',
    ...CARD_SHADOW,
    shadowOpacity: 0.1,
  },
  revealTierName: {
    fontFamily: FONTS.display,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.light,
    letterSpacing: FONTS.tracking.wide,
  },
  revealCta: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderMid,
    width: '100%',
    alignItems: 'center',
  },
  revealCtaTxt: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textDim,
    letterSpacing: FONTS.tracking.wide,
  },

  // ── Gaps ──
  gapsWrap: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: height * 0.07,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  gapsEyebrow: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
    fontWeight: FONTS.weights.semibold,
  },
  gapsTitle: {
    fontFamily: FONTS.display,
    fontSize: 34,
    fontWeight: FONTS.weights.light,
    color: COLORS.text,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  gapsSub: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  gapsList: {
    flex: 1,
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  gapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  gapIcon: { fontSize: 24, width: 34, textAlign: 'center' },
  gapText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 22,
    fontWeight: FONTS.weights.medium,
  },

  launchBtn: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  launchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 18,
  },
  launchTxt: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: '#08080C',
    letterSpacing: FONTS.tracking.wide,
  },
  launchArrow: {
    fontSize: FONTS.sizes.lg,
    color: '#08080C',
    fontWeight: FONTS.weights.bold,
  },
  launchFooter: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    letterSpacing: FONTS.tracking.wide,
    marginTop: 4,
  },
});

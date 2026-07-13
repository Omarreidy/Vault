import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WealthMove } from '../types';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const { width } = Dimensions.get('window');

const META: Record<string, { accent: string; tag: string }> = {
  savings:     { accent: COLORS.gold,         tag: 'SAVINGS'     },
  investment:  { accent: COLORS.gold,         tag: 'INVESTMENT'  },
  debt:        { accent: COLORS.tierSilver,   tag: 'DEBT'        },
  spending:    { accent: COLORS.tierPlatinum, tag: 'SPENDING'    },
  opportunity: { accent: COLORS.goldDark,     tag: 'OPPORTUNITY' },
};

const EFFORT = { instant: '< 1 min', quick: '5 min', medium: '30 min' };

interface Props {
  move: WealthMove;
  onAct: () => void;
  onSkip: () => void;
  onAskConcierge?: () => void;
  index: number;
  total: number;
}

// ─── Lesson bottom sheet (separate modal — zero layout impact on card) ─────

function LessonSheet({
  visible,
  move,
  accent,
  onClose,
  onLearned,
}: {
  visible: boolean;
  move: WealthMove;
  accent: string;
  onClose: () => void;
  onLearned: () => void;
}) {
  const slideY    = useRef(new Animated.Value(300)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const xpSlideY  = useRef(new Animated.Value(0)).current;
  // Prevent double-tap on "Got it"
  const gotItFired = useRef(false);

  const open = () => {
    // Reset XP float state on every open so it doesn't linger from a prior session
    xpOpacity.setValue(0);
    xpSlideY.setValue(0);
    btnScale.setValue(1);
    gotItFired.current = false;
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideY,    { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const close = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideY,    { toValue: 300, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      slideY.setValue(300);
      bgOpacity.setValue(0);
      callback?.();
    });
  };

  const handleGotIt = () => {
    if (gotItFired.current) return;
    gotItFired.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    xpOpacity.setValue(1);
    xpSlideY.setValue(0);
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.12, tension: 200, friction: 6, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1,    tension: 200, friction: 6, useNativeDriver: true }),
    ]).start();
    Animated.timing(xpSlideY, { toValue: -30, duration: 500, useNativeDriver: true }).start();
    setTimeout(() => {
      close(onLearned);
    }, 600);
  };

  if (!move.lesson) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={open}
      onRequestClose={() => close(onClose)}
    >
      <View style={sheetStyles.root}>
        <Animated.View style={[sheetStyles.backdrop, { opacity: bgOpacity }]} />
        <TouchableOpacity style={sheetStyles.backdropTap} onPress={() => close(onClose)} activeOpacity={1} />

        <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY: slideY }] }]}>
          <View style={[sheetStyles.accentBar, { backgroundColor: accent }]} />

          <View style={sheetStyles.inner}>
            <View style={sheetStyles.handleRow}>
              <View style={sheetStyles.handle} />
            </View>

            <Text style={sheetStyles.eyebrow}>WHY THIS WORKS</Text>
            <Text style={[sheetStyles.headline, { color: accent }]}>{move.lesson.headline}</Text>
            <Text style={sheetStyles.body}>{move.lesson.body}</Text>

            <View style={sheetStyles.footer}>
              <Animated.View style={{ transform: [{ scale: btnScale }], position: 'relative' }}>
                <TouchableOpacity
                  style={[sheetStyles.gotItBtn, { backgroundColor: accent }]}
                  onPress={handleGotIt}
                  activeOpacity={0.85}
                >
                  <Text style={sheetStyles.gotItTxt}>Got it  ·  +{move.lesson.xp} XP</Text>
                </TouchableOpacity>
                <Animated.Text style={[sheetStyles.xpFloat, { color: accent, opacity: xpOpacity, transform: [{ translateY: xpSlideY }] }]}>
                  +{move.lesson.xp} XP
                </Animated.Text>
              </Animated.View>
              <TouchableOpacity style={sheetStyles.dismissBtn} onPress={() => close(onClose)} activeOpacity={0.7}>
                <Text style={sheetStyles.dismissTxt}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  backdropTap: { ...StyleSheet.absoluteFill },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
  },
  accentBar: { height: 3 },
  inner: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 36 },
  handleRow: { alignItems: 'center', marginBottom: SPACING.xs },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  eyebrow: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  headline: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontSize: FONTS.sizes.md, color: COLORS.textDim, lineHeight: 24 },
  footer: { gap: SPACING.sm, paddingTop: SPACING.sm },
  gotItBtn: {
    paddingVertical: 14, borderRadius: RADIUS.full, alignItems: 'center',
  },
  gotItTxt: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#FFF', letterSpacing: 0.3 },
  xpFloat: {
    position: 'absolute', top: -10, right: 16,
    fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold,
  },
  dismissBtn: { alignItems: 'center', paddingVertical: 8 },
  dismissTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
});

// ─── Main card ────────────────────────────────────────────────────────────────

export default function FeedMoveCard({ move, onAct, onSkip, onAskConcierge, index, total }: Props) {
  const meta = META[move.category] ?? META.opportunity;
  const insets = useSafeAreaInsets();
  const [lessonOpen, setLessonOpen] = useState(false);
  const [learned, setLearned]       = useState(false);

  const actScale   = useRef(new Animated.Value(1)).current;
  const skipScale  = useRef(new Animated.Value(1)).current;
  // Guard: prevent double-fire if user taps Act or Skip rapidly
  const pressing = useRef(false);

  const press = (anim: Animated.Value, cb: () => void) => {
    if (pressing.current) return;
    pressing.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1,    duration: 70, useNativeDriver: true }),
    ]).start(() => {
      pressing.current = false;
      cb();
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topAccent, { backgroundColor: meta.accent }]} />
      <View style={[styles.inner, { paddingBottom: SPACING.xl + insets.bottom }]}>

        <View>
          <View style={styles.topRow}>
            <View style={styles.tagGroup}>
              <View style={[styles.tag, { backgroundColor: meta.accent + '15', borderColor: meta.accent + '35' }]}>
                <View style={[styles.tagDot, { backgroundColor: meta.accent }]} />
                <Text style={[styles.tagTxt, { color: meta.accent }]}>{meta.tag}</Text>
              </View>
              {move.personalized && (
                <View style={styles.liveTag}>
                  <View style={styles.liveTagDot} />
                  <Text style={styles.liveTagTxt}>YOUR ACCOUNTS</Text>
                </View>
              )}
            </View>
            <View style={styles.topRight}>
              {/* Effort yields to the provenance badge on narrow screens */}
              {!move.personalized && <Text style={styles.effort}>{EFFORT[move.effort]}</Text>}
              <Text style={styles.counter}>{index + 1} / {total}</Text>
            </View>
          </View>

          <View style={styles.body}>
            {move.personalized && index === 0 && (
              <Text style={styles.firstMoveEyebrow}>YOUR #1 MOVE TODAY</Text>
            )}
            <Text style={styles.title} numberOfLines={3}>{move.title}</Text>
            <Text style={styles.desc} numberOfLines={5}>{move.description}</Text>
          </View>
        </View>

        <View style={styles.bottomSection}>

          <View style={styles.impactBlock}>
            <Text style={styles.impactLabel}>POTENTIAL VALUE</Text>
            <Text
              style={[styles.impactValue, { color: meta.accent, fontFamily: FONTS.display }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {move.impact}
            </Text>
          </View>

          {/* Why this works — opens bottom sheet, NO layout change on card */}
          {move.lesson && (
            <TouchableOpacity
              style={[styles.lessonBtn, learned && styles.lessonBtnLearned]}
              onPress={() => {
                if (learned) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setLessonOpen(true);
              }}
              activeOpacity={0.8}
            >
              {learned ? (
                <Text style={styles.learnedTxt} numberOfLines={1}>✓ Learned  ·  +{move.lesson.xp} XP</Text>
              ) : (
                <>
                  <Text style={styles.lessonBtnTxt} numberOfLines={1}>Why this works</Text>
                  <Text style={[styles.lessonChevron, { color: meta.accent }]}>▸</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {onAskConcierge && (
            <TouchableOpacity style={styles.conciergeBtn} onPress={onAskConcierge} activeOpacity={0.8}>
              <Text style={styles.conciergeTxt} numberOfLines={1}>✦ Ask Concierge about this</Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />
          <Text style={styles.swipeHint}>↑ swipe for next</Text>

          <View style={styles.actions}>
            <Animated.View style={{ flex: 1, transform: [{ scale: skipScale }] }}>
              <TouchableOpacity style={styles.skipBtn} onPress={() => press(skipScale, onSkip)} activeOpacity={1}>
                <Text style={styles.skipTxt}>Skip</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={{ flex: 2.5, transform: [{ scale: actScale }] }}>
              <TouchableOpacity
                style={[styles.actBtn, { backgroundColor: meta.accent }]}
                onPress={() => press(actScale, onAct)}
                activeOpacity={0.85}
              >
                <Text style={styles.actTxt} numberOfLines={1}>{move.actionLabel}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

        </View>
      </View>
      <View style={[styles.bottomAccent, { backgroundColor: meta.accent }]} />

      {/* Lesson sheet — rendered outside card layout, zero interference */}
      {move.lesson && (
        <LessonSheet
          visible={lessonOpen}
          move={move}
          accent={meta.accent}
          onClose={() => setLessonOpen(false)}
          onLearned={() => { setLessonOpen(false); setLearned(true); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width, backgroundColor: COLORS.background },
  topAccent: { height: 3 },
  bottomAccent: { height: 3 },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    justifyContent: 'space-between',
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  liveTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
    backgroundColor: 'rgba(126,184,164,0.1)', borderColor: 'rgba(126,184,164,0.35)',
  },
  liveTagDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#7EB8A4' },
  liveTagTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.wide, color: '#7EB8A4' },
  firstMoveEyebrow: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gold,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.widest,
  },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  tagDot: { width: 5, height: 5, borderRadius: 2.5 },
  tagTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  effort: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  counter: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },

  body: { justifyContent: 'flex-start', paddingTop: SPACING.lg, gap: 16, overflow: 'hidden' },
  title: {
    fontSize: 30,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    lineHeight: 36,
    letterSpacing: FONTS.tracking.tight,
  },
  desc: { fontSize: FONTS.sizes.md, color: COLORS.textDim, lineHeight: FONTS.sizes.md * 1.75 },

  bottomSection: { gap: SPACING.md },

  impactBlock: { gap: 4 },
  impactLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  impactValue: { fontSize: 48, fontWeight: FONTS.weights.light, lineHeight: 54, letterSpacing: -2 },

  lessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  lessonBtnLearned: {
    borderColor: COLORS.gold + '50',
    backgroundColor: COLORS.goldGlow,
  },
  lessonBtnTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: 0.3,
    flex: 1,
  },
  lessonChevron: { fontSize: FONTS.sizes.sm },
  learnedTxt: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.goldDark,
    letterSpacing: 0.5,
    flex: 1,
  },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
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

  actions: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'stretch' },
  skipBtn: { paddingVertical: 14, paddingHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md },
  skipTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.text, letterSpacing: FONTS.tracking.wide },
  actBtn: { paddingVertical: 14, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  actTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: '#08080C', letterSpacing: FONTS.tracking.wide },
});

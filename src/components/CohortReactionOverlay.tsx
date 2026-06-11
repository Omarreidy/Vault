import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
const MEMBERS = [
  { id: 'a1', initials: '◆', label: 'Member' },
  { id: 'a2', initials: '◆', label: 'Member' },
  { id: 'a3', initials: '◆', label: 'Member' },
  { id: 'a4', initials: '◆', label: 'Member' },
  { id: 'a5', initials: '◆', label: 'Member' },
];

interface Reaction {
  label: string;
  emoji: string;
  count: number;
  reacted: boolean;
}

const BASE_REACTIONS: Reaction[] = [
  { label: 'Locked In', emoji: '🔒', count: 0, reacted: false },
  { label: 'Building',  emoji: '📈', count: 0, reacted: false },
  { label: 'Witnessed', emoji: '👁',  count: 0, reacted: false },
];

interface Props {
  visible: boolean;
  moveTitle: string;
  onDismiss: () => void;
}

export default function CohortReactionOverlay({ visible, moveTitle, onDismiss }: Props) {
  const [reactions, setReactions] = useState<Reaction[]>(BASE_REACTIONS.map(r => ({ ...r })));
  const [reacted, setReacted]     = useState(false);
  const [membersVisible, setMembersVisible] = useState<boolean[]>(MEMBERS.map(() => false));

  const slideY      = useRef(new Animated.Value(300)).current;
  const bgOpacity   = useRef(new Animated.Value(0)).current;
  const progressBar = useRef(new Animated.Value(1)).current;
  const memberAnims = useRef(MEMBERS.map(() => new Animated.Value(0))).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setReactions(BASE_REACTIONS.map(r => ({ ...r })));
    setReacted(false);
    setMembersVisible(MEMBERS.map(() => false));
    slideY.setValue(300);
    bgOpacity.setValue(0);
    progressBar.setValue(1);
    memberAnims.forEach(a => a.setValue(0));
  };

  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }

    // Slide in
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 1, duration: 260, useNativeDriver: false }),
      Animated.spring(slideY,    { toValue: 0, tension: 70, friction: 10, useNativeDriver: false }),
    ]).start();

    // Stagger member circles in
    MEMBERS.forEach((_, i) => {
      setTimeout(() => {
        setMembersVisible(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        Animated.spring(memberAnims[i], {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: false,
        }).start();
      }, 200 + i * 100);
    });

    // Simulate cohort members reacting live
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setReactions(prev => prev.map((r, i) => i === 2 ? { ...r, count: r.count + 1 } : r)); // Witnessed +1
    }, 800);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setReactions(prev => prev.map((r, i) => i === 0 ? { ...r, count: r.count + 1 } : r)); // Locked In +1
    }, 1600);

    // Auto-dismiss progress bar
    progressBar.setValue(1);
    Animated.timing(progressBar, {
      toValue: 0,
      duration: 4000,
      useNativeDriver: false,
    }).start();

    // Auto-dismiss after 4s
    dismissTimer.current = setTimeout(() => {
      handleDismiss();
    }, 4000);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [visible]);

  const handleDismiss = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(slideY,    { toValue: 300, duration: 220, useNativeDriver: false }),
    ]).start(() => {
      reset();
      onDismiss();
    });
  };

  const handleReaction = (index: number) => {
    if (reacted) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setReacted(true);
    setReactions(prev => prev.map((r, i) =>
      i === index ? { ...r, count: r.count + 1, reacted: true } : r
    ));
    setTimeout(handleDismiss, 900);
  };

  const barWidth = progressBar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: bgOpacity }]} />

        {/* Tap backdrop to dismiss */}
        <TouchableOpacity style={styles.backdropTap} onPress={handleDismiss} activeOpacity={1} />

        {/* Sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: barWidth }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>WITNESSED BY YOUR COHORT</Text>
            <View style={styles.moveRow}>
              <Text style={styles.moveMark}>◆</Text>
              <Text style={styles.moveTitle} numberOfLines={2}>{moveTitle}</Text>
            </View>
          </View>

          {/* Member avatars */}
          <View style={styles.membersRow}>
            {MEMBERS.map((member, i) => (
              <Animated.View
                key={member.id}
                style={[
                  styles.memberWrap,
                  {
                    opacity: memberAnims[i],
                    transform: [{ scale: memberAnims[i] }],
                  },
                ]}
              >
                <View style={styles.memberCircle}>
                  <Text style={styles.memberInitials}>{member.initials}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>{member.label}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Reaction prompt */}
          <Text style={styles.reactPrompt}>
            {reacted ? 'Reaction sent ✓' : 'How do you feel about this move?'}
          </Text>

          {/* Reactions */}
          <View style={styles.reactionsRow}>
            {reactions.map((r, i) => (
              <ReactionButton
                key={r.label}
                reaction={r}
                onPress={() => handleReaction(i)}
                disabled={reacted}
              />
            ))}
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

function ReactionButton({ reaction, onPress, disabled }: {
  reaction: Reaction;
  onPress: () => void;
  disabled: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (disabled) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, tension: 200, friction: 6, useNativeDriver: false }),
      Animated.spring(scale, { toValue: 1.12, tension: 200, friction: 6, useNativeDriver: false }),
      Animated.spring(scale, { toValue: 1,    tension: 200, friction: 6, useNativeDriver: false }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          btnStyles.btn,
          reaction.reacted && btnStyles.btnActive,
          disabled && !reaction.reacted && btnStyles.btnDimmed,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={btnStyles.emoji}>{reaction.emoji}</Text>
        <Text style={[btnStyles.label, reaction.reacted && btnStyles.labelActive]}>
          {reaction.label}
        </Text>
        {reaction.count > 0 && (
          <View style={[btnStyles.countBadge, reaction.reacted && btnStyles.countBadgeActive]}>
            <Text style={[btnStyles.countTxt, reaction.reacted && btnStyles.countTxtActive]}>
              {reaction.count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  backdropTap: { ...StyleSheet.absoluteFill },

  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '30',
    borderBottomWidth: 0,
    overflow: 'hidden',
  },

  progressTrack: {
    height: 2,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: 2,
    backgroundColor: COLORS.gold,
  },

  header: { padding: SPACING.lg, gap: SPACING.sm },
  eyebrow: {
    fontSize: 9,
    color: COLORS.gold,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.widest,
  },
  moveRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  moveMark: { fontSize: 14, color: COLORS.gold, marginTop: 2 },
  moveTitle: {
    flex: 1,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    lineHeight: 24,
    letterSpacing: FONTS.tracking.tight,
  },

  membersRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  memberWrap: { alignItems: 'center', gap: 5 },
  memberCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.goldGlow,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '60',
    alignItems: 'center', justifyContent: 'center',
  },
  memberInitials: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  memberName: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: FONTS.weights.medium,
  },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg },

  reactPrompt: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.wide,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },

  reactionsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
});

const btnStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  btnActive: {
    borderColor: COLORS.gold + '60',
    backgroundColor: COLORS.goldGlow,
  },
  btnDimmed: { opacity: 0.45 },
  emoji: { fontSize: 13 },
  label: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textDim,
    fontWeight: FONTS.weights.medium,
  },
  labelActive: { color: COLORS.goldDark, fontWeight: FONTS.weights.bold },
  countBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeActive: { backgroundColor: COLORS.gold + '30' },
  countTxt: { fontSize: 9, fontWeight: FONTS.weights.bold, color: COLORS.textMuted },
  countTxtActive: { color: COLORS.goldDark },
});

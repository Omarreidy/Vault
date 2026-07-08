import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  VaultNotification, timeAgo, NotifType,
  loadNotifications, markNotificationRead, dismissNotification,
} from '../services/notifications';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import { getSavedInsights, SavedInsight, removeSavedInsight } from '../services/savedInsights';

const TYPE_COLORS: Record<NotifType, string> = {
  score_up:           COLORS.green,
  score_down:         COLORS.red,
  tier_progress:      COLORS.gold,
  streak:             '#FF8C00',
  new_moves:          COLORS.gold,
  challenge_complete: COLORS.green,
  goal_milestone:     COLORS.green,
  insight:            COLORS.tierSilver,
  win:                COLORS.gold,
};

function NotifRow({
  notif,
  onRead,
  onDismiss,
}: {
  notif: VaultNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const accentColor = TYPE_COLORS[notif.type];
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const heightAnim = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (!notif.read) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.98, duration: 80, useNativeDriver: false }),
        Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: false }),
      ]).start(() => onRead(notif.id));
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.parallel([
      Animated.timing(fadeAnim,   { toValue: 0, duration: 250, useNativeDriver: false }),
      Animated.timing(heightAnim, { toValue: 0, duration: 300, delay: 100, useNativeDriver: false }),
    ]).start(() => onDismiss(notif.id));
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.row,
          !notif.read && styles.rowUnread,
          CARD_SHADOW,
          { shadowOpacity: notif.read ? 0.05 : 0.09 },
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {/* Unread dot */}
        {!notif.read && <View style={[styles.unreadDot, { backgroundColor: accentColor }]} />}

        {/* Left accent */}
        <View style={[styles.accentBar, { backgroundColor: accentColor, opacity: notif.read ? 0.4 : 1 }]} />

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: accentColor + '12' }]}>
          <Text style={[styles.icon, { color: accentColor }]}>{notif.icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.title, notif.read && styles.titleRead]} numberOfLines={1}>
              {notif.title}
            </Text>
            {notif.value && (
              <Text style={[styles.value, { color: accentColor }]}>{notif.value}</Text>
            )}
          </View>
          <Text style={styles.body} numberOfLines={2}>{notif.body}</Text>
          <View style={styles.bottomRow}>
            <Text style={styles.time}>{timeAgo(notif.timestamp)}</Text>
            {notif.actionLabel && (
              <Text style={[styles.action, { color: accentColor }]}>{notif.actionLabel} →</Text>
            )}
          </View>
        </View>

        {/* Dismiss */}
        <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.dismissIcon}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  onClose: () => void;
}

export default function NotificationsScreen({ onClose }: Props) {
  const [notifs, setNotifs] = useState<VaultNotification[]>([]);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const unreadCount = notifs.filter(n => !n.read).length;

  useEffect(() => {
    loadNotifications().then(setNotifs).catch(() => {});
    getSavedInsights().then(setSavedInsights).catch(() => {});
  }, []);

  const markRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    markNotificationRead(id).catch(() => {});
  };

  const dismiss = (id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    dismissNotification(id).catch(() => {});
  };

  const markAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    notifs.forEach(n => { if (!n.read) markNotificationRead(n.id).catch(() => {}); });
  };

  const unread  = notifs.filter(n => !n.read);
  const read    = notifs.filter(n => n.read);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title2}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadSub}>{unreadCount} unread</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={markAllRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications read"
            >
              <Text style={styles.markAllTxt}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close notifications"
          >
            <Text style={styles.closeTxt}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {savedInsights.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>SAVED INSIGHTS</Text>
            {savedInsights.map(s => (
              <View key={s.id} style={[styles.row, styles.rowUnread, CARD_SHADOW, { shadowOpacity: 0.08 }]}>
                <View style={[styles.accentBar, { backgroundColor: COLORS.gold }]} />
                <View style={[styles.iconWrap, { backgroundColor: COLORS.goldGlow }]}>
                  <Text style={[styles.icon, { color: COLORS.gold }]}>◆</Text>
                </View>
                <View style={styles.content}>
                  <Text style={styles.title} numberOfLines={2}>{s.headline}</Text>
                  <View style={styles.bottomRow}>
                    <Text style={styles.time}>{new Date(s.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    <Text style={[styles.action, { color: COLORS.gold }]}>Saved insight</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={() => {
                    removeSavedInsight(s.id).catch(() => {});
                    setSavedInsights(prev => prev.filter(x => x.id !== s.id));
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.dismissIcon}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {notifs.length === 0 && savedInsights.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>◇</Text>
            <Text style={styles.emptyTitle}>All quiet</Text>
            <Text style={styles.emptySub}>
              Notifications arrive when your score changes, a new wealth move is ready, or you hit a tier milestone.
            </Text>
            <View style={styles.emptyHint}>
              <Text style={styles.emptyHintIcon}>🏦</Text>
              <Text style={styles.emptyHintTxt}>
                Connect your bank from the Home screen to unlock real-time alerts based on your actual accounts.
              </Text>
            </View>
          </View>
        )}

        {unread.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>NEW</Text>
            {unread.map(n => (
              <NotifRow key={n.id} notif={n} onRead={markRead} onDismiss={dismiss} />
            ))}
          </>
        )}

        {read.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>EARLIER</Text>
            {read.map(n => (
              <NotifRow key={n.id} notif={n} onRead={markRead} onDismiss={dismiss} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title2: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  unreadSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gold,
    letterSpacing: FONTS.tracking.wide,
    marginTop: 2,
    fontWeight: FONTS.weights.semibold,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  markAllTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, letterSpacing: FONTS.tracking.wide },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.sheetBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  closeTxt: { fontSize: 20, color: COLORS.textDim, lineHeight: 22 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  scroll: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl },

  sectionLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    letterSpacing: FONTS.tracking.widest,
    fontWeight: FONTS.weights.semibold,
    marginBottom: 4,
    marginTop: SPACING.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
    paddingRight: SPACING.sm,
  },
  rowUnread: {
    borderColor: COLORS.borderMid,
    backgroundColor: COLORS.surface,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 36,
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 1,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  icon: { fontSize: 16, fontFamily: FONTS.display },
  content: { flex: 1, paddingVertical: SPACING.md, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: FONTS.tracking.tight,
  },
  titleRead: { color: COLORS.textDim, fontWeight: FONTS.weights.medium },
  value: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    letterSpacing: FONTS.tracking.wide,
    marginLeft: 4,
  },
  body: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textDim,
    lineHeight: 17,
    letterSpacing: FONTS.tracking.normal,
  },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  time: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  action: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },

  dismissBtn: { padding: 4 },
  dismissIcon: { fontSize: 18, color: COLORS.textMuted, lineHeight: 20 },

  empty: { flex: 1, alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.md, paddingHorizontal: SPACING.lg },
  emptyGlyph: { fontFamily: FONTS.display, fontSize: 36, color: COLORS.gold },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.light, color: COLORS.text, fontFamily: FONTS.display },
  emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center', lineHeight: 22 },
  emptyHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  emptyHintIcon: { fontSize: 16, marginTop: 1 },
  emptyHintTxt: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textDim, lineHeight: 18 },
});

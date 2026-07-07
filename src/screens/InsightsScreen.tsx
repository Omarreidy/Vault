import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  Dimensions, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { INSIGHTS, Insight } from '../services/insights';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW, CARD_SHADOW_STRONG } from '../constants/theme';
import MarketSignal from '../components/MarketSignal';
import CompanyResearch from '../components/CompanyResearch';
import { fetchMarketData, fetchMarketNews, NewsItem, timeAgoNews } from '../services/marketSignal';
import { saveInsight } from '../services/savedInsights';

// Map news categories to Pulse tags
const NEWS_TO_TAG: Record<string, string> = {
  FED: 'MACRO', TECH: 'MARKETS', ENERGY: 'MARKETS',
  CRYPTO: 'MARKETS', EARNINGS: 'MARKETS', MACRO: 'MACRO', LEGAL: 'ECONOMY',
};

// Short "what this means for you" pill driven by sentiment + category
function buildImpactPill(sentiment: string, category: string): string {
  if (sentiment === 'bullish') {
    if (category === 'FED')      return 'Lock in HYSA rates — the window may be short';
    if (category === 'EARNINGS') return 'Strong earnings season — your portfolio may benefit';
    return 'Positive market signal for wealth builders';
  }
  if (sentiment === 'bearish') {
    if (category === 'FED')  return 'HYSA yields may decline — consider longer-term vehicles';
    if (category === 'TECH') return 'Tech exposure may face short-term pressure';
    return 'Defensive positioning may protect your wealth';
  }
  return 'Monitor this for impact on your financial plan';
}

function newsToInsight(news: NewsItem, idx: number): Insight {
  const tag        = NEWS_TO_TAG[news.category] ?? 'MACRO';
  const impactType = news.sentiment === 'bullish' ? 'positive'
                   : news.sentiment === 'bearish' ? 'negative' : 'neutral';
  return {
    id:         `live-${news.id ?? idx}`,
    headline:   news.headline,
    body:       news.impact,
    impact:     buildImpactPill(news.sentiment, news.category),
    impactType: impactType as Insight['impactType'],
    tag,
    timeAgo:    timeAgoNews(news.minutesAgo),
    saved:      false,
  };
}

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const CARD_W = Math.min(width - SPACING.xl * 2, 420);

const TAG_COLORS: Record<string, string> = {
  MACRO:   COLORS.gold,
  MARKETS: COLORS.goldDark,
  CAREER:  COLORS.gold,
  CREDIT:  COLORS.tierSilver,
  ECONOMY: COLORS.tierPlatinum,
};

const IMPACT_COLORS: Record<string, string> = {
  positive: COLORS.goldDark,
  negative: COLORS.red,
  neutral:  COLORS.gold,
};

const FILTERS = ['All', 'MACRO', 'MARKETS', 'CAREER', 'CREDIT', 'ECONOMY'];

const SAVE_MESSAGES = [
  'Knowledge compounds.',
  'Filed for future action.',
  'Your edge is building.',
  'Smart investors read this.',
  'One insight closer.',
  'Bookmark of the day.',
];
const pickMsg = () => SAVE_MESSAGES[Math.floor(Math.random() * SAVE_MESSAGES.length)];

function NewsCard({ insight }: { insight: Insight }) {
  const tagColor    = TAG_COLORS[insight.tag]           ?? COLORS.gold;
  const impactColor = IMPACT_COLORS[insight.impactType] ?? COLORS.gold;

  return (
    <View style={[styles.card, CARD_SHADOW_STRONG]}>
      <View style={[styles.cardAccent, { backgroundColor: tagColor }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardTop}>
          <View style={[styles.tagBadge, { backgroundColor: tagColor + '15', borderColor: tagColor + '35' }]}>
            <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
            <Text style={[styles.tagTxt, { color: tagColor }]}>{insight.tag}</Text>
          </View>
          <Text style={styles.timeAgo}>{insight.timeAgo}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.headline}>{insight.headline}</Text>
          <Text style={styles.body}>{insight.body}</Text>
        </View>
        <View style={styles.impactSection}>
          <Text style={styles.impactLabel}>WHAT THIS MEANS FOR YOU</Text>
          <View style={[styles.impactPill, { backgroundColor: impactColor + '10', borderColor: impactColor + '35' }]}>
            <View style={[styles.impactDot, { backgroundColor: impactColor }]} />
            <Text style={[styles.impactTxt, { color: impactColor }]}>{insight.impact}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'pulse' | 'signal' | 'research'>('pulse');
  const [filter, setFilter]         = useState('All');
  const [insights, setInsights]     = useState<Insight[]>(INSIGHTS);
  const [savedIds, setSavedIds]     = useState<Set<string>>(new Set<string>());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [toastMsg, setToastMsg]     = useState('');
  const position      = useRef(new Animated.ValueXY()).current;
  const isAnimating   = useRef(false);

  // Fetch real market news for Pulse cards + preload Signal cache
  useEffect(() => {
    fetchMarketData().catch(() => {});
    fetchMarketNews().then(items => {
      if (items && items.length >= 3) {
        setInsights(items.map(newsToInsight));
      }
    }).catch(() => {});
  }, []);

  // Stamp animation
  const stampScale    = useRef(new Animated.Value(0)).current;
  const stampOpacity  = useRef(new Animated.Value(0)).current;
  const stampRotate   = useRef(new Animated.Value(-8)).current;

  // Toast animation
  const toastOpacity  = useRef(new Animated.Value(0)).current;
  const toastScale    = useRef(new Animated.Value(0.88)).current;
  const toastY        = useRef(new Animated.Value(12)).current;

  // Header chip pulse when saved count grows
  const chipScale     = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (savedIds.size === 0) return;
    Animated.sequence([
      Animated.timing(chipScale, { toValue: 1.2, duration: 120, useNativeDriver: true }),
      Animated.spring(chipScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
  }, [savedIds.size]);

  const getFiltered = () =>
    filter === 'All' ? insights : insights.filter(i => i.tag === filter);

  const filtered    = getFiltered();
  const remaining   = filtered.length - currentIndex;
  const currentCard = filtered[currentIndex];

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-6deg', '0deg', '6deg'],
    extrapolate: 'clamp',
  });
  const saveOpacity = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOpacity = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const flyCardOff = (dir: 'save' | 'skip') => {
    const target = dir === 'save'
      ? { x: width + 120, y: -40 }
      : { x: -width - 120, y: -40 };
    Animated.timing(position, { toValue: target, duration: 280, useNativeDriver: false }).start(() => {
      setCurrentIndex(i => i + 1);
      position.setValue({ x: 0, y: 0 });
      isAnimating.current = false;
    });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    toastOpacity.setValue(0);
    toastScale.setValue(0.88);
    toastY.setValue(12);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(toastScale,   { toValue: 1, useNativeDriver: true, tension: 260, friction: 12 }),
        Animated.timing(toastY,       { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(1100),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const triggerStamp = () => {
    stampScale.setValue(0);
    stampOpacity.setValue(1);
    stampRotate.setValue(-8);
    Animated.parallel([
      Animated.spring(stampScale,  { toValue: 1, useNativeDriver: true, tension: 220, friction: 7 }),
      Animated.timing(stampRotate, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    // Fade stamp out right before card flies
    setTimeout(() => {
      Animated.timing(stampOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }, 220);
  };

  const swipeSave = () => {
    if (isAnimating.current || !currentCard) return;
    isAnimating.current = true;
    setSavedIds(prev => new Set([...prev, currentCard.id]));
    saveInsight({
      id: currentCard.id,
      headline: currentCard.headline,
      tag: currentCard.tag,
      savedAt: new Date().toISOString(),
    }).catch(() => {});
    // Two-hit haptic — medium + success
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 80);
    triggerStamp();
    showToast(pickMsg());
    setTimeout(() => flyCardOff('save'), 280);
  };

  const swipeSkip = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    flyCardOff('skip');
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy * 0.15 }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD)       swipeSave();
      else if (g.dx < -SWIPE_THRESHOLD) swipeSkip();
      else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false, tension: 60, friction: 9 }).start();
    },
  });

  const handleFilterChange = (f: string) => {
    setFilter(f);
    setCurrentIndex(0);
    position.setValue({ x: 0, y: 0 });
  };

  const stampDeg = stampRotate.interpolate({ inputRange: [-8, 0], outputRange: ['-8deg', '0deg'] });

  const handleTabSwitch = (tab: 'pulse' | 'signal' | 'research') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.pageTitle}>{activeTab === 'pulse' ? 'Pulse' : activeTab === 'signal' ? 'Signal' : 'Research'}</Text>
            <Text style={styles.pageSub}>
              {activeTab === 'pulse' ? 'Swipe → to save · ← to skip' : activeTab === 'signal' ? "What the market's doing right now" : 'Deep research on any company'}
            </Text>
          </View>
          {activeTab === 'pulse' && savedIds.size > 0 && (
            <Animated.View style={[styles.savedChip, { transform: [{ scale: chipScale }] }]}>
              <Text style={styles.savedTxt}>◆ {savedIds.size} saved</Text>
            </Animated.View>
          )}
        </View>
        {/* Toggle on its own row — full width, no clipping */}
        <View style={styles.tabToggle}>
          {(['pulse', 'signal', 'research'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabToggleBtn, activeTab === tab && styles.tabToggleBtnActive]}
              onPress={() => handleTabSwitch(tab)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === tab }}
              accessibilityLabel={`Show ${tab} view`}
            >
              <Text style={[styles.tabToggleTxt, activeTab === tab && styles.tabToggleTxtActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === 'signal' ? (
        <MarketSignal />
      ) : activeTab === 'research' ? (
        <CompanyResearch />
      ) : (
      <>

      {/* Filter tab bar — fixed height so it never collapses into the card */}
      <View style={styles.filterSection}>
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
                style={styles.filterTab}
                onPress={() => handleFilterChange(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTxt, active && styles.filterTxtActive]}>{f}</Text>
                {active && <View style={styles.filterUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.divider} />

      {/* Card stack */}
      <View style={styles.cardArea}>
        {!currentCard ? (
          <View style={[styles.doneCard, CARD_SHADOW]}>
            <Text style={styles.doneMark}>◇</Text>
            <Text style={styles.doneTitle}>All Caught Up</Text>
            <Text style={styles.doneSub}>New pulse cards arrive daily.{'\n'}Check back tomorrow.</Text>
            <TouchableOpacity
              style={styles.replayBtn}
              onPress={() => { setCurrentIndex(0); position.setValue({ x: 0, y: 0 }); }}
              activeOpacity={0.85}
            >
              <Text style={styles.replayTxt}>REPLAY TODAY</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Swipe labels */}
            <Animated.View style={[styles.labelWrap, styles.labelLeft, { opacity: saveOpacity }]}>
              <Text style={[styles.labelTxt, { color: COLORS.gold, borderColor: COLORS.gold }]}>SAVE</Text>
            </Animated.View>
            <Animated.View style={[styles.labelWrap, styles.labelRight, { opacity: skipOpacity }]}>
              <Text style={[styles.labelTxt, { color: COLORS.textDim, borderColor: COLORS.border }]}>SKIP</Text>
            </Animated.View>

            {/* Stack shadows */}
            {remaining > 2 && (
              <View style={[styles.stackCard, { top: 24, width: CARD_W - 28, opacity: 0.22 }]} />
            )}
            {remaining > 1 && (
              <View style={[styles.stackCard, { top: 12, width: CARD_W - 14, opacity: 0.5 }]} />
            )}

            {/* Active card */}
            <Animated.View
              style={{ transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }}
              {...panResponder.panHandlers}
            >
              <NewsCard insight={currentCard} />

              {/* SAVED stamp — overlaid on the card */}
              <Animated.View
                style={[
                  styles.stamp,
                  {
                    opacity: stampOpacity,
                    transform: [{ scale: stampScale }, { rotate: stampDeg }],
                  },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.stampTxt}>◆ SAVED</Text>
              </Animated.View>
            </Animated.View>

          </>
        )}
      </View>

      {/* Progress dots — outside card, above actions */}
      {!!currentCard && (
        <View style={styles.dots}>
          {filtered.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                i < currentIndex  && styles.dotDone,
              ]}
            />
          ))}
        </View>
      )}

      {/* Action buttons */}
      {!!currentCard && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={swipeSkip}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Skip this pulse card"
          >
            <Text style={styles.skipTxt}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={swipeSave}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Save this pulse card"
          >
            <Text style={styles.saveTxt}>◆  Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reward toast */}
      <Animated.View
        style={[styles.toast, { bottom: SPACING.lg + insets.bottom + 68, opacity: toastOpacity, transform: [{ scale: toastScale }, { translateY: toastY }] }]}
        pointerEvents="none"
      >
        <Text style={styles.toastGlyph}>◆</Text>
        <Text style={styles.toastTxt}>{toastMsg}</Text>
      </Animated.View>

      </>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pageTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  pageSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 3, letterSpacing: FONTS.tracking.wide },
  savedChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '50',
  },
  savedTxt: { fontSize: FONTS.sizes.xs, color: COLORS.goldDark, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.wide },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: 3,
    alignSelf: 'flex-start',
  },
  tabToggleBtn: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  tabToggleBtnActive: { backgroundColor: COLORS.text },
  tabToggleTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, color: COLORS.textMuted, letterSpacing: 0.3 },
  tabToggleTxtActive: { color: COLORS.background },

  // Underline tab filter
  filterSection: { height: 40 },
  filterRow: { paddingHorizontal: SPACING.lg, gap: SPACING.xl, flexDirection: 'row', alignItems: 'stretch', height: 40 },
  filterTab: { alignItems: 'center', justifyContent: 'center', height: 40, position: 'relative', paddingHorizontal: 2 },
  filterTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: FONTS.weights.medium, letterSpacing: FONTS.tracking.widest },
  filterTxtActive: { color: COLORS.text, fontWeight: FONTS.weights.bold },
  filterUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: COLORS.gold, borderRadius: 1 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.lg, paddingBottom: SPACING.md },

  labelWrap: { position: 'absolute', zIndex: 10, top: '10%' },
  labelLeft: { left: SPACING.lg },
  labelRight: { right: SPACING.lg },
  labelTxt: {
    fontSize: 11, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest,
    borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 3,
  },

  stackCard: {
    position: 'absolute', height: 380,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...CARD_SHADOW,
  },

  card: {
    width: CARD_W, backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardAccent: { height: 3 },
  cardInner: { padding: SPACING.lg, gap: SPACING.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  tagDot: { width: 5, height: 5, borderRadius: 2.5 },
  tagTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  timeAgo: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  cardBody: { gap: 10 },
  headline: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, lineHeight: 24, letterSpacing: FONTS.tracking.tight },
  body: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: FONTS.sizes.sm * 1.75 },
  impactSection: { gap: 6 },
  impactLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  impactPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: RADIUS.md, borderWidth: 1 },
  impactDot: { width: 5, height: 5, borderRadius: 2.5 },
  impactTxt: { flex: 1, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, lineHeight: 16 },

  // "SAVED" stamp on card
  stamp: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    shadowColor: COLORS.goldDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  stampTxt: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.heavy,
    color: '#FFFFFF',
    letterSpacing: FONTS.tracking.widest,
  },

  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: SPACING.sm },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.textMuted },
  dotActive: { backgroundColor: COLORS.gold, width: 18, borderRadius: 2.5 },
  dotDone: { backgroundColor: COLORS.goldLight },

  doneCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.md, width: CARD_W,
  },
  doneMark: { fontFamily: FONTS.display, fontSize: 40, color: COLORS.gold },
  doneTitle: { fontFamily: FONTS.display, fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.light, color: COLORS.text, letterSpacing: FONTS.tracking.wide },
  doneSub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center', lineHeight: 20 },
  replayBtn: {
    marginTop: SPACING.xs, paddingHorizontal: SPACING.lg, paddingVertical: 10,
    borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.borderMid,
  },
  replayTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, letterSpacing: FONTS.tracking.widest },

  actions: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  skipBtn: {
    flex: 1, paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  skipTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  saveBtn: {
    flex: 2, paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, backgroundColor: COLORS.gold,
  },
  saveTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: '#FFFFFF', letterSpacing: FONTS.tracking.wide },

  // Reward toast
  toast: {
    position: 'absolute',
    bottom: 90,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '40',
    shadowColor: COLORS.goldDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  toastGlyph: { fontSize: 13, color: COLORS.gold },
  toastTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textSub, fontWeight: FONTS.weights.medium, letterSpacing: FONTS.tracking.wide },
});

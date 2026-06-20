import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types';
import { askConcierge, ConversationMessage } from '../services/concierge';
import { useRealProfile } from '../services/userProfile';
import { usePlaid } from '../context/PlaidContext';
import PlaidLinkScreen from './PlaidLinkScreen';
import UpgradeScreen from './UpgradeScreen';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const AI_CONSENT_KEY    = '@vault_ai_consent_v1';
const FREE_MSG_LIMIT    = 5;

function todayKey(): string {
  return `@vault_concierge_count_${new Date().toISOString().slice(0, 10)}`;
}

async function getDailyCount(): Promise<number> {
  const val = await AsyncStorage.getItem(todayKey());
  return parseInt(val ?? '0', 10);
}

async function incrementDailyCount(): Promise<number> {
  const next = (await getDailyCount()) + 1;
  await AsyncStorage.setItem(todayKey(), String(next));
  return next;
}

const STARTERS = [
  { q: 'Am I saving enough?', icon: '◈' },
  { q: 'How do I negotiate my salary?', icon: '◉' },
  { q: 'Debt or invest first?', icon: '◇' },
  { q: 'How close am I to Platinum?', icon: '○' },
];

interface Props { onClose?: () => void; initialPrompt?: string; }

export default function ConciergeScreen({ onClose, initialPrompt }: Props = {}) {
  const { isPremium } = useRealProfile();
  const { plaidConnected, refresh: refreshPlaid } = usePlaid();

  const [messages, setMessages]             = useState<Message[]>([]);
  const [input, setInput]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const [consentGiven, setConsentGiven]     = useState<boolean | null>(null);
  const [showConsent, setShowConsent]       = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [showPlaid, setShowPlaid]           = useState(false);
  const [showUpgrade, setShowUpgrade]       = useState(false);
  const [dailyCount, setDailyCount]         = useState(0);
  const listRef   = useRef<FlatList>(null);
  const sendScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(AI_CONSENT_KEY).then(val => setConsentGiven(val === 'true'));
    getDailyCount().then(setDailyCount);
  }, []);

  useEffect(() => {
    if (initialPrompt) setInput(initialPrompt);
  }, [initialPrompt]);

  const isAtLimit = !isPremium && dailyCount >= FREE_MSG_LIMIT;

  const handleConsent = async (accepted: boolean) => {
    setShowConsent(false);
    if (accepted) {
      await AsyncStorage.setItem(AI_CONSENT_KEY, 'true');
      setConsentGiven(true);
      if (pendingMessage) { sendMessage(pendingMessage); setPendingMessage(''); }
    } else {
      setPendingMessage('');
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Paywall check — read fresh count from storage to avoid stale state
    if (!isPremium) {
      const freshCount = await getDailyCount();
      if (freshCount >= FREE_MSG_LIMIT) {
        setDailyCount(freshCount);
        setShowUpgrade(true);
        return;
      }
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const count = await incrementDailyCount();
    setDailyCount(count);

    const aId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aId, role: 'assistant', content: '', timestamp: new Date() }]);
    const history: ConversationMessage[] = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text.trim() },
    ];
    try {
      await askConcierge(history, chunk =>
        setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: m.content + chunk } : m))
      );
    } catch {
      setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: 'Unable to connect. Try again.' } : m));
    } finally {
      setLoading(false);
    }
  };

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    if (!consentGiven) { setPendingMessage(text.trim()); setShowConsent(true); return; }
    sendMessage(text);
  }, [messages, loading, consentGiven, isPremium, dailyCount]);

  const onSend = () => {
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(sendScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => send(input));
  };

  const msgsLeft = Math.max(0, FREE_MSG_LIMIT - dailyCount);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.onlineDot} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Concierge</Text>
          <Text style={styles.headerSub}>VAULT PRIVATE ADVISORY</Text>
        </View>
        {!isPremium && (
          <TouchableOpacity style={styles.upgradeChip} onPress={() => setShowUpgrade(true)} activeOpacity={0.8}>
            <Text style={styles.upgradeChipTxt}>✦ UNLOCK</Text>
          </TouchableOpacity>
        )}
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.divider} />

      {/* Free tier message counter */}
      {!isPremium && (
        <View style={styles.limitBar}>
          <Text style={styles.limitTxt}>
            {isAtLimit
              ? 'Daily limit reached — upgrade for unlimited'
              : `${msgsLeft} free message${msgsLeft === 1 ? '' : 's'} remaining today`}
          </Text>
          {isAtLimit && (
            <TouchableOpacity onPress={() => setShowUpgrade(true)} activeOpacity={0.8}>
              <Text style={styles.limitCta}>Upgrade →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>◈</Text>
            <Text style={styles.emptyTitle}>Private Advisory</Text>
            <Text style={styles.emptySub}>Your personal wealth advisor.{'\n'}Ask me anything about your money.</Text>

            {!plaidConnected && (
              <TouchableOpacity
                style={[styles.plaidBanner, CARD_SHADOW, { shadowOpacity: 0.08 }]}
                onPress={() => setShowPlaid(true)}
                activeOpacity={0.82}
              >
                <View style={styles.plaidBannerLeft}>
                  <Text style={styles.plaidBannerIcon}>🏦</Text>
                  <View style={styles.plaidBannerText}>
                    <Text style={styles.plaidBannerTitle}>Connect your bank</Text>
                    <Text style={styles.plaidBannerSub}>Get advice based on your actual accounts</Text>
                  </View>
                </View>
                <Text style={styles.plaidBannerArrow}>→</Text>
              </TouchableOpacity>
            )}

            <View style={styles.starters}>
              {STARTERS.map(({ q, icon }) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.starter, CARD_SHADOW, { shadowOpacity: 0.07, shadowRadius: 12 },
                    isAtLimit && styles.starterDisabled]}
                  onPress={() => isAtLimit ? setShowUpgrade(true) : send(q)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.starterIcon}>{icon}</Text>
                  <Text style={[styles.starterTxt, isAtLimit && styles.starterTxtDim]}>{q}</Text>
                  <Text style={styles.starterArrow}>{isAtLimit ? '🔒' : '→'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.asstBubble]}>
                {item.role === 'assistant' && item.content === '' ? (
                  <View style={styles.typingDots}>
                    {[0, 1, 2].map(i => <TypingDot key={i} delay={i * 160} />)}
                  </View>
                ) : (
                  <Text style={[styles.bubbleTxt, item.role === 'user' ? styles.userTxt : styles.asstTxt]}>
                    {item.content}
                  </Text>
                )}
              </View>
            )}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, isAtLimit && styles.inputDisabled]}
            value={input}
            onChangeText={setInput}
            placeholder={isAtLimit ? 'Upgrade for unlimited messages…' : 'Ask your concierge...'}
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
            editable={!isAtLimit}
            onFocus={() => { if (isAtLimit) setShowUpgrade(true); }}
          />
          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: input.trim() && !loading && !isAtLimit ? COLORS.gold : COLORS.border }]}
              onPress={isAtLimit ? () => setShowUpgrade(true) : onSend}
              disabled={(!input.trim() || loading) && !isAtLimit}
              activeOpacity={0.8}
            >
              <Text style={[styles.sendIcon, { color: input.trim() && !loading && !isAtLimit ? '#fff' : COLORS.textMuted }]}>
                {isAtLimit ? '🔒' : '↑'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      <PlaidLinkScreen
        visible={showPlaid}
        onClose={() => setShowPlaid(false)}
        onSuccess={() => {
          setShowPlaid(false);
          refreshPlaid();
        }}
      />

      <UpgradeScreen
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onSuccess={() => setShowUpgrade(false)}
      />

      <Modal visible={showConsent} transparent animationType="fade">
        <View style={styles.consentOverlay}>
          <View style={styles.consentCard}>
            <Text style={styles.consentGlyph}>◈</Text>
            <Text style={styles.consentTitle}>AI Advisory</Text>
            <Text style={styles.consentBody}>
              Your messages and financial context will be processed by{' '}
              <Text style={styles.consentBrand}>Anthropic's Claude AI</Text>
              {' '}to generate personalized responses.{'\n\n'}
              Anthropic does not retain your financial data beyond the API call. VAULT never shares your banking credentials.
            </Text>
            <Text style={styles.consentNote}>
              Responses are for informational purposes only — not financial advice.
            </Text>
            <TouchableOpacity style={styles.consentAgree} onPress={() => handleConsent(true)} activeOpacity={0.85}>
              <Text style={styles.consentAgreeTxt}>Agree & Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.consentDecline} onPress={() => handleConsent(false)} activeOpacity={0.7}>
              <Text style={styles.consentDeclineTxt}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TypingDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  return <Animated.View style={[tStyles.dot, { opacity }]} />;
}

const tStyles = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  headerText: { flex: 1 },
  onlineDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold, shadowOpacity: 0.8, shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  headerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },
  upgradeChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '60',
  },
  upgradeChipTxt: { fontSize: 9, fontWeight: FONTS.weights.bold, color: COLORS.gold, letterSpacing: 1.2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  closeTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim },

  limitBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  limitTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
  limitCta: { fontSize: FONTS.sizes.xs, color: COLORS.gold, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.wide },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.lg },
  emptyGlyph: { fontFamily: FONTS.display, fontSize: 44, color: COLORS.gold },
  emptyTitle: { fontFamily: FONTS.display, fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.light, color: COLORS.text, letterSpacing: FONTS.tracking.wide },
  emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center', lineHeight: 22 },
  plaidBanner: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.gold + '50',
    padding: SPACING.md,
  },
  plaidBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  plaidBannerIcon: { fontSize: 22 },
  plaidBannerText: { flex: 1 },
  plaidBannerTitle: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  plaidBannerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textDim, marginTop: 2 },
  plaidBannerArrow: { fontSize: FONTS.sizes.md, color: COLORS.gold, fontWeight: FONTS.weights.bold },

  starters: { width: '100%', gap: SPACING.sm },
  starter: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  starterDisabled: { opacity: 0.5 },
  starterIcon: { fontFamily: FONTS.display, fontSize: 16, color: COLORS.gold, width: 20 },
  starterTxt: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.text },
  starterTxtDim: { color: COLORS.textMuted },
  starterArrow: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },

  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.lg },
  bubble: { maxWidth: '84%', paddingHorizontal: SPACING.md, paddingVertical: 12, borderRadius: RADIUS.lg },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.text, borderBottomRightRadius: 4 },
  asstBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
    minWidth: 72, minHeight: 44,
    justifyContent: 'center',
    ...CARD_SHADOW, shadowOpacity: 0.06, shadowRadius: 10,
  },
  bubbleTxt: { fontSize: FONTS.sizes.md, lineHeight: 22 },
  userTxt: { color: COLORS.background },
  asstTxt: { color: COLORS.text },
  typingDots: { flexDirection: 'row', gap: 5, padding: 4, alignItems: 'center' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
    padding: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.borderMid,
    padding: SPACING.md, color: COLORS.text, fontSize: FONTS.sizes.md, maxHeight: 120, lineHeight: 22,
  },
  inputDisabled: { opacity: 0.5 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { fontSize: 18, fontWeight: FONTS.weights.bold },

  consentOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.xl,
  },
  consentCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.md, width: '100%',
  },
  consentGlyph: { fontFamily: FONTS.display, fontSize: 36, color: COLORS.gold },
  consentTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.semibold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  consentBody: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center', lineHeight: 22 },
  consentBrand: { color: COLORS.text, fontWeight: FONTS.weights.semibold },
  consentNote: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  consentAgree: {
    backgroundColor: COLORS.gold, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    width: '100%', alignItems: 'center', marginTop: SPACING.sm,
  },
  consentAgreeTxt: { color: '#fff', fontWeight: FONTS.weights.semibold, fontSize: FONTS.sizes.md, letterSpacing: FONTS.tracking.wide },
  consentDecline: { paddingVertical: SPACING.sm },
  consentDeclineTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
});

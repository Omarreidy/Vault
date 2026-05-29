import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Message } from '../types';
import { askConcierge, ConversationMessage } from '../services/concierge';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

const STARTERS = [
  { q: 'Am I saving enough?', icon: '◈' },
  { q: 'How do I negotiate my salary?', icon: '◉' },
  { q: 'Debt or invest first?', icon: '◇' },
  { q: 'How close am I to Platinum?', icon: '○' },
];

export default function ConciergeScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const sendScale = useRef(new Animated.Value(1)).current;

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

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
  }, [messages, loading]);

  const onSend = () => {
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(sendScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => send(input));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.onlineDot} />
        <View>
          <Text style={styles.headerTitle}>Concierge</Text>
          <Text style={styles.headerSub}>VAULT PRIVATE ADVISORY</Text>
        </View>
      </View>
      <View style={styles.divider} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>◈</Text>
            <Text style={styles.emptyTitle}>Private Advisory</Text>
            <Text style={styles.emptySub}>I know your accounts, your score,{'\n'}and your momentum. Ask me anything.</Text>
            <View style={styles.starters}>
              {STARTERS.map(({ q, icon }) => (
                <TouchableOpacity key={q} style={[styles.starter, CARD_SHADOW, { shadowOpacity: 0.07, shadowRadius: 12 }]} onPress={() => send(q)} activeOpacity={0.75}>
                  <Text style={styles.starterIcon}>{icon}</Text>
                  <Text style={styles.starterTxt}>{q}</Text>
                  <Text style={styles.starterArrow}>→</Text>
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
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your concierge..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
          />
          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? COLORS.gold : COLORS.border }]}
              onPress={onSend}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              <Text style={[styles.sendIcon, { color: input.trim() && !loading ? '#fff' : COLORS.textMuted }]}>↑</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
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
  onlineDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green, shadowOpacity: 1, shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold, color: COLORS.text, letterSpacing: FONTS.tracking.tight },
  headerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.widest },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.lg },
  emptyGlyph: { fontFamily: FONTS.display, fontSize: 44, color: COLORS.gold },
  emptyTitle: { fontFamily: FONTS.display, fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.light, color: COLORS.text, letterSpacing: FONTS.tracking.wide },
  emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, textAlign: 'center', lineHeight: 22 },
  starters: { width: '100%', gap: SPACING.sm },
  starter: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  starterIcon: { fontFamily: FONTS.display, fontSize: 16, color: COLORS.gold, width: 20 },
  starterTxt: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.text },
  starterArrow: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },

  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.lg },
  bubble: { maxWidth: '84%', paddingHorizontal: SPACING.md, paddingVertical: 12, borderRadius: RADIUS.lg },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.text,
    borderBottomRightRadius: 4,
  },
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
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { fontSize: 18, fontWeight: FONTS.weights.bold },
});

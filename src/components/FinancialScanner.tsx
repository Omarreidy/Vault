import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Modal, ScrollView, Platform, Image, Dimensions, Alert, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';
import {
  scanDocument, ScanError, ScanFailureReason, SCAN_ERROR_COPY,
  ScanResult, ScanVerdict, VERDICT_COLORS, VERDICT_ICONS,
} from '../services/financialScanner';

const { width, height } = Dimensions.get('window');

type Stage = 'idle' | 'scanning' | 'result';

// ─── Scanning animation ───────────────────────────────────────────────────────

function ScanningOverlay({ imageUri }: { imageUri: string }) {
  const scanLine = useRef(new Animated.Value(0)).current;
  const pulse    = useRef(new Animated.Value(0.85)).current;
  const dots     = useRef(new Animated.Value(0)).current;
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    // Scan line sweeps top to bottom repeatedly
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(scanLine, { toValue: 0, duration: 0,    useNativeDriver: false }),
      ])
    ).start();

    // Pulse ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.95, duration: 700, useNativeDriver: false }),
      ])
    ).start();

    // Dot counter for "Analyzing..."
    const interval = setInterval(() => {
      setDotCount(d => d === 3 ? 1 : d + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const lineTop = scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, 280] });

  return (
    <View style={scanStyles.wrap}>
      <Animated.View style={[scanStyles.imageWrap, { transform: [{ scale: pulse }] }]}>
        <Image source={{ uri: imageUri }} style={scanStyles.image} resizeMode="cover" />
        {/* Gold border overlay */}
        <View style={scanStyles.border} />
        {/* Corner accents */}
        <View style={[scanStyles.corner, scanStyles.cornerTL]} />
        <View style={[scanStyles.corner, scanStyles.cornerTR]} />
        <View style={[scanStyles.corner, scanStyles.cornerBL]} />
        <View style={[scanStyles.corner, scanStyles.cornerBR]} />
        {/* Scan line */}
        <Animated.View style={[scanStyles.scanLine, { top: lineTop }]} />
      </Animated.View>
      <Text style={scanStyles.label}>
        Analyzing{'.'.repeat(dotCount)}
      </Text>
      <Text style={scanStyles.sub}>Reading financial signals</Text>
    </View>
  );
}

const scanStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: SPACING.lg },
  imageWrap: { width: 260, height: 260, borderRadius: RADIUS.xl, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%' },
  border: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: COLORS.gold + '80',
    borderRadius: RADIUS.xl,
  },
  scanLine: {
    position: 'absolute',
    left: 0, right: 0,
    height: 2,
    backgroundColor: COLORS.gold,
    opacity: 0.8,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  corner: {
    position: 'absolute',
    width: 20, height: 20,
    borderColor: COLORS.gold,
  },
  cornerTL: { top: 8, left: 8, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 4 },
  cornerTR: { top: 8, right: 8, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 4 },
  cornerBL: { bottom: 8, left: 8, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 8, right: 8, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 4 },
  label: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: 0.3,
    width: 140,
  },
  sub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: FONTS.tracking.wide },
});

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({
  result,
  imageUri,
  onScanAgain,
  onClose,
}: {
  result: ScanResult;
  imageUri: string;
  onScanAgain: () => void;
  onClose: () => void;
}) {
  const slideY  = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.5)).current;
  const xpScale    = useRef(new Animated.Value(0)).current;

  const verdictColor = VERDICT_COLORS[result.verdict];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 340, useNativeDriver: false }),
      Animated.timing(slideY,  { toValue: 0, duration: 340, useNativeDriver: false }),
    ]).start();

    setTimeout(() => {
      Animated.spring(badgeScale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: false }).start();
    }, 200);

    setTimeout(() => {
      Animated.spring(xpScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: false }).start();
    }, 500);
  }, []);

  return (
    <Animated.View style={[resStyles.wrap, { opacity, transform: [{ translateY: slideY }] }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={resStyles.scroll}>

        {/* Verdict header */}
        <Animated.View style={[
          resStyles.verdictCard,
          { backgroundColor: verdictColor + '15', borderColor: verdictColor + '40' },
          { transform: [{ scale: badgeScale }] },
        ]}>
          <View style={[resStyles.verdictBadge, { backgroundColor: verdictColor }]}>
            <Text style={resStyles.verdictIcon}>{VERDICT_ICONS[result.verdict]}</Text>
            <Text style={resStyles.verdictTxt}>{result.verdict}</Text>
          </View>
          <Text style={resStyles.itemEmoji}>{result.emoji}</Text>
          <View style={resStyles.itemInfo}>
            <Text style={resStyles.itemName}>{result.itemName}</Text>
            <Text style={resStyles.tagline}>{result.tagline}</Text>
          </View>
        </Animated.View>

        {/* Thumbnail */}
        <View style={resStyles.thumbWrap}>
          <Image source={{ uri: imageUri }} style={resStyles.thumb} resizeMode="cover" />
          <View style={[resStyles.thumbBorder, { borderColor: verdictColor + '60' }]} />
        </View>

        {/* Stats */}
        <View style={[resStyles.statsCard, CARD_SHADOW, { shadowOpacity: 0.06 }]}>
          {result.monthlyCost && (
            <View style={resStyles.statRow}>
              <Text style={resStyles.statLabel}>MONTHLY COST</Text>
              <Text style={[resStyles.statVal, { color: verdictColor }]}>{result.monthlyCost}</Text>
            </View>
          )}
          <View style={[resStyles.statRow, result.monthlyCost && resStyles.statRowBorder]}>
            <Text style={resStyles.statLabel}>ANNUAL IMPACT</Text>
            <Text style={[resStyles.statVal, { color: verdictColor }]}>{result.annualImpact}</Text>
          </View>
          <View style={[resStyles.statRow, resStyles.statRowBorder]}>
            <Text style={resStyles.statLabel}>WEALTH SCORE</Text>
            <Text style={[resStyles.statVal, { color: verdictColor }]}>{result.wealthScoreImpact}</Text>
          </View>
        </View>

        {/* Insight */}
        <View style={[resStyles.insightCard, CARD_SHADOW, { shadowOpacity: 0.06 }]}>
          <Text style={resStyles.insightEye}>VAULT SAYS</Text>
          <Text style={resStyles.insightTxt}>{result.insight}</Text>
        </View>

        {/* Tip */}
        <View style={[resStyles.tipCard, { borderColor: verdictColor + '35', backgroundColor: verdictColor + '0A' }]}>
          <Text style={[resStyles.tipEye, { color: verdictColor }]}>◆ WEALTH TIP</Text>
          <Text style={[resStyles.tipTxt, { color: verdictColor === VERDICT_COLORS.ASSET ? '#5a9e8a' : COLORS.textDim }]}>
            {result.tip}
          </Text>
        </View>

        {/* XP badge */}
        <Animated.View style={[resStyles.xpBadge, { transform: [{ scale: xpScale }] }]}>
          <Text style={resStyles.xpTxt}>+{result.xp} XP  ·  Scan complete</Text>
        </Animated.View>

        {/* Actions */}
        <View style={resStyles.actions}>
          <TouchableOpacity style={resStyles.scanAgainBtn} onPress={onScanAgain} activeOpacity={0.85}>
            <Text style={resStyles.scanAgainTxt}>Scan Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={resStyles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={resStyles.closeTxt}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </Animated.View>
  );
}

const resStyles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { padding: SPACING.lg, gap: SPACING.md },

  verdictCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  verdictIcon: { fontSize: 11, color: '#FFF' },
  verdictTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.heavy, color: '#FFF', letterSpacing: 1.2 },
  itemEmoji: { fontSize: 32 },
  itemInfo: { flex: 1, gap: 3 },
  itemName: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: -0.3 },
  tagline: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 18 },

  thumbWrap: { alignSelf: 'center', borderRadius: RADIUS.lg, overflow: 'hidden', position: 'relative' },
  thumb: { width: 180, height: 140, borderRadius: RADIUS.lg },
  thumbBorder: { ...StyleSheet.absoluteFill, borderWidth: 1.5, borderRadius: RADIUS.lg },

  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md },
  statRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  statVal: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, textAlign: 'right', flex: 1, marginLeft: SPACING.md },

  insightCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  insightEye: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  insightTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, lineHeight: 20 },

  tipCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  tipEye: { fontSize: 9, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  tipTxt: { fontSize: FONTS.sizes.sm, lineHeight: 20 },

  xpBadge: {
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '50',
  },
  xpTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.goldDark, letterSpacing: 0.5 },

  actions: { flexDirection: 'row', gap: SPACING.sm },
  scanAgainBtn: {
    flex: 1, paddingVertical: 15, borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    alignItems: 'center',
  },
  scanAgainTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, fontWeight: FONTS.weights.semibold },
  closeBtn: {
    flex: 2, paddingVertical: 15, borderRadius: RADIUS.md,
    backgroundColor: COLORS.text, alignItems: 'center',
  },
  closeTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.background, letterSpacing: 0.3 },
});

// ─── Idle / camera prompt ─────────────────────────────────────────────────────

function IdleScreen({ onPickImage, onOpenCamera }: { onPickImage: () => void; onOpenCamera: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  return (
    <View style={idleStyles.wrap}>
      <View style={idleStyles.top}>
        <Text style={idleStyles.eyebrow}>VAULT SCAN</Text>
        <Text style={idleStyles.title}>Is it an asset{'\n'}or a liability?</Text>
        <Text style={idleStyles.sub}>
          Point your camera at anything — food, a gadget, your car, a bill — and VAULT will give you an instant financial verdict.
        </Text>
      </View>

      <Animated.View style={[idleStyles.cameraBtn, { transform: [{ scale: pulse }] }]}>
        <TouchableOpacity
          style={idleStyles.cameraBtnInner}
          onPress={onOpenCamera}
          activeOpacity={0.85}
        >
          <Text style={idleStyles.cameraIcon}>📷</Text>
          <Text style={idleStyles.cameraTxt}>Take Photo</Text>
        </TouchableOpacity>
      </Animated.View>
      <TouchableOpacity onPress={onPickImage} activeOpacity={0.7} style={{ alignSelf: 'center' }}>
        <Text style={idleStyles.libraryTxt}>or choose from library</Text>
      </TouchableOpacity>

      <View style={idleStyles.examples}>
        <Text style={idleStyles.examplesLabel}>SCAN ANYTHING</Text>
        <View style={idleStyles.exampleRow}>
          {['🍽️ Food', '🚗 Car', '📱 Phone', '👟 Clothing', '📈 Stocks', '🏡 Home'].map(item => (
            <View key={item} style={idleStyles.exampleChip}>
              <Text style={idleStyles.exampleTxt}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const idleStyles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl },
  top: { gap: SPACING.md, alignItems: 'center' },
  eyebrow: { fontSize: 9, color: COLORS.gold, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest },
  title: {
    fontFamily: FONTS.display,
    fontSize: 42,
    fontWeight: FONTS.weights.light,
    color: COLORS.text,
    letterSpacing: -1,
    textAlign: 'center',
    lineHeight: 50,
  },
  sub: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  cameraBtn: { alignSelf: 'center' },
  cameraBtnInner: {
    width: 160, height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.text,
    alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.gold + '50',
    shadowColor: COLORS.goldDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  cameraIcon: { fontSize: 36, color: COLORS.gold },
  cameraTxt: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.background, letterSpacing: 0.5 },
  examples: { gap: SPACING.md },
  examplesLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONTS.weights.bold, letterSpacing: FONTS.tracking.widest, textAlign: 'center' },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'center' },
  exampleChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  exampleTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textDim },
  libraryTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: 0.3, textDecorationLine: 'underline' },
});

// ─── Scan failure card ────────────────────────────────────────────────────────
// One card per distinct failure reason (offline / auth / rate-limited / image
// too large / image unreadable / analysis down) so the user always knows
// whether the problem is their connection, their session, their photo, or us.

function ScanErrorCard({
  reason,
  onRetry,
  onReset,
  onClose,
}: {
  reason: ScanFailureReason;
  onRetry?: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const copy = SCAN_ERROR_COPY[reason];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, []);

  return (
    <View style={scanErrorStyles.wrap}>
      <Text style={scanErrorStyles.glyph}>◉</Text>
      <Text style={scanErrorStyles.title}>{copy.title}</Text>
      <Text style={scanErrorStyles.body}>{copy.body}</Text>
      {reason === 'auth' ? (
        <TouchableOpacity style={scanErrorStyles.primaryBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={scanErrorStyles.primaryBtnTxt}>Done</Text>
        </TouchableOpacity>
      ) : (
        <>
          {onRetry && (
            <TouchableOpacity style={scanErrorStyles.primaryBtn} onPress={onRetry} activeOpacity={0.8}>
              <Text style={scanErrorStyles.primaryBtnTxt}>Try Again</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={scanErrorStyles.btn} onPress={onReset} activeOpacity={0.8}>
            <Text style={scanErrorStyles.btnTxt}>{onRetry ? 'Scan something else' : 'Retake photo'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── Root modal ───────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function FinancialScanner({ visible, onClose }: Props) {
  const [stage, setStage]         = useState<Stage>('idle');
  const [imageUri, setImageUri]   = useState<string | null>(null);
  const [result, setResult]       = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<ScanFailureReason | null>(null);

  const reset = () => {
    setStage('idle');
    setImageUri(null);
    setResult(null);
    setScanError(null);
  };

  const processImage = async (uri: string) => {
    setImageUri(uri);
    setResult(null);
    setScanError(null);
    setStage('scanning');
    try {
      const liveResult = await scanDocument(uri);
      setResult(liveResult);
    } catch (err) {
      setScanError(err instanceof ScanError ? err.reason : 'unavailable');
    }
    setStage('result');
  };

  const handleOpenCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera access needed',
          'To scan an item, allow camera access for VAULT in Settings. You can also choose a photo from your library instead.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
          ],
        );
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!res.canceled && res.assets[0]) await processImage(res.assets[0].uri);
    } catch {}
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) await processImage(res.assets[0].uri);
    } catch {}
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={rootStyles.container}>
        {/* Header */}
        <View style={rootStyles.header}>
          <View style={rootStyles.headerLeft}>
            <Text style={rootStyles.headerTitle}>
              {stage === 'idle' ? 'Scan' : stage === 'scanning' ? 'Analyzing...' : scanError ? 'Scan' : 'Verdict'}
            </Text>
            {stage === 'result' && result && (
              <View style={[rootStyles.verdictMini, { backgroundColor: VERDICT_COLORS[result.verdict] + '20', borderColor: VERDICT_COLORS[result.verdict] + '50' }]}>
                <Text style={[rootStyles.verdictMiniTxt, { color: VERDICT_COLORS[result.verdict] }]}>
                  {result.verdict}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={handleClose} style={rootStyles.closeBtn} activeOpacity={0.7}>
            <Text style={rootStyles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={rootStyles.content}>
          {stage === 'idle' && (
            <IdleScreen onPickImage={handlePickImage} onOpenCamera={handleOpenCamera} />
          )}
          {stage === 'scanning' && imageUri && (
            <View style={rootStyles.scanningWrap}>
              <ScanningOverlay imageUri={imageUri} />
            </View>
          )}
          {stage === 'result' && result && imageUri && !scanError && (
            <ResultCard
              result={result}
              imageUri={imageUri}
              onScanAgain={() => { setStage('idle'); setImageUri(null); setResult(null); setScanError(null); }}
              onClose={handleClose}
            />
          )}
          {stage === 'result' && scanError && (
            <ScanErrorCard
              reason={scanError}
              onRetry={
                SCAN_ERROR_COPY[scanError].canRetrySameImage && imageUri
                  ? () => processImage(imageUri)
                  : undefined
              }
              onReset={() => { setStage('idle'); setImageUri(null); setScanError(null); }}
              onClose={handleClose}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const rootStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text, letterSpacing: -0.5 },
  verdictMini: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  verdictMiniTxt: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  closeTxt: { fontSize: FONTS.sizes.sm, color: COLORS.textDim, fontWeight: FONTS.weights.bold },
  content: { flex: 1 },
  scanningWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

const scanErrorStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  glyph: {
    fontSize: 36,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  body: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.full,
  },
  primaryBtnTxt: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.background,
    letterSpacing: 0.3,
  },
  btn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  btnTxt: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: 0.3,
  },
});

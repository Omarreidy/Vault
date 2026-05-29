import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WealthWin } from '../types';
import { FONTS, RADIUS } from '../constants/theme';

const { width } = Dimensions.get('window');
export const WIN_CARD_WIDTH  = Math.min(width - 48, 380);
export const WIN_CARD_HEIGHT = Math.round(WIN_CARD_WIDTH * 1.2);

const WIN_GRADIENTS: Record<string, [string, string, string]> = {
  savings:    ['#0A1A0F', '#0D2818', '#071210'],
  tier:       ['#1A1400', '#2A2000', '#100E00'],
  debt:       ['#0A0A1A', '#12122A', '#06060F'],
  investment: ['#0F0A00', '#1E1400', '#080500'],
  default:    ['#0A0A10', '#141420', '#050508'],
};

const WIN_ACCENTS: Record<string, string> = {
  savings:    '#00C896',
  tier:       '#C9A96E',
  debt:       '#A8A8BC',
  investment: '#C9A96E',
  default:    '#C9A96E',
};

interface Props {
  win: WealthWin;
  userName?: string;
  tier?: string;
}

export default function WealthWinCard({ win, userName = 'Alex', tier = 'Gold' }: Props) {
  const gradient = WIN_GRADIENTS[win.category] ?? WIN_GRADIENTS.default;
  const accent   = WIN_ACCENTS[win.category]   ?? WIN_ACCENTS.default;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <View style={[styles.card, { width: WIN_CARD_WIDTH, height: WIN_CARD_HEIGHT }]}>
      <LinearGradient colors={gradient} style={styles.gradient}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>VAULT</Text>
          <View style={[styles.tierPill, { borderColor: accent + '50' }]}>
            <View style={[styles.tierDot, { backgroundColor: accent }]} />
            <Text style={[styles.tierTxt, { color: accent }]}>{tier.toUpperCase()}</Text>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.main}>
          <Text style={[styles.winLabel, { color: accent + 'AA' }]}>WEALTH WIN</Text>
          <Text style={styles.winTitle}>{win.title}</Text>
          <Text style={styles.winSub}>{win.subtitle}</Text>

          {/* The hero value */}
          <View style={styles.valueWrap}>
            <LinearGradient
              colors={[accent + '00', accent + '18', accent + '00']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.valueGlow}
            />
            <Text style={[styles.value, { fontFamily: FONTS.display, color: accent }]}>
              {win.value}
            </Text>
          </View>
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <Text style={styles.userName}>{userName.toUpperCase()}</Text>
          <Text style={styles.dateStr}>{dateStr}</Text>
        </View>

        {/* Corner accent lines */}
        <View style={[styles.cornerTL, { borderColor: accent + '30' }]} />
        <View style={[styles.cornerBR, { borderColor: accent + '30' }]} />

        {/* Subtle horizontal rule */}
        <LinearGradient
          colors={[accent + '00', accent + '40', accent + '00']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.midLine}
        />

      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  gradient: {
    flex: 1,
    padding: 28,
    justifyContent: 'space-between',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: FONTS.tracking.widest * 2,
    fontWeight: FONTS.weights.semibold,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tierDot: { width: 5, height: 5, borderRadius: 2.5 },
  tierTxt: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: FONTS.tracking.widest,
  },

  main: { gap: 10 },
  winLabel: {
    fontSize: FONTS.sizes.xs,
    letterSpacing: FONTS.tracking.widest,
    fontWeight: FONTS.weights.semibold,
    marginBottom: 4,
  },
  winTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 28,
    letterSpacing: FONTS.tracking.tight,
  },
  winSub: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: FONTS.tracking.wide,
  },

  valueWrap: {
    marginTop: 12,
    position: 'relative',
  },
  valueGlow: {
    position: 'absolute',
    top: -10, left: -28, right: -28,
    height: 80,
  },
  value: {
    fontSize: 64,
    fontWeight: FONTS.weights.light,
    lineHeight: 70,
    letterSpacing: -2,
  },

  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: FONTS.tracking.widest * 1.5,
  },
  dateStr: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: FONTS.tracking.widest,
  },

  // Corner accent details
  cornerTL: {
    position: 'absolute',
    top: 20, left: 20,
    width: 20, height: 20,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderRadius: 2,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 20, right: 20,
    width: 20, height: 20,
    borderBottomWidth: 1, borderRightWidth: 1,
    borderRadius: 2,
  },
  midLine: {
    position: 'absolute',
    left: 28, right: 28,
    height: StyleSheet.hairlineWidth,
    top: '60%',
  },
});

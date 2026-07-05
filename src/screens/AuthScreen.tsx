import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';
import { COLORS, FONTS, SPACING, RADIUS, CARD_SHADOW } from '../constants/theme';

type Mode = 'signin' | 'signup';

interface Props { onAuth: () => void; }

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) {
          // Account already exists — sign them in with the same credentials
          // instead of surfacing a dead-end error.
          if (/already registered|already exists/i.test(err.message ?? '')) {
            const { error: signInErr } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });
            if (signInErr) {
              setMode('signin');
              setError('This email already has an account. Check your password and sign in.');
              return;
            }
          } else {
            throw err;
          }
        } else if (!data.session) {
          setAwaitingConfirm(true);
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onAuth();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Text style={styles.logoMark}>VAULT</Text>
            <Text style={styles.logoSub}>Build wealth. Track momentum.</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, CARD_SHADOW]}>

            {/* Mode toggle */}
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'signup' && styles.toggleBtnActive]}
                onPress={() => { setMode('signup'); setError(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleTxt, mode === 'signup' && styles.toggleTxtActive]}>
                  Create account
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'signin' && styles.toggleBtnActive]}
                onPress={() => { setMode('signin'); setError(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleTxt, mode === 'signin' && styles.toggleTxtActive]}>
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={styles.inputs}>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </View>

            {/* Email confirmation pending */}
            {awaitingConfirm && (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTitle}>Check your email</Text>
                <Text style={styles.confirmSub}>
                  We sent a confirmation link to {email.trim()}. Click it to activate your account, then sign in here.
                </Text>
                <TouchableOpacity onPress={() => { setAwaitingConfirm(false); setMode('signin'); }} activeOpacity={0.8}>
                  <Text style={styles.confirmLink}>Go to sign in →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error */}
            {!!error && <Text style={styles.error}>{error}</Text>}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnOff]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnTxt}>
                {loading ? 'Please wait…' : mode === 'signup' ? 'Get started →' : 'Sign in →'}
              </Text>
            </TouchableOpacity>

            {mode === 'signup' && (
              <Text style={styles.legal}>
                By continuing you agree to our Terms of Service and Privacy Policy.
              </Text>
            )}
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08080C' },
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xl,
  },

  logoWrap: { alignItems: 'center', gap: SPACING.sm },
  logoMark: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gold,
    letterSpacing: FONTS.tracking.widest * 2,
    fontWeight: FONTS.weights.semibold,
  },
  logoSub: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: FONTS.weights.light,
    color: '#F2EFE9',
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },

  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: COLORS.text },
  toggleTxt: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textDim,
    fontWeight: FONTS.weights.medium,
  },
  toggleTxtActive: { color: COLORS.background, fontWeight: FONTS.weights.bold },

  inputs: { gap: SPACING.sm },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },

  error: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
    textAlign: 'center',
    letterSpacing: FONTS.tracking.wide,
  },

  btn: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  btnOff: { opacity: 0.6 },
  btnTxt: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: '#08080C',
    letterSpacing: FONTS.tracking.wide,
  },

  legal: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: FONTS.tracking.normal,
  },

  confirmBox: {
    backgroundColor: COLORS.goldGlow,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  confirmTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  confirmSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textDim,
    lineHeight: 18,
  },
  confirmLink: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gold,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: FONTS.tracking.wide,
  },
});

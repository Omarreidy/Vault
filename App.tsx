import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/AuthScreen';
import { supabase } from './src/services/supabase';
import { registerForPushNotifications } from './src/services/notifications';

type AppState = 'loading' | 'auth' | 'onboarding' | 'main';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Check current session on launch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setAppState('auth');
      } else {
        checkOnboarding(session);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setAppState('auth');
      } else {
        checkOnboarding(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboarding = async (session: Session) => {
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', session.user.id)
      .single();

    if (data?.onboarding_complete) {
      setAppState('main');
      registerForPushNotifications().catch(() => {});
    } else {
      setAppState('onboarding');
    }
  };

  const handleOnboardingComplete = async () => {
    if (session) {
      await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', session.user.id);
    }
    setAppState('main');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAppState('auth');
  };

  if (appState === 'loading') return <View style={styles.root} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style={appState === 'auth' || appState === 'onboarding' ? 'light' : 'dark'} />
      {appState === 'auth' && (
        <AuthScreen onAuth={() => setAppState('onboarding')} />
      )}
      {appState === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      {appState === 'main' && (
        <AppNavigator onResetOnboarding={handleSignOut} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

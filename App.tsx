import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/AuthScreen';
import { supabase } from './src/services/supabase';
import { PlaidProvider } from './src/context/PlaidContext';
import { initPushNotifications } from './src/services/push';

const RC_API_KEY = 'appl_iHfaWTgWajGmNhQValXNlUdqwxI';

if (Platform.OS !== 'web') {
  // This runs at module load, before React (and the ErrorBoundary) mount. Any
  // throw here is an uncatchable launch crash, so guard it defensively.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    Purchases.configure({ apiKey: RC_API_KEY });
  } catch (e) {
    console.warn('RevenueCat init failed:', e);
  }
}

// Error boundary to catch white screens and show the actual error
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null };
  componentDidCatch(e: Error) {
    this.setState({ error: e.message + '\n' + e.stack?.slice(0, 400) });
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#08080C', padding: 24, justifyContent: 'center' }}>
          <Text style={{ color: '#C9A96E', fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>
            VAULT — Error
          </Text>
          <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'monospace' }}>
            {this.state.error}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

type AppState = 'loading' | 'auth' | 'onboarding' | 'main';

function AppContent() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setAppState('auth');
      } else {
        checkOnboarding(session);
      }
    });

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

  // Register push token + daily reminder once the user reaches the main app.
  useEffect(() => {
    if (appState === 'main') initPushNotifications();
  }, [appState]);

  const checkOnboarding = async (session: Session) => {
    if (Platform.OS !== 'web') {
      try {
        const Purchases = require('react-native-purchases').default;
        await Purchases.logIn(session.user.id);
      } catch {}
    }

    const { data } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', session.user.id)
      .single();

    if (data?.onboarding_complete) {
      setAppState('main');
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
    if (Platform.OS !== 'web') {
      try {
        const Purchases = require('react-native-purchases').default;
        await Purchases.logOut();
      } catch {}
    }
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
        <PlaidProvider>
          <AppNavigator onResetOnboarding={handleSignOut} />
        </PlaidProvider>
      )}
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

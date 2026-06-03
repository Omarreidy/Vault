import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { hasCompletedOnboarding } from './src/services/onboarding';

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    hasCompletedOnboarding().then(setOnboarded);
  }, []);

  // Still checking AsyncStorage
  if (onboarded === null) return <View style={styles.root} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style={onboarded ? 'dark' : 'light'} />
      {onboarded ? (
        <AppNavigator onResetOnboarding={() => setOnboarded(false)} />
      ) : (
        <OnboardingScreen onComplete={() => setOnboarded(true)} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

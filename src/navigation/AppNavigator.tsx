import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, View } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ScoreScreen from '../screens/ScoreScreen';
import InsightsScreen from '../screens/InsightsScreen';
import TrajectoryScreen from '../screens/TrajectoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS, FONTS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const NAV_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: COLORS.background },
};

const ICONS: Record<string, { glyph: string; label: string }> = {
  Feed:     { glyph: '◈', label: 'FEED'    },
  Vault:    { glyph: '◉', label: 'VAULT'   },
  Insights: { glyph: '◇', label: 'PULSE'   },
  Future:   { glyph: '◬', label: 'FUTURE'  },
  Profile:  { glyph: '○', label: 'PROFILE' },
};

interface Props { onResetOnboarding: () => void; }

export default function AppNavigator({ onResetOnboarding }: Props) {
  return (
    <NavigationContainer theme={NAV_THEME}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.bar,
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => {
            const { glyph, label } = ICONS[route.name];
            return (
              <View style={styles.tabItem}>
                {focused && <View style={styles.activeLine} />}
                <Text style={[styles.glyph, { color: focused ? COLORS.gold : COLORS.textMuted }]}>{glyph}</Text>
                <Text style={[styles.tabLabel, { color: focused ? COLORS.gold : COLORS.textMuted }]}>{label}</Text>
              </View>
            );
          },
        })}
      >
        <Tab.Screen name="Feed"     component={HomeScreen} />
        <Tab.Screen name="Vault"    component={ScoreScreen} />
        <Tab.Screen name="Insights" component={InsightsScreen} />
        <Tab.Screen name="Future"   component={TrajectoryScreen} />
        <Tab.Screen name="Profile">{() => <ProfileScreen onResetOnboarding={onResetOnboarding} />}</Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    height: 68,
    paddingBottom: 0,
    elevation: 0,
    shadowColor: '#8A7A60',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 6, width: 60 },
  activeLine: { position: 'absolute', top: -1, width: 20, height: 1.5, backgroundColor: COLORS.gold, borderRadius: 1 },
  glyph: { fontSize: 15, lineHeight: 20 },
  tabLabel: { fontSize: 7, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.widest },
});

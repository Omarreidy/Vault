import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, View } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ScoreScreen from '../screens/ScoreScreen';
import ConciergeScreen from '../screens/ConciergeScreen';
import TrajectoryScreen from '../screens/TrajectoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS, FONTS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const NAV_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: COLORS.background },
};

const ICONS: Record<string, { glyph: string; label: string; center?: boolean }> = {
  Feed:    { glyph: '◈', label: 'FEED'    },
  Vault:   { glyph: '◉', label: 'VAULT'   },
  Ask:     { glyph: '✦', label: 'ASK', center: true },
  Future:  { glyph: '◬', label: 'FUTURE'  },
  Profile: { glyph: '○', label: 'PROFILE' },
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
            const icon = ICONS[route.name];
            if (icon?.center) {
              return (
                <View style={[styles.tabItem, styles.centerTabItem]}>
                  <View style={[styles.centerBtn, focused && styles.centerBtnActive]}>
                    <Text style={[styles.centerGlyph, { color: focused ? COLORS.background : COLORS.gold }]}>
                      {icon.glyph}
                    </Text>
                  </View>
                  <Text style={[styles.tabLabel, { color: focused ? COLORS.gold : COLORS.textMuted, marginTop: 2 }]}>
                    {icon.label}
                  </Text>
                </View>
              );
            }
            const { glyph, label } = icon;
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
        <Tab.Screen name="Feed"    component={HomeScreen} />
        <Tab.Screen name="Vault"   component={ScoreScreen} />
        <Tab.Screen name="Ask"     component={ConciergeScreen} />
        <Tab.Screen name="Future"  component={TrajectoryScreen} />
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
  centerTabItem: { paddingTop: 4 },
  activeLine: { position: 'absolute', top: -1, width: 20, height: 1.5, backgroundColor: COLORS.gold, borderRadius: 1 },
  glyph: { fontSize: 15, lineHeight: 20 },
  tabLabel: { fontSize: 7, fontWeight: FONTS.weights.semibold, letterSpacing: FONTS.tracking.widest },
  centerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.goldGlow,
    borderWidth: 1,
    borderColor: COLORS.gold + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtnActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  centerGlyph: { fontSize: 16, lineHeight: 20 },
});

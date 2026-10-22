import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import MainTabNavigator from './MainTabNavigator';

export default function RootNavigator() {
  const { user } = useAuth();
  const { profileComplete, loading } = useProfile();

  // undefined = auth state not yet known
  if (user === undefined || (user && loading)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user && <LoginScreen />}
      {user && !profileComplete && <OnboardingScreen />}
      {user && profileComplete && <MainTabNavigator />}
    </NavigationContainer>
  );
}

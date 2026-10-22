import React from 'react';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import RootNavigator from './src/navigation/RootNavigator';
import BuildFooter from './src/components/BuildFooter';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ProfileProvider>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ flex: 1 }}>
            <RootNavigator />
          </View>
          <BuildFooter />
        </View>
      </ProfileProvider>
    </AuthProvider>
  );
}

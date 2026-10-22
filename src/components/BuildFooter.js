import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { colors, fonts } from '../theme';

// Native build number (Android versionCode / iOS CFBundleVersion) — increments per EAS build.
const version = Application.nativeApplicationVersion || Constants.expoConfig?.version || '?';
const build = Application.nativeBuildVersion || Constants.expoConfig?.android?.versionCode || '?';

export default function BuildFooter() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.text}>meragame v{version} · build {build}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    alignItems: 'center',
    paddingVertical: 3,
  },
  text: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
});

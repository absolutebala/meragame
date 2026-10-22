import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius } from '../theme';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (e) {
      Alert.alert('Sign in failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0a0d14', '#111827', '#0a0d14']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Ionicons name="trophy" size={48} color={colors.primary} />
          </View>
          <Text style={styles.appName}>meragame</Text>
          <Text style={styles.tagline}>Your sports journey, your legacy</Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.disabled]}
            onPress={handleGoogle}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" style={styles.googleIcon} />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  logoBox: {
    width: 96, height: 96, borderRadius: radius.xl,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  appName: {
    fontFamily: fonts.bold, fontSize: 40, color: colors.text, letterSpacing: -1,
  },
  tagline: {
    fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary, textAlign: 'center',
  },
  bottom: { paddingBottom: spacing.xl, gap: spacing.md },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.sm,
  },
  googleIcon: { marginRight: 4 },
  googleText: { fontFamily: fonts.semiBold, fontSize: 16, color: '#fff' },
  disabled: { opacity: 0.6 },
  disclaimer: {
    fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center',
  },
});

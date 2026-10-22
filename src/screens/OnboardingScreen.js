import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../context/ProfileContext';
import { colors, fonts, spacing, radius } from '../theme';

const SPORTS = [
  { id: 'badminton', label: 'Badminton', icon: 'fitness', color: colors.badminton },
  { id: 'cricket', label: 'Cricket', icon: 'baseball', color: colors.cricket },
];

export default function OnboardingScreen() {
  const { updateProfile } = useProfile();
  const [name, setName] = useState('');
  const [selectedSports, setSelectedSports] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleSport = (id) => {
    setSelectedSports(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Please enter your name.');
    if (selectedSports.length === 0) return Alert.alert('Pick a sport', 'Select at least one sport.');
    try {
      setLoading(true);
      await updateProfile({ full_name: name.trim(), sports: selectedSports });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Ionicons name="trophy" size={36} color={colors.primary} />
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>Tell us a bit about yourself to get started</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Your Sports</Text>
            <View style={styles.sportsRow}>
              {SPORTS.map(sport => {
                const selected = selectedSports.includes(sport.id);
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[styles.sportCard, selected && { borderColor: sport.color, backgroundColor: sport.color + '22' }]}
                    onPress={() => toggleSport(sport.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={sport.icon} size={32} color={selected ? sport.color : colors.textMuted} />
                    <Text style={[styles.sportLabel, selected && { color: sport.color }]}>{sport.label}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={18} color={sport.color} style={styles.check} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.disabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Let's Go!</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.lg },
  header: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl, paddingBottom: spacing.md },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  section: { gap: spacing.sm },
  label: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
    fontFamily: fonts.regular, fontSize: 16, color: colors.text,
  },
  sportsRow: { flexDirection: 'row', gap: spacing.md },
  sportCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.bgCard, borderWidth: 2, borderColor: colors.border,
    borderRadius: radius.lg, paddingVertical: spacing.lg, position: 'relative',
  },
  sportLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textSecondary },
  check: { position: 'absolute', top: 8, right: 8 },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md,
  },
  saveBtnText: { fontFamily: fonts.bold, fontSize: 17, color: '#fff' },
  disabled: { opacity: 0.6 },
});

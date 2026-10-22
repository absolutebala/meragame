import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius } from '../theme';

const SPORTS = [
  { id: 'badminton', label: 'Badminton', color: colors.badminton },
  { id: 'cricket', label: 'Cricket', color: colors.cricket },
];

export default function CreateClubScreen({ navigation, route }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState('badminton');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Please enter a club name.');
    try {
      setLoading(true);
      const { error } = await supabase.from('clubs').insert({
        name: name.trim(),
        description: description.trim() || null,
        sport,
        created_by: user.id,
      });
      if (error) throw error;
      route.params?.onCreated?.();
      navigation.goBack();
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
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Create Club</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Club Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. South Delhi Shuttlers"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="What's your club about?"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Sport</Text>
            <View style={styles.sportRow}>
              {SPORTS.map(s => {
                const active = sport === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.sportBtn, active && { borderColor: s.color, backgroundColor: s.color + '22' }]}
                    onPress={() => setSport(s.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sportBtnText, active && { color: s.color }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.disabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="people" size={18} color="#fff" />
                  <Text style={styles.createBtnText}>Create Club</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  field: { gap: spacing.xs },
  label: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontFamily: fonts.regular, fontSize: 15, color: colors.text,
  },
  sportRow: { flexDirection: 'row', gap: spacing.md },
  sportBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  sportBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textSecondary },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, marginTop: spacing.sm,
  },
  createBtnText: { fontFamily: fonts.bold, fontSize: 16, color: '#fff' },
  disabled: { opacity: 0.6 },
});

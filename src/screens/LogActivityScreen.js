import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius } from '../theme';

const SPORTS = [
  { id: 'badminton', label: 'Badminton', color: colors.badminton },
  { id: 'cricket', label: 'Cricket', color: colors.cricket },
];

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', numeric }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor={colors.textMuted}
        keyboardType={numeric ? 'numeric' : keyboardType}
        returnKeyType="done"
      />
    </View>
  );
}

function BadmintonForm({ data, onChange }) {
  return (
    <>
      <Field label="Opponent" value={data.opponent} onChangeText={v => onChange('opponent', v)} placeholder="Opponent name" />
      <Field label="Your Score" value={data.my_score} onChangeText={v => onChange('my_score', v)} numeric />
      <Field label="Opp Score" value={data.opp_score} onChangeText={v => onChange('opp_score', v)} numeric />
      <Field label="Sets Won" value={data.sets_won} onChangeText={v => onChange('sets_won', v)} numeric />
      <Field label="Duration (min)" value={data.duration_min} onChangeText={v => onChange('duration_min', v)} numeric />
    </>
  );
}

function CricketForm({ data, onChange }) {
  return (
    <>
      <Field label="Runs Scored" value={data.runs} onChangeText={v => onChange('runs', v)} numeric />
      <Field label="Balls Faced" value={data.balls_faced} onChangeText={v => onChange('balls_faced', v)} numeric />
      <Field label="Wickets Taken" value={data.wickets} onChangeText={v => onChange('wickets', v)} numeric />
      <Field label="Overs Bowled" value={data.overs} onChangeText={v => onChange('overs', v)} numeric />
      <Field label="Catches" value={data.catches} onChangeText={v => onChange('catches', v)} numeric />
    </>
  );
}

const DEFAULT_BADMINTON = { opponent: '', my_score: '', opp_score: '', sets_won: '', duration_min: '' };
const DEFAULT_CRICKET = { runs: '', balls_faced: '', wickets: '', overs: '', catches: '' };

export default function LogActivityScreen() {
  const { user } = useAuth();
  const [sport, setSport] = useState('badminton');
  const [badminton, setBadminton] = useState(DEFAULT_BADMINTON);
  const [cricket, setCricket] = useState(DEFAULT_CRICKET);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (formSetter) => (key, value) => formSetter(prev => ({ ...prev, [key]: value }));

  const buildDetails = () => {
    const raw = sport === 'badminton' ? badminton : cricket;
    const details = {};
    Object.entries(raw).forEach(([k, v]) => { if (v !== '') details[k] = v; });
    return details;
  };

  const handleLog = async () => {
    try {
      setLoading(true);
      const details = buildDetails();
      const { error } = await supabase.from('activities').insert({
        user_id: user.id,
        sport,
        details,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      Alert.alert('Logged!', 'Your activity has been saved.', [{ text: 'OK', onPress: reset }]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setBadminton(DEFAULT_BADMINTON);
    setCricket(DEFAULT_CRICKET);
    setNotes('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Log Activity</Text>

          <View style={styles.sportRow}>
            {SPORTS.map(s => {
              const active = sport === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.sportBtn, active && { backgroundColor: s.color + '22', borderColor: s.color }]}
                  onPress={() => setSport(s.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sportBtnText, active && { color: s.color }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.form}>
            {sport === 'badminton'
              ? <BadmintonForm data={badminton} onChange={handleChange(setBadminton)} />
              : <CricketForm data={cricket} onChange={handleChange(setCricket)} />
            }
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any notes about this session..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.logBtn, loading && styles.disabled]}
            onPress={handleLog}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.logBtnText}>Save Activity</Text>
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
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text },
  sportRow: { flexDirection: 'row', gap: spacing.md },
  sportBtn: {
    flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
    borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  sportBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.textSecondary },
  form: { gap: spacing.sm },
  fieldRow: { gap: 6 },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  fieldInput: {
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontFamily: fonts.regular, fontSize: 15, color: colors.text,
  },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, gap: spacing.sm, marginTop: spacing.sm,
  },
  logBtnText: { fontFamily: fonts.bold, fontSize: 16, color: '#fff' },
  disabled: { opacity: 0.6 },
});

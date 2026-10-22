import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { colors, fonts, spacing, radius } from '../theme';

// Upload a local file URI to Supabase Storage, return public URL
async function uploadPhotoToStorage(userId, localUri) {
  try {
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Determine mime type from extension
    const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload to Supabase Storage bucket 'activity-photos'
    const { error } = await supabase.storage
      .from('activity-photos')
      .upload(fileName, decode(base64), {
        contentType: mimeType,
        upsert: false,
      });
    if (error) throw error;

    // Get public URL
    const { data } = supabase.storage.from('activity-photos').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.warn('Photo upload failed:', err.message);
    return null;
  }
}

// base64 decode to Uint8Array (no atob in React Native)
function decode(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bufLen = Math.floor((base64.length * 3) / 4);
  if (base64[base64.length - 1] === '=') bufLen--;
  if (base64[base64.length - 2] === '=') bufLen--;
  const buf = new Uint8Array(bufLen);
  let i = 0, j = 0;
  while (i < base64.length) {
    const a = chars.indexOf(base64[i++]);
    const b = chars.indexOf(base64[i++]);
    const c = chars.indexOf(base64[i++]);
    const d = chars.indexOf(base64[i++]);
    buf[j++] = (a << 2) | (b >> 4);
    if (j < bufLen) buf[j++] = ((b & 0xf) << 4) | (c >> 2);
    if (j < bufLen) buf[j++] = ((c & 0x3) << 6) | d;
  }
  return buf;
}

const SPORT_META = {
  badminton: { label: 'Badminton', color: colors.badminton },
  cricket:   { label: 'Cricket',   color: colors.cricket },
};

const RESULT_OPTIONS = ['Won', 'Lost', 'Draw'];

// ── Pill selector ─────────────────────────────────────────────
function PillSelector({ options, value, onChange, color }) {
  return (
    <View style={styles.pillRow}>
      {options.map(opt => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.pill, active && { backgroundColor: (color || colors.primary) + '22', borderColor: color || colors.primary }]}
            onPress={() => onChange(opt)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, active && { color: color || colors.primary }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Club search input ──────────────────────────────────────────
function ClubSearchInput({ sport, value, onChange }) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async (text) => {
    setQuery(text);
    onChange(null);
    if (text.length < 1) { setResults([]); return; }
    setSearching(true);
    const q = supabase.from('clubs').select('id, name, sport').ilike('name', `%${text}%`).limit(6);
    if (sport) q.eq('sport', sport);
    const { data } = await q;
    setResults(data || []);
    setSearching(false);
  };

  const select = (club) => {
    setQuery(club.name);
    setResults([]);
    onChange(club);
  };

  return (
    <View style={styles.tagWrap}>
      <Text style={styles.fieldLabel}>Club (optional)</Text>
      <View style={styles.tagInputRow}>
        {value ? (
          <View style={styles.tagChip}>
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={styles.tagName}>{value.name}</Text>
            <TouchableOpacity onPress={() => { onChange(null); setQuery(''); }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TextInput
            style={styles.tagInput}
            value={query}
            onChangeText={search}
            placeholder="Search or type club name..."
            placeholderTextColor={colors.textMuted}
          />
        )}
        {searching && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
      </View>
      {results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map(c => (
            <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => select(c)}>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} />
              <Text style={styles.dropdownName}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Player tag search ──────────────────────────────────────────
function PlayerTagInput({ label, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value?.full_name || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async (text) => {
    setQuery(text);
    onChange(null);
    if (text.length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .ilike('full_name', `%${text}%`)
      .limit(5);
    setResults(data || []);
    setSearching(false);
  };

  const select = (player) => {
    setQuery(player.full_name);
    setResults([]);
    onChange(player);
  };

  return (
    <View style={styles.tagWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.tagInputRow}>
        {value ? (
          <View style={styles.tagChip}>
            {value.avatar_url
              ? <Image source={{ uri: value.avatar_url }} style={styles.tagAvatar} />
              : <View style={[styles.tagAvatar, styles.tagAvatarPlaceholder]}><Text style={styles.tagInitial}>{value.full_name[0]}</Text></View>}
            <Text style={styles.tagName}>{value.full_name}</Text>
            <TouchableOpacity onPress={() => { onChange(null); setQuery(''); }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TextInput
            style={styles.tagInput}
            value={query}
            onChangeText={search}
            placeholder={placeholder || 'Search player...'}
            placeholderTextColor={colors.textMuted}
          />
        )}
        {searching && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
      </View>
      {results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map(p => (
            <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => select(p)}>
              {p.avatar_url
                ? <Image source={{ uri: p.avatar_url }} style={styles.tagAvatar} />
                : <View style={[styles.tagAvatar, styles.tagAvatarPlaceholder]}><Text style={styles.tagInitial}>{p.full_name[0]}</Text></View>}
              <Text style={styles.dropdownName}>{p.full_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Badminton form ─────────────────────────────────────────────
function BadmintonForm({ data, onChange }) {
  const sportColor = colors.badminton;
  return (
    <View style={styles.formSection}>
      {/* Singles / Doubles */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Format</Text>
        <PillSelector
          options={['Singles', 'Doubles']}
          value={data.format}
          onChange={v => onChange('format', v)}
          color={sportColor}
        />
      </View>

      {/* Result */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Result</Text>
        <PillSelector
          options={RESULT_OPTIONS}
          value={data.result}
          onChange={v => onChange('result', v)}
          color={data.result === 'Won' ? colors.success : data.result === 'Lost' ? colors.error : colors.primary}
        />
      </View>

      {/* Games won / lost */}
      <View style={styles.twoCol}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Games Won</Text>
          <TextInput
            style={styles.fieldInput}
            value={data.games_won}
            onChangeText={v => onChange('games_won', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Games Lost</Text>
          <TextInput
            style={styles.fieldInput}
            value={data.games_lost}
            onChangeText={v => onChange('games_lost', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      {/* Opponent(s) */}
      <PlayerTagInput
        label={data.format === 'Doubles' ? 'Opponent 1' : 'Opponent'}
        value={data.opponent1}
        onChange={v => onChange('opponent1', v)}
      />
      {data.format === 'Doubles' && (
        <>
          <PlayerTagInput
            label="Opponent 2"
            value={data.opponent2}
            onChange={v => onChange('opponent2', v)}
          />
          <PlayerTagInput
            label="My Partner"
            value={data.partner}
            onChange={v => onChange('partner', v)}
          />
        </>
      )}
    </View>
  );
}

// ── Cricket form ───────────────────────────────────────────────
function CricketForm({ data, onChange }) {
  return (
    <View style={styles.formSection}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Result</Text>
        <PillSelector
          options={RESULT_OPTIONS}
          value={data.result}
          onChange={v => onChange('result', v)}
          color={data.result === 'Won' ? colors.success : data.result === 'Lost' ? colors.error : colors.primary}
        />
      </View>
      <View style={styles.twoCol}>
        {[['Runs', 'runs', true], ['Balls Faced', 'balls_faced', true], ['Wickets', 'wickets', true], ['Overs', 'overs', false]].map(([label, key, numeric]) => (
          <View key={key} style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              style={styles.fieldInput}
              value={data[key]}
              onChangeText={v => onChange(key, v)}
              keyboardType={numeric ? 'numeric' : 'default'}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Default state ──────────────────────────────────────────────
const DEFAULT_BADMINTON = {
  format: 'Singles', result: '', games_won: '', games_lost: '',
  opponent1: null, opponent2: null, partner: null,
};
const DEFAULT_CRICKET = { result: '', runs: '', balls_faced: '', wickets: '', overs: '' };

// ── Main screen ────────────────────────────────────────────────
export default function LogActivityScreen({ navigation }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const userSports = profile?.sports || [];

  const [sport, setSport] = useState(userSports[0] || 'badminton');
  const [badminton, setBadminton] = useState(DEFAULT_BADMINTON);
  const [cricket, setCricket] = useState(DEFAULT_CRICKET);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(false);

  // Keep sport in sync if profile loads after mount
  useEffect(() => {
    if (userSports.length > 0 && !userSports.includes(sport)) {
      setSport(userSports[0]);
    }
  }, [userSports]);

  const handleChange = (setter) => (key, value) =>
    setter(prev => ({ ...prev, [key]: value }));

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });
    if (!result.canceled) {
      setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 4));
    }
  };

  const capturePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setPhotos(prev => [...prev, result.assets[0].uri].slice(0, 4));
    }
  };

  const buildDetails = () => {
    if (sport === 'badminton') {
      const d = { ...badminton };
      // serialize tagged players to id+name only
      if (d.opponent1) d.opponent1 = { id: d.opponent1.id, name: d.opponent1.full_name };
      if (d.opponent2) d.opponent2 = { id: d.opponent2.id, name: d.opponent2.full_name };
      if (d.partner)   d.partner   = { id: d.partner.id,   name: d.partner.full_name };
      return d;
    }
    return { ...cricket };
  };

  const handleLog = async () => {
    const data = sport === 'badminton' ? badminton : cricket;
    if (!data.result) return Alert.alert('Result required', 'Please select Won, Lost, or Draw.');
    try {
      setLoading(true);

      // Upload photos to Supabase Storage first
      let uploadedUrls = null;
      if (photos.length > 0) {
        const uploads = await Promise.all(
          photos.map(uri => uploadPhotoToStorage(user.id, uri))
        );
        const successfulUrls = uploads.filter(Boolean);
        if (successfulUrls.length > 0) uploadedUrls = successfulUrls;
      }

      const { error } = await supabase.from('activities').insert({
        user_id: user.id,
        sport,
        details: buildDetails(),
        notes: notes.trim() || null,
        photo_urls: uploadedUrls,
        club_id: club?.id || null,
      });
      if (error) throw error;
      // Reset
      setBadminton(DEFAULT_BADMINTON);
      setCricket(DEFAULT_CRICKET);
      setNotes('');
      setPhotos([]);
      setClub(null);
      // Navigate to Feed
      navigation.navigate('Feed');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const sportColor = SPORT_META[sport]?.color || colors.primary;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Log Activity</Text>

          {/* Sport selector — only user's sports */}
          {userSports.length > 1 && (
            <View style={styles.sportRow}>
              {userSports.map(s => {
                const meta = SPORT_META[s];
                if (!meta) return null;
                const active = sport === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sportBtn, active && { borderColor: meta.color, backgroundColor: meta.color + '22' }]}
                    onPress={() => setSport(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sportBtnText, active && { color: meta.color }]}>{meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {sport === 'badminton'
            ? <BadmintonForm data={badminton} onChange={handleChange(setBadminton)} />
            : <CricketForm data={cricket} onChange={handleChange(setCricket)} />
          }

          {/* Club */}
          <ClubSearchInput sport={sport} value={club} onChange={setClub} />

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it go?"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>

          {/* Photos */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Photos</Text>
            <View style={styles.photoRow}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImg} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos(p => p.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 4 && (
                <>
                  <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
                    <Ionicons name="images-outline" size={22} color={colors.textMuted} />
                    <Text style={styles.photoAddText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoAdd} onPress={capturePhoto}>
                    <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
                    <Text style={styles.photoAddText}>Camera</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: sportColor }, loading && styles.disabled]}
            onPress={handleLog}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.logBtnText}>Save Activity</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text },
  sportRow: { flexDirection: 'row', gap: spacing.md },
  sportBtn: {
    flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
    borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  sportBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.textSecondary },
  formSection: { gap: spacing.md },
  fieldGroup: { gap: 6 },
  twoCol: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  fieldInput: {
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontFamily: fonts.regular, fontSize: 15, color: colors.text,
  },
  pillRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  pillText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  // Player tag
  tagWrap: { gap: 6, zIndex: 10 },
  tagInputRow: { flexDirection: 'row', alignItems: 'center' },
  tagInput: {
    flex: 1, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontFamily: fonts.regular, fontSize: 15, color: colors.text,
  },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.bgInput, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 5, borderWidth: 1, borderColor: colors.border,
  },
  tagAvatar: { width: 24, height: 24, borderRadius: 12 },
  tagAvatarPlaceholder: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  tagInitial: { fontFamily: fonts.bold, fontSize: 11, color: '#fff' },
  tagName: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  dropdown: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, marginTop: 2,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownName: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  // Photos
  photoRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  photoThumb: { width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 2, right: 2 },
  photoAdd: {
    width: 72, height: 72, borderRadius: radius.sm, borderWidth: 1.5,
    borderColor: colors.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 3,
  },
  photoAddText: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  logBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.lg, paddingVertical: spacing.md, marginTop: spacing.sm,
  },
  logBtnText: { fontFamily: fonts.bold, fontSize: 16, color: '#fff' },
  disabled: { opacity: 0.6 },
});

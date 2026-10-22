import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ActivityIndicator, Image, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

const SPORT_COLOR = { badminton: colors.badminton, cricket: colors.cricket };
const ALL_SPORTS = [
  { id: 'badminton', label: 'Badminton', color: colors.badminton },
  { id: 'cricket',   label: 'Cricket',   color: colors.cricket },
];

function Avatar({ url, name, size = 72 }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.38, color: '#fff' }}>
        {name?.[0]?.toUpperCase() || '?'}
      </Text>
    </View>
  );
}

function StatBox({ value, label }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AddSportModal({ visible, currentSports, onAdd, onClose }) {
  const available = ALL_SPORTS.filter(s => !currentSports.includes(s.id));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Add a Sport</Text>
          {available.length === 0 ? (
            <Text style={styles.modalEmpty}>You've already added all available sports!</Text>
          ) : (
            available.map(sport => (
              <TouchableOpacity
                key={sport.id}
                style={[styles.modalOption, { borderColor: sport.color }]}
                onPress={() => onAdd(sport.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalOptionText, { color: sport.color }]}>{sport.label}</Text>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSport, setShowAddSport] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActivities(data || []);
    } catch (e) {
      console.error('fetchActivities:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // Re-fetch when tab is focused (after logging an activity)
  useFocusEffect(useCallback(() => {
    fetchActivities();
    refreshProfile();
  }, [fetchActivities]));

  const handleAddSport = async (sportId) => {
    setShowAddSport(false);
    try {
      const current = profile?.sports || [];
      await updateProfile({ sports: [...current, sportId] });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const uniqueSports = [...new Set(activities.map(a => a.sport))];
  const currentSports = profile?.sports || [];

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={activities}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View>
            {/* Header card */}
            <View style={styles.headerCard}>
              <Avatar url={profile?.avatar_url} name={profile?.full_name} size={80} />
              <Text style={styles.name}>{profile?.full_name || 'Player'}</Text>
              {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
              <Text style={styles.email}>{user?.email}</Text>

              {/* Sports badges + add sport */}
              <View style={styles.sportsRow}>
                {currentSports.map(s => (
                  <View key={s} style={[styles.sportBadge, { borderColor: SPORT_COLOR[s] || colors.primary }]}>
                    <Text style={[styles.sportBadgeText, { color: SPORT_COLOR[s] || colors.primary }]}>{s}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addSportBtn}
                  onPress={() => setShowAddSport(true)}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={styles.addSportText}>Sport</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatBox value={activities.length} label="Activities" />
              <View style={styles.statDivider} />
              <StatBox value={uniqueSports.length} label="Sports" />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>

            {loading && (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const sportColor = SPORT_COLOR[item.sport] || colors.primary;
          const d = item.details || {};
          return (
            <View style={styles.actCard}>
              <View style={styles.actCardHeader}>
                <View style={[styles.sportDot, { backgroundColor: sportColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.actSport}>{item.sport}</Text>
                  {d.result && (
                    <Text style={[styles.actResult, {
                      color: d.result === 'Won' ? colors.success : d.result === 'Lost' ? colors.error : colors.primary
                    }]}>{d.result}</Text>
                  )}
                  {item.notes ? <Text style={styles.actNotes} numberOfLines={1}>{item.notes}</Text> : null}
                </View>
                <Text style={styles.actDate}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <Text style={styles.empty}>No activities yet. Start logging your game!</Text>
          )
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      />

      <AddSportModal
        visible={showAddSport}
        currentSports={currentSports}
        onAdd={handleAddSport}
        onClose={() => setShowAddSport(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerCard: {
    alignItems: 'center', padding: spacing.lg, gap: spacing.sm,
    backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatarPlaceholder: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginTop: spacing.xs },
  bio: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  email: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  sportsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.xs },
  sportBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
  },
  sportBadgeText: { fontFamily: fonts.semiBold, fontSize: 12, textTransform: 'capitalize' },
  addSportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addSportText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, marginTop: 1,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: fonts.bold, fontSize: 26, color: colors.text },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },
  sectionHeader: { padding: spacing.md, paddingBottom: spacing.xs },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  actCard: {
    backgroundColor: colors.bgCard, marginHorizontal: spacing.md, marginBottom: spacing.sm,
    borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  actCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  sportDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  actSport: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, textTransform: 'capitalize' },
  actResult: { fontFamily: fonts.bold, fontSize: 13 },
  actNotes: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  actDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, padding: spacing.lg },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, padding: spacing.md, marginTop: spacing.md,
  },
  signOutText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.error },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, gap: spacing.md,
  },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  modalOption: {
    borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
  },
  modalOptionText: { fontFamily: fonts.semiBold, fontSize: 16 },
  modalEmpty: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  modalCancel: { padding: spacing.md, alignItems: 'center' },
  modalCancelText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.textMuted },
});

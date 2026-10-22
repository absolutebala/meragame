import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

const SPORT_COLOR = { badminton: colors.badminton, cricket: colors.cricket };

function StatBox({ value, label }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setActivities(data || []); setLoading(false); });
  }, [user]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const uniqueSports = [...new Set(activities.map(a => a.sport))];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name ? profile.full_name[0].toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Player'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.sportsRow}>
          {(profile?.sports || []).map(s => (
            <View key={s} style={[styles.sportBadge, { borderColor: SPORT_COLOR[s] || colors.primary }]}>
              <Text style={[styles.sportText, { color: SPORT_COLOR[s] || colors.primary }]}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatBox value={activities.length} label="Activities" />
        <View style={styles.statDivider} />
        <StatBox value={uniqueSports.length} label="Sports" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={activities.slice(0, 20)}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => {
            const sportColor = SPORT_COLOR[item.sport] || colors.primary;
            return (
              <View style={styles.actRow}>
                <View style={[styles.dot, { backgroundColor: sportColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.actSport}>{item.sport}</Text>
                  {item.notes ? <Text style={styles.actNotes} numberOfLines={1}>{item.notes}</Text> : null}
                </View>
                <Text style={styles.actDate}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No activities yet. Start logging your game!</Text>
          }
        />
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 34, color: '#fff' },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  email: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  sportsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  sportBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
  },
  sportText: { fontFamily: fonts.semiBold, fontSize: 12, textTransform: 'capitalize' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, marginHorizontal: spacing.lg,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border },
  sectionHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  actRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  actSport: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, textTransform: 'capitalize' },
  actNotes: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  actDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, padding: spacing.md, marginBottom: spacing.md,
  },
  signOutText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.error },
});

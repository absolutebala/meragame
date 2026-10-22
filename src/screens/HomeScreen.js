import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

const SPORT_COLOR = { badminton: colors.badminton, cricket: colors.cricket };

function StatChip({ label, value }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

function ActivityCard({ item }) {
  const sportColor = SPORT_COLOR[item.sport] || colors.primary;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.sportBadge, { backgroundColor: sportColor + '22', borderColor: sportColor }]}>
          <Text style={[styles.sportText, { color: sportColor }]}>{item.sport}</Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
      <Text style={styles.playerName}>{item.profiles?.full_name || 'Player'}</Text>
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
      {item.details && (
        <View style={styles.statsRow}>
          {Object.entries(item.details).slice(0, 4).map(([k, v]) => (
            <StatChip key={k} label={k} value={String(v)} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*, profiles(full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setActivities(data || []);
    } catch (e) {
      console.error('fetchActivities:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const onRefresh = () => { setRefreshing(true); fetchActivities(); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.logo}>meragame</Text>
        <Ionicons name="trophy" size={22} color={colors.primary} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ActivityCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="fitness-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No activities yet. Log your first game!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logo: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary },
  list: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sportBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
  },
  sportText: { fontFamily: fonts.semiBold, fontSize: 12, textTransform: 'capitalize' },
  timestamp: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  playerName: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  notes: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.bgInput, borderRadius: radius.sm, paddingHorizontal: spacing.sm,
    paddingVertical: 4, alignItems: 'center', minWidth: 64,
  },
  chipValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  chipLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted, textTransform: 'capitalize' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});

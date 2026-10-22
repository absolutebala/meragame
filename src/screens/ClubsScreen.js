import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

const SPORT_COLOR = { badminton: colors.badminton, cricket: colors.cricket };

function ClubCard({ club }) {
  const sportColor = SPORT_COLOR[club.sport] || colors.primary;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.sportDot, { backgroundColor: sportColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.clubName}>{club.name}</Text>
          {club.description ? <Text style={styles.clubDesc} numberOfLines={2}>{club.description}</Text> : null}
        </View>
        {club.verified && (
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
        )}
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.sportTag}>{club.sport}</Text>
        <Text style={styles.memberCount}>
          {new Date(club.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

export default function ClubsScreen({ navigation }) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClubs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClubs(data || []);
    } catch (e) {
      console.error('fetchClubs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchClubs(); }, [fetchClubs]);
  const onRefresh = () => { setRefreshing(true); fetchClubs(); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Clubs</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateClub', { onCreated: fetchClubs })}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createText}>Create</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ClubCard club={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No clubs yet. Create the first one!</Text>
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
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 7, paddingHorizontal: spacing.md,
  },
  createText: { fontFamily: fonts.semiBold, fontSize: 14, color: '#fff' },
  list: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  sportDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  clubName: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  clubDesc: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sportTag: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  memberCount: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius } from '../theme';

const SPORT_COLOR = { badminton: colors.badminton, cricket: colors.cricket };
const TABS = ['All', 'My Feed', 'Network', 'Clubs'];

function Avatar({ url, name, size = 42 }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>{name?.[0]?.toUpperCase() || '?'}</Text>
    </View>
  );
}

function ResultBadge({ result }) {
  if (!result) return null;
  const cfg = {
    Won:  { bg: colors.success + '22', text: colors.success },
    Lost: { bg: colors.error + '22',   text: colors.error },
    Draw: { bg: colors.primary + '22', text: colors.primary },
  }[result] || { bg: colors.bgMuted, text: colors.textMuted };
  return (
    <View style={[styles.resultBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.resultText, { color: cfg.text }]}>{result}</Text>
    </View>
  );
}

function StatPill({ label, value }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function ActivityCard({ item }) {
  const sportColor = SPORT_COLOR[item.sport] || colors.primary;
  const d = item.details || {};
  const poster = item.profiles;
  const club = item.clubs;
  const timeAgo = getTimeAgo(item.created_at);

  const stats = [];
  if (item.sport === 'badminton') {
    if (d.format)     stats.push({ label: 'Format', value: d.format });
    if (d.games_won)  stats.push({ label: 'Games Won', value: d.games_won });
    if (d.games_lost) stats.push({ label: 'Games Lost', value: d.games_lost });
    if (d.opponent1)  stats.push({ label: 'vs', value: d.opponent1.name || d.opponent1 });
  } else if (item.sport === 'cricket') {
    if (d.runs)       stats.push({ label: 'Runs', value: d.runs });
    if (d.wickets)    stats.push({ label: 'Wickets', value: d.wickets });
    if (d.balls_faced) stats.push({ label: 'Balls', value: d.balls_faced });
    if (d.overs)      stats.push({ label: 'Overs', value: d.overs });
  }

  return (
    <View style={styles.card}>
      {/* Card header — poster info */}
      <View style={styles.cardHeader}>
        <Avatar url={poster?.avatar_url} name={poster?.full_name} />
        <View style={styles.posterMeta}>
          <Text style={styles.posterName}>{poster?.full_name || 'Player'}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.sportTag, { borderColor: sportColor }]}>
              <Text style={[styles.sportTagText, { color: sportColor }]}>{item.sport}</Text>
            </View>
            {club && (
              <View style={styles.clubTag}>
                <Ionicons name="people-outline" size={10} color={colors.textMuted} />
                <Text style={styles.clubTagText}>{club.name}</Text>
              </View>
            )}
            <Text style={styles.timeAgo}>{timeAgo}</Text>
          </View>
        </View>
        {d.result && <ResultBadge result={d.result} />}
      </View>

      {/* Notes */}
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

      {/* Stats row */}
      {stats.length > 0 && (
        <View style={styles.statsRow}>
          {stats.map((s, i) => <StatPill key={i} label={s.label} value={s.value} />)}
        </View>
      )}

      {/* Photos */}
      {item.photo_urls?.length > 0 && (
        <View style={styles.photosRow}>
          {item.photo_urls.slice(0, 3).map((uri, i) => (
            <Image key={i} source={{ uri }} style={[styles.photoThumb, item.photo_urls.length === 1 && styles.photoFull]} />
          ))}
        </View>
      )}

      {/* Reactions row placeholder */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="thumbs-up-outline" size={16} color={colors.textMuted} />
          <Text style={styles.actionText}>Applaud</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="share-social-outline" size={16} color={colors.textMuted} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getTimeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  const fetchActivities = useCallback(async () => {
    try {
      let query = supabase
        .from('activities')
        .select('*, profiles(full_name, avatar_url), clubs(name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (activeTab === 'My Feed' && user) {
        query = query.eq('user_id', user.id);
      }
      // Network and Clubs tabs: future — for now same as All

      const { data, error } = await query;
      if (error) throw error;
      setActivities(data || []);
    } catch (e) {
      console.error('fetchActivities:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, user]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // Refresh when tab comes into focus (e.g. after logging an activity)
  useFocusEffect(useCallback(() => {
    fetchActivities();
  }, [fetchActivities]));

  const onRefresh = () => { setRefreshing(true); fetchActivities(); };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>meragame</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Feed tabs */}
      <View style={styles.tabsBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
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
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
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
  tabsBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  tab: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontFamily: fonts.semiBold },
  list: { paddingBottom: spacing.xl },
  // Card
  card: { backgroundColor: colors.bgCard, padding: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatarPlaceholder: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontFamily: fonts.bold, color: '#fff' },
  posterMeta: { flex: 1, gap: 3 },
  posterName: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sportTag: {
    paddingHorizontal: 7, paddingVertical: 1,
    borderRadius: radius.full, borderWidth: 1,
  },
  sportTagText: { fontFamily: fonts.medium, fontSize: 11, textTransform: 'capitalize' },
  timeAgo: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  clubTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.bgInput, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  clubTagText: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  resultBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  resultText: { fontFamily: fonts.bold, fontSize: 13 },
  notes: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  statPill: {
    backgroundColor: colors.bgInput, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4, alignItems: 'center', minWidth: 64,
  },
  statVal: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  statLbl: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted, textTransform: 'capitalize' },
  photosRow: { flexDirection: 'row', gap: 2, borderRadius: radius.sm, overflow: 'hidden' },
  photoThumb: { flex: 1, height: 140 },
  photoFull: { height: 200 },
  actionsRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.sm, gap: spacing.sm,
  },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 2 },
  actionText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl, marginTop: spacing.xxl },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});

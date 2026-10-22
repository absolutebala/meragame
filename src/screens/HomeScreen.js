import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl, Image, Modal, Dimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const SPORT_COLOR = { badminton: colors.badminton, cricket: colors.cricket };
const TABS = [
  { key: 'all',     label: 'All' },
  { key: 'my',      label: 'My Feed' },
  { key: 'network', label: 'Network' },
  { key: 'clubs',   label: 'Clubs' },
];

// ── Avatar ──────────────────────────────────────────────────────
function Avatar({ url, name, size = 42, onPress }) {
  const el = url
    ? <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    : (
      <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>{name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
    );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{el}</TouchableOpacity>;
  return el;
}

// ── Result badge ─────────────────────────────────────────────────
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

// ── Stat pill ────────────────────────────────────────────────────
function StatPill({ label, value }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

// ── Photo lightbox ───────────────────────────────────────────────
function PhotoLightbox({ urls, initialIndex, onClose }) {
  const [idx, setIdx] = useState(initialIndex);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.lightboxOverlay}>
        <TouchableOpacity style={styles.lightboxClose} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <ScrollView
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * SCREEN_W, y: 0 }}
          onMomentumScrollEnd={e => setIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
        >
          {urls.map((uri, i) => (
            <View key={i} style={{ width: SCREEN_W, justifyContent: 'center' }}>
              <Image source={{ uri }} style={styles.lightboxImage} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
        {urls.length > 1 && (
          <View style={styles.lightboxDots}>
            {urls.map((_, i) => (
              <View key={i} style={[styles.lightboxDot, i === idx && styles.lightboxDotActive]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Build narrative sentence ─────────────────────────────────────
function buildNarrativeParts(posterName, sport, d) {
  // Returns array of {text, isLink, playerId} segments, or null if nothing to show
  if (sport !== 'badminton') return null;

  const playerName = (p) => p?.name || p?.full_name || null;

  const segments = [];

  // Start with poster
  segments.push({ text: posterName, bold: true });

  if (d.format === 'Doubles' && d.partner && playerName(d.partner)) {
    segments.push({ text: ' partnering with ' });
    segments.push({ text: playerName(d.partner), isLink: true, playerId: d.partner.id });
  }

  const opp1 = playerName(d.opponent1);
  const opp2 = playerName(d.opponent2);

  if (opp1) {
    segments.push({ text: ' played against ' });
    segments.push({ text: opp1, isLink: true, playerId: d.opponent1?.id });
    if (opp2) {
      segments.push({ text: ' and ' });
      segments.push({ text: opp2, isLink: true, playerId: d.opponent2?.id });
    }
  } else {
    // No opponents tagged — nothing interesting to show
    return null;
  }

  return segments;
}

function NarrativeRow({ posterName, sport, d, navigation }) {
  const segments = buildNarrativeParts(posterName, sport, d);
  if (!segments) return null;
  return (
    <Text style={styles.narrative}>
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={[
            seg.bold ? styles.narrativeName : seg.isLink ? styles.narrativeLink : styles.narrativeText,
          ]}
          onPress={seg.isLink && seg.playerId
            ? () => navigation?.navigate('PlayerProfile', { userId: seg.playerId })
            : undefined}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}

// ── Activity card ────────────────────────────────────────────────
function ActivityCard({ item, navigation }) {
  const sportColor = SPORT_COLOR[item.sport] || colors.primary;
  const d = item.details || {};
  const poster = item.profiles;
  const club = item.clubs;
  const timeAgo = getTimeAgo(item.created_at);
  const [lightbox, setLightbox] = useState(null); // index or null

  const stats = [];
  if (item.sport === 'badminton') {
    if (d.format)      stats.push({ label: 'Format',     value: d.format });
    if (d.games_won != null && d.games_won !== '')  stats.push({ label: 'Won',  value: d.games_won });
    if (d.games_lost != null && d.games_lost !== '') stats.push({ label: 'Lost', value: d.games_lost });
  } else if (item.sport === 'cricket') {
    if (d.runs)        stats.push({ label: 'Runs',    value: d.runs });
    if (d.wickets)     stats.push({ label: 'Wkts',    value: d.wickets });
    if (d.balls_faced) stats.push({ label: 'Balls',   value: d.balls_faced });
    if (d.overs)       stats.push({ label: 'Overs',   value: d.overs });
  }

  // DEBUG: log full details so we can verify what's saved
  console.log('[ActivityCard] id:', item.id, 'details:', JSON.stringify(d));

  // narrative rendered inline below
  const photos = item.photo_urls || [];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Avatar
          url={poster?.avatar_url} name={poster?.full_name}
          onPress={() => poster?.id && navigation?.navigate('PlayerProfile', { userId: poster.id })}
        />
        <View style={styles.posterMeta}>
          <TouchableOpacity onPress={() => poster?.id && navigation?.navigate('PlayerProfile', { userId: poster.id })}>
            <Text style={styles.posterName}>{poster?.full_name || 'Player'}</Text>
          </TouchableOpacity>
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

      {/* Narrative sentence */}
      <NarrativeRow
        posterName={poster?.full_name || 'Player'}
        sport={item.sport}
        d={d}
        navigation={navigation}
      />

      {/* Stats row */}
      {stats.length > 0 && (
        <View style={styles.statsRow}>
          {stats.map((s, i) => <StatPill key={i} label={s.label} value={s.value} />)}
        </View>
      )}

      {/* Notes */}
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

      {/* Photos — tappable grid */}
      {photos.length > 0 && (
        <View style={styles.photosGrid}>
          {photos.slice(0, 4).map((uri, i) => {
            const isLast = i === 3 && photos.length > 4;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.photoCell, photos.length === 1 && styles.photoCellFull]}
                onPress={() => setLightbox(i)}
                activeOpacity={0.9}
              >
                <Image source={{ uri }} style={styles.photoCellImg} resizeMode="cover" />
                {isLast && (
                  <View style={styles.photoMore}>
                    <Text style={styles.photoMoreText}>+{photos.length - 4}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Actions */}
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

      {lightbox !== null && (
        <PhotoLightbox
          urls={photos}
          initialIndex={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
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

// ── Main screen ──────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const fetchActivities = useCallback(async () => {
    try {
      let query = supabase
        .from('activities')
        .select('*, profiles(id, full_name, avatar_url), clubs(name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (activeTab === 'my' && user) {
        query = query.eq('user_id', user.id);
      } else if (activeTab === 'network' && user) {
        // Only people the current user follows
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        const ids = (follows || []).map(f => f.following_id);
        if (ids.length === 0) {
          setActivities([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        query = query.in('user_id', ids);
      } else if (activeTab === 'clubs') {
        // Only activities that belong to a club
        query = query.not('club_id', 'is', null);
      }

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

  useEffect(() => { setLoading(true); fetchActivities(); }, [fetchActivities]);

  useFocusEffect(useCallback(() => { fetchActivities(); }, [fetchActivities]));

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

      {/* Tab badges */}
      <View style={styles.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ActivityCard item={item} navigation={navigation} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8, backgroundColor: colors.bg }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {activeTab === 'network'
                  ? 'Follow other players to see their activities here.'
                  : activeTab === 'clubs'
                  ? 'No club activities yet. Join or create a club!'
                  : 'No activities yet. Log your first game!'}
              </Text>
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
  // Tab badges
  tabsBar: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgCard },
  tabsScroll: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  tabBadge: {
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgInput,
  },
  tabBadgeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBadgeText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  tabBadgeTextActive: { color: '#fff', fontFamily: fonts.semiBold },
  list: { paddingBottom: spacing.xl },
  // Card
  card: { backgroundColor: colors.bgCard, padding: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatarPlaceholder: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontFamily: fonts.bold, color: '#fff' },
  posterMeta: { flex: 1, gap: 3 },
  posterName: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  sportTag: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.full, borderWidth: 1 },
  sportTagText: { fontFamily: fonts.medium, fontSize: 11, textTransform: 'capitalize' },
  clubTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.bgInput, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  clubTagText: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  timeAgo: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  resultBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  resultText: { fontFamily: fonts.bold, fontSize: 13 },
  // Narrative
  narrative: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  narrativeName: { fontFamily: fonts.semiBold, color: colors.text },
  narrativeLink: { fontFamily: fonts.semiBold, color: colors.primary },
  narrativeText: { fontFamily: fonts.regular, color: colors.textSecondary },
  notes: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  statPill: { backgroundColor: colors.bgInput, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, alignItems: 'center', minWidth: 56 },
  statVal: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  statLbl: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted, textTransform: 'capitalize' },
  // Photos grid
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, borderRadius: radius.sm, overflow: 'hidden' },
  photoCell: { width: (SCREEN_W - spacing.md * 2 - 2) / 2 - 1, height: 160, overflow: 'hidden' },
  photoCellFull: { width: '100%', height: 220 },
  photoCellImg: { width: '100%', height: '100%' },
  photoMore: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000a', justifyContent: 'center', alignItems: 'center' },
  photoMoreText: { fontFamily: fonts.bold, fontSize: 22, color: '#fff' },
  // Lightbox
  lightboxOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  lightboxClose: { position: 'absolute', top: 48, right: spacing.lg, zIndex: 10 },
  lightboxImage: { width: SCREEN_W, height: SCREEN_W * 1.2 },
  lightboxDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 40 },
  lightboxDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff55' },
  lightboxDotActive: { backgroundColor: '#fff' },
  // Actions
  actionsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 2 },
  actionText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl, marginTop: spacing.xxl },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});

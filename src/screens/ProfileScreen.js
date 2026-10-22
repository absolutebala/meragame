import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ActivityIndicator, Image, Modal, ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing, radius } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const COVER_H = 130;
const AVATAR_SIZE = 84;
const SPORT_COLOR = { badminton: colors.badminton, cricket: colors.cricket };
const ALL_SPORTS = [
  { id: 'badminton', label: 'Badminton', color: colors.badminton },
  { id: 'cricket',   label: 'Cricket',   color: colors.cricket },
];
const SPORT_ICONS = { badminton: '🏸', cricket: '🏏' };

// ── Helpers ─────────────────────────────────────────────────────
function getTimeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function winRate(acts) {
  const played = acts.filter(a => a.details?.result);
  if (!played.length) return null;
  const wins = played.filter(a => a.details?.result === 'Won').length;
  return Math.round((wins / played.length) * 100);
}

// ── Add Sport Modal ──────────────────────────────────────────────
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
                <Text style={{ fontSize: 20 }}>{SPORT_ICONS[sport.id] || '🏆'}</Text>
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

// ── Sport Section Card (like LinkedIn Skills) ────────────────────
function SportSection({ sport, activities, onAddSport }) {
  const color = SPORT_COLOR[sport] || colors.primary;
  const sportActs = activities.filter(a => a.sport === sport);
  const wins = sportActs.filter(a => a.details?.result === 'Won').length;
  const total = sportActs.filter(a => a.details?.result).length;
  const wr = total ? Math.round((wins / total) * 100) : null;

  return (
    <View style={[styles.sportSection, { borderLeftColor: color }]}>
      <View style={styles.sportSectionHeader}>
        <Text style={styles.sportSectionIcon}>{SPORT_ICONS[sport] || '🏆'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sportSectionName, { color }]}>{sport}</Text>
          <Text style={styles.sportSectionMeta}>{sportActs.length} activities</Text>
        </View>
        {wr !== null && (
          <View style={[styles.wrBadge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.wrText, { color }]}>{wr}% WR</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Activity mini-card in profile ────────────────────────────────
function ActivityMiniCard({ item }) {
  const d = item.details || {};
  const sportColor = SPORT_COLOR[item.sport] || colors.primary;
  const hasResult = !!d.result;
  const resultColor = d.result === 'Won' ? colors.success : d.result === 'Lost' ? colors.error : colors.primary;

  return (
    <View style={styles.miniCard}>
      <View style={styles.miniCardLeft}>
        <View style={[styles.miniSportDot, { backgroundColor: sportColor }]} />
        <View>
          <View style={styles.miniCardRow}>
            <Text style={styles.miniSport}>{item.sport}</Text>
            {hasResult && (
              <View style={[styles.miniResult, { backgroundColor: resultColor + '22' }]}>
                <Text style={[styles.miniResultText, { color: resultColor }]}>{d.result}</Text>
              </View>
            )}
            {d.format && <Text style={styles.miniFormat}>{d.format}</Text>}
          </View>
          {item.notes ? <Text style={styles.miniNotes} numberOfLines={1}>{item.notes}</Text> : null}
          {d.games_won != null && d.games_lost != null && (
            <Text style={styles.miniStats}>{d.games_won}W – {d.games_lost}L</Text>
          )}
        </View>
      </View>
      <Text style={styles.miniDate}>{getTimeAgo(item.created_at)}</Text>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSport, setShowAddSport] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });

  const fetchActivities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [actRes, follRes, folgRes] = await Promise.all([
        supabase.from('activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', user.id),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', user.id),
      ]);
      setActivities(actRes.data || []);
      setFollowStats({ followers: follRes.count || 0, following: folgRes.count || 0 });
    } catch (e) {
      console.error('fetchActivities:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

  const currentSports = profile?.sports || [];
  const uniqueSports = [...new Set(activities.map(a => a.sport))];
  const wr = winRate(activities);
  const recentActivities = activities.slice(0, 5);

  const ProfileHeader = (
    <View>
      {/* Cover banner */}
      <View style={styles.coverContainer}>
        <LinearGradient
          colors={['#1a2035', '#0f172a', colors.bg]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.cover}
        />
        {/* Orange accent line at top */}
        <View style={styles.coverAccent} />
        {/* Subtle sport icons in background */}
        <Text style={styles.coverBg}>🏸  🏏  🏆</Text>
      </View>

      {/* Avatar overlapping cover */}
      <View style={styles.avatarRow}>
        <View style={styles.avatarWrap}>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{profile?.full_name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
            )
          }
          <View style={styles.avatarBorder} />
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
          <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Name / headline */}
      <View style={styles.identityBlock}>
        <Text style={styles.name}>{profile?.full_name || 'Player'}</Text>
        {profile?.bio
          ? <Text style={styles.headline}>{profile.bio}</Text>
          : <Text style={styles.headlineMuted}>Add a headline about your game</Text>
        }
        <Text style={styles.emailLine}>{user?.email}</Text>
      </View>

      {/* Follow stats */}
      <View style={styles.followRow}>
        <TouchableOpacity style={styles.followStat} activeOpacity={0.8}>
          <Text style={styles.followCount}>{followStats.followers}</Text>
          <Text style={styles.followLabel}>Followers</Text>
        </TouchableOpacity>
        <View style={styles.followDot} />
        <TouchableOpacity style={styles.followStat} activeOpacity={0.8}>
          <Text style={styles.followCount}>{followStats.following}</Text>
          <Text style={styles.followLabel}>Following</Text>
        </TouchableOpacity>
        <View style={styles.followDot} />
        <View style={styles.followStat}>
          <Text style={styles.followCount}>{activities.length}</Text>
          <Text style={styles.followLabel}>Games</Text>
        </View>
        {wr !== null && (
          <>
            <View style={styles.followDot} />
            <View style={styles.followStat}>
              <Text style={[styles.followCount, { color: colors.success }]}>{wr}%</Text>
              <Text style={styles.followLabel}>Win Rate</Text>
            </View>
          </>
        )}
      </View>

      {/* ── Sports / Skills section ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <Text style={styles.sectionTitle}>Sports</Text>
          <TouchableOpacity style={styles.addIconBtn} onPress={() => setShowAddSport(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {currentSports.length === 0 ? (
          <TouchableOpacity style={styles.addSportPrompt} onPress={() => setShowAddSport(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addSportPromptText}>Add your first sport</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.sportsGrid}>
            {currentSports.map(s => (
              <SportSection key={s} sport={s} activities={activities} />
            ))}
          </View>
        )}
      </View>

      {/* ── Recent Activity section ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <Text style={styles.sectionTitle}>Activity</Text>
          {activities.length > 5 && (
            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.showAll}>Show all</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && <ActivityIndicator color={colors.primary} style={{ margin: spacing.md }} />}

        {!loading && activities.length === 0 && (
          <Text style={styles.emptyText}>No games logged yet. Hit the court and log your first game!</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={recentActivities}
        keyExtractor={item => item.id}
        ListHeaderComponent={ProfileHeader}
        renderItem={({ item }) => <ActivityMiniCard item={item} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl + 20 }}
        ListFooterComponent={
          activities.length > 0 && (
            <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}>
              <Text style={styles.footerNote}>Showing your 5 most recent games</Text>
            </View>
          )
        }
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

  // Cover
  coverContainer: { height: COVER_H, position: 'relative', overflow: 'hidden' },
  cover: { ...StyleSheet.absoluteFillObject },
  coverAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.primary },
  coverBg: {
    position: 'absolute', bottom: 12, right: 16,
    fontSize: 28, opacity: 0.15, letterSpacing: 8,
  },

  // Avatar
  avatarRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.md, marginTop: -(AVATAR_SIZE / 2),
    gap: spacing.sm,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3, borderColor: colors.bg,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.bg,
  },
  avatarInitial: { fontFamily: fonts.bold, fontSize: AVATAR_SIZE * 0.38, color: '#fff' },
  avatarBorder: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.success, borderWidth: 2, borderColor: colors.bg,
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.full,
    paddingVertical: 5, paddingHorizontal: spacing.sm, marginBottom: spacing.xs,
  },
  editBtnText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  settingsBtn: { padding: spacing.xs, marginBottom: spacing.xs },

  // Identity
  identityBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: 3 },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  headline: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  headlineMuted: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  emailLine: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Follow stats row
  followRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  followStat: { alignItems: 'center', gap: 1 },
  followCount: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  followLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  followDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border, marginBottom: 6 },

  // Section cards
  sectionCard: {
    backgroundColor: colors.bgCard,
    marginTop: 8, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: spacing.sm,
  },
  sectionCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: 17, color: colors.text },
  addIconBtn: { padding: 2 },
  showAll: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },

  // Sports grid
  sportsGrid: { gap: 1, paddingHorizontal: spacing.md },
  sportSection: {
    borderLeftWidth: 3, paddingLeft: spacing.sm,
    paddingVertical: spacing.sm, marginBottom: spacing.xs,
  },
  sportSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sportSectionIcon: { fontSize: 22 },
  sportSectionName: { fontFamily: fonts.semiBold, fontSize: 15, textTransform: 'capitalize' },
  sportSectionMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  wrBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  wrText: { fontFamily: fonts.bold, fontSize: 12 },

  // Add sport prompt
  addSportPrompt: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  addSportPromptText: { fontFamily: fonts.medium, fontSize: 15, color: colors.primary },

  // Mini activity cards
  miniCard: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border + '55',
    backgroundColor: colors.bgCard,
  },
  miniCardLeft: { flexDirection: 'row', gap: spacing.sm, flex: 1 },
  miniSportDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  miniCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  miniSport: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, textTransform: 'capitalize' },
  miniResult: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full },
  miniResultText: { fontFamily: fonts.bold, fontSize: 11 },
  miniFormat: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  miniNotes: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  miniStats: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, marginTop: 1 },
  miniDate: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, flexShrink: 0 },

  emptyText: {
    fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, lineHeight: 20,
  },
  footerNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, gap: spacing.md,
  },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  modalOption: {
    borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
    flexDirection: 'row', gap: spacing.md,
  },
  modalOptionText: { fontFamily: fonts.semiBold, fontSize: 16 },
  modalEmpty: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  modalCancel: { padding: spacing.md, alignItems: 'center' },
  modalCancelText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.textMuted },
});

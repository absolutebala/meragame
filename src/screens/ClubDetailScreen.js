import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ActivityIndicator, Image, Modal, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius } from '../theme';

const SPORT_COLOR = { badminton: colors.badminton, cricket: colors.cricket };
const SPORT_ICONS = { badminton: '🏸', cricket: '🏏' };

function Avatar({ url, name, size = 40 }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={[styles.avatarPH, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.38, color: '#fff' }}>
        {name?.[0]?.toUpperCase() || '?'}
      </Text>
    </View>
  );
}

// ── Invite Modal ─────────────────────────────────────────────────
function InviteModal({ visible, clubId, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(null);

  const search = async (text) => {
    setQuery(text);
    if (!text.trim()) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .ilike('full_name', `%${text}%`)
      .limit(8);
    setResults(data || []);
    setLoading(false);
  };

  const invite = async (profile) => {
    setInviting(profile.id);
    try {
      const { error } = await supabase.from('club_members').upsert({
        club_id: clubId,
        user_id: profile.id,
        role: 'member',
      }, { onConflict: 'club_id,user_id' });
      if (error) throw error;
      Alert.alert('Invited!', `${profile.full_name} has been added to the club.`);
      setResults(prev => prev.filter(r => r.id !== profile.id));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setInviting(null);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invite Members</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search players by name…"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={search}
              autoFocus
            />
          </View>

          {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />}

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 340 }}>
            {results.map(p => (
              <View key={p.id} style={styles.resultRow}>
                <Avatar url={p.avatar_url} name={p.full_name} size={38} />
                <Text style={styles.resultName}>{p.full_name}</Text>
                <TouchableOpacity
                  style={styles.inviteBtn}
                  onPress={() => invite(p)}
                  disabled={inviting === p.id}
                  activeOpacity={0.8}
                >
                  {inviting === p.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.inviteBtnText}>Invite</Text>
                  }
                </TouchableOpacity>
              </View>
            ))}
            {!loading && query.length > 0 && results.length === 0 && (
              <Text style={styles.noResults}>No players found for "{query}"</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Member Row ───────────────────────────────────────────────────
function MemberRow({ member }) {
  const p = member.profiles || {};
  return (
    <View style={styles.memberRow}>
      <Avatar url={p.avatar_url} name={p.full_name} size={42} />
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{p.full_name || 'Member'}</Text>
        {member.role === 'admin' && (
          <Text style={styles.memberRole}>Admin</Text>
        )}
      </View>
      {member.role === 'admin' && (
        <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
      )}
    </View>
  );
}

// ── Activity Row (club feed) ─────────────────────────────────────
function ClubActivity({ item }) {
  const d = item.details || {};
  const sportColor = SPORT_COLOR[item.sport] || colors.primary;
  const poster = item.profiles;
  const diff = Math.floor((Date.now() - new Date(item.created_at)) / 1000);
  const ago = diff < 3600 ? `${Math.floor(diff / 60)}m ago`
    : diff < 86400 ? `${Math.floor(diff / 3600)}h ago`
    : `${Math.floor(diff / 86400)}d ago`;
  const resultColor = d.result === 'Won' ? colors.success : d.result === 'Lost' ? colors.error : colors.primary;

  return (
    <View style={styles.actRow}>
      <Avatar url={poster?.avatar_url} name={poster?.full_name} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.actRowTop}>
          <Text style={styles.actPoster}>{poster?.full_name || 'Player'}</Text>
          <Text style={styles.actAgo}>{ago}</Text>
        </View>
        <View style={styles.actRowMeta}>
          <View style={[styles.actSportTag, { borderColor: sportColor }]}>
            <Text style={[styles.actSportTagTxt, { color: sportColor }]}>{item.sport}</Text>
          </View>
          {d.result && (
            <View style={[styles.actResultBadge, { backgroundColor: resultColor + '22' }]}>
              <Text style={[styles.actResultTxt, { color: resultColor }]}>{d.result}</Text>
            </View>
          )}
        </View>
        {item.notes ? <Text style={styles.actNotes} numberOfLines={2}>{item.notes}</Text> : null}
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function ClubDetailScreen({ route, navigation }) {
  const { clubId } = route.params;
  const { user } = useAuth();

  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingClub, setLoadingClub] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // posts | members

  const fetchAll = useCallback(async () => {
    setLoadingClub(true);
    try {
      const [clubRes, membersRes, actRes] = await Promise.all([
        supabase.from('clubs').select('*, profiles(full_name, avatar_url)').eq('id', clubId).single(),
        supabase.from('club_members').select('*, profiles(id, full_name, avatar_url)').eq('club_id', clubId).order('created_at'),
        supabase.from('activities').select('*, profiles(full_name, avatar_url)').eq('club_id', clubId).order('created_at', { ascending: false }).limit(20),
      ]);

      setClub(clubRes.data);
      setMembers(membersRes.data || []);
      setActivities(actRes.data || []);

      if (user) {
        const myMembership = (membersRes.data || []).find(m => m.user_id === user.id);
        setIsMember(!!myMembership);
        setIsAdmin(myMembership?.role === 'admin');
      }
    } catch (e) {
      console.error('fetchAll club:', e);
    } finally {
      setLoadingClub(false);
    }
  }, [clubId, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    try {
      await supabase.from('club_members').upsert({ club_id: clubId, user_id: user.id, role: 'member' }, { onConflict: 'club_id,user_id' });
      await fetchAll();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setJoining(false);
    }
  };

  if (loadingClub) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} size="large" />
      </SafeAreaView>
    );
  }

  if (!club) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Club not found.</Text>
      </SafeAreaView>
    );
  }

  const sportColor = SPORT_COLOR[club.sport] || colors.primary;

  const Header = (
    <View>
      {/* Cover */}
      <View style={[styles.cover, { backgroundColor: sportColor + '22' }]}>
        <View style={[styles.coverAccent, { backgroundColor: sportColor }]} />
        <Text style={styles.coverEmoji}>{SPORT_ICONS[club.sport] || '🏆'}</Text>
      </View>

      {/* Club logo / name row */}
      <View style={styles.clubLogoRow}>
        <View style={[styles.clubLogo, { backgroundColor: sportColor + '33', borderColor: sportColor }]}>
          <Text style={{ fontSize: 36 }}>{SPORT_ICONS[club.sport] || '🏆'}</Text>
        </View>
      </View>

      {/* Club info */}
      <View style={styles.clubInfo}>
        <View style={styles.clubTitleRow}>
          <Text style={styles.clubName}>{club.name}</Text>
          {club.verified && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
        </View>
        <View style={styles.clubMetaRow}>
          <View style={[styles.sportBadge, { borderColor: sportColor }]}>
            <Text style={[styles.sportBadgeText, { color: sportColor }]}>{club.sport}</Text>
          </View>
          <Text style={styles.clubMeta}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        </View>
        {club.description ? <Text style={styles.clubDesc}>{club.description}</Text> : null}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {!isMember ? (
          <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} disabled={joining} activeOpacity={0.8}>
            {joining
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.joinBtnText}>Join Club</Text>
                </>
            }
          </TouchableOpacity>
        ) : (
          <View style={styles.memberBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.memberBadgeText}>Member</Text>
          </View>
        )}

        {(isMember || isAdmin) && (
          <TouchableOpacity style={styles.inviteOutlineBtn} onPress={() => setShowInvite(true)} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={15} color={colors.primary} />
            <Text style={styles.inviteOutlineTxt}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            Members ({members.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const listData = activeTab === 'posts' ? activities : members;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>

      <FlatList
        data={listData}
        keyExtractor={item => item.id}
        ListHeaderComponent={Header}
        renderItem={({ item }) =>
          activeTab === 'posts'
            ? <ClubActivity item={item} />
            : <MemberRow member={item} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {activeTab === 'posts'
              ? 'No activities posted for this club yet.'
              : 'No members yet. Invite someone!'}
          </Text>
        }
      />

      <InviteModal visible={showInvite} clubId={clubId} onClose={() => setShowInvite(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    position: 'absolute', top: 52, left: spacing.md,
    zIndex: 10, backgroundColor: '#000000aa', borderRadius: radius.full,
    padding: 8,
  },
  notFound: { fontFamily: fonts.regular, fontSize: 16, color: colors.textMuted, textAlign: 'center', marginTop: 80 },

  // Cover
  cover: { height: 130, overflow: 'hidden', position: 'relative' },
  coverAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  coverEmoji: { position: 'absolute', bottom: 10, right: 16, fontSize: 48, opacity: 0.2 },

  // Club logo
  clubLogoRow: { paddingHorizontal: spacing.md, marginTop: -32 },
  clubLogo: {
    width: 68, height: 68, borderRadius: radius.md,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.bgCard,
  },

  // Club info
  clubInfo: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.xs },
  clubTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  clubName: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, flex: 1 },
  clubMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sportBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  sportBadgeText: { fontFamily: fonts.medium, fontSize: 11, textTransform: 'capitalize' },
  clubMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  clubDesc: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  // Actions
  actionRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 8, paddingHorizontal: spacing.md,
  },
  joinBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: '#fff' },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.success + '22', borderRadius: radius.md,
    paddingVertical: 8, paddingHorizontal: spacing.md,
  },
  memberBadgeText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.success },
  inviteOutlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 8, paddingHorizontal: spacing.md,
  },
  inviteOutlineTxt: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary },

  // Tabs
  tabsRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  tab: {
    flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontFamily: fonts.semiBold },

  // Activity rows
  actRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border + '55',
    backgroundColor: colors.bgCard,
  },
  actRowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  actPoster: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  actAgo: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  actRowMeta: { flexDirection: 'row', gap: spacing.xs, marginTop: 2 },
  actSportTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full, borderWidth: 1 },
  actSportTagTxt: { fontFamily: fonts.medium, fontSize: 11, textTransform: 'capitalize' },
  actResultBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full },
  actResultTxt: { fontFamily: fonts.bold, fontSize: 11 },
  actNotes: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  // Member rows
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border + '55',
    backgroundColor: colors.bgCard,
  },
  memberName: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  memberRole: { fontFamily: fonts.regular, fontSize: 12, color: colors.primary },

  // Invite modal
  modalOverlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.sm, height: 44,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border + '44',
  },
  resultName: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  inviteBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    minWidth: 60, alignItems: 'center',
  },
  inviteBtnText: { fontFamily: fonts.semiBold, fontSize: 13, color: '#fff' },
  noResults: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', padding: spacing.md },
  emptyText: {
    fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted,
    textAlign: 'center', padding: spacing.xl, lineHeight: 20,
  },

  // Avatar placeholder
  avatarPH: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
});

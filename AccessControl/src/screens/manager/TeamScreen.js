import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

export default function TeamScreen() {
  const { accessToken } = useAuth();
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    safe:     { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
    header:   { marginBottom: 16 },
    title:    { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 3 },
    subtitle: { color: colors.textMuted, fontSize: 13 },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard: { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
    statLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 5 },
    statValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '500', letterSpacing: -0.3 },
    statSub:  { fontSize: 11, marginTop: 2 },
    sectionTitle: { color: colors.textSecondary, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
    memberItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bgCard },
    avatar:    { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    avatarText: { fontSize: 13, fontWeight: '500' },
    memberInfo: { flex: 1 },
    memberName: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 2 },
    memberMeta: { color: colors.textMuted, fontSize: 11 },
    memberRight: { alignItems: 'flex-end', gap: 4 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '500' },
    memberTime: { color: colors.textMuted, fontSize: 11 },
  });

  const AVATAR_COLORS = [
    { bg: colors.bgDeep,    border: colors.accentDark,    text: colors.accentText },
    { bg: colors.successBg, border: colors.successBorder, text: colors.success },
    { bg: colors.warningBg, border: colors.warningBorder, text: colors.warning },
    { bg: colors.managerBg, border: colors.managerBorder, text: colors.managerColor },
  ];
  const [users,      setUsers]      = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  const fetchData = useCallback(async () => {
    try {
      // For managers, this endpoint will only return their team members (backend filters)
      // For non-managers, this endpoint returns all users
      const [usersRes, attRes] = await Promise.all([
        api.get(API.USERS),
        api.get(API.ALL_ATTENDANCE),
      ]);
      
      const allUsers = usersRes.data.data || [];
      console.log(`[TeamScreen] Fetched ${allUsers.length} users for team overview`);
      
      setUsers(allUsers);
      setAttendance(attRes.data.data || []);
    } catch (err) {
      console.error('Team fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getTodayAttendance = (userId) => {
    return attendance.find(a => {
      if (!a || !a.check_in) return false;
      const d = new Date(a.check_in);
      return d.toDateString() === new Date().toDateString() && a.user_id === userId;
    });
  };

  const getStatus = (userId) => {
    const rec = getTodayAttendance(userId);
    if (!rec || !rec.check_in) return { label: 'Absent', color: colors.textMuted, bg: colors.bgCard, border: colors.border };
    const checkIn = new Date(rec.check_in);
    const late = checkIn.getHours() >= 9 && checkIn.getMinutes() > 15;
    if (late) return { label: 'Late', color: colors.warning, bg: colors.warningBg, border: colors.warningBorder };
    return { label: 'In', color: colors.success, bg: colors.successBg, border: colors.successBorder };
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = users.filter(u => getTodayAttendance(u.user_id)).length;
  const lateCount    = users.filter(u => {
    const rec = getTodayAttendance(u.user_id);
    if (!rec || !rec.check_in) return false;
    const h = new Date(rec.check_in);
    return h.getHours() >= 9 && h.getMinutes() > 15;
  }).length;
  const absentCount  = users.length - presentCount;

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color={colors.accent} /></View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Team Overview</Text>
          <Text style={styles.subtitle}>{users[0]?.department || 'All departments'} · {users.length} members</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={14} color="#484F58" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search team members..."
            placeholderTextColor={colors.textHint}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Present</Text>
            <Text style={styles.statValue}>{presentCount}</Text>
            <Text style={[styles.statSub, { color: colors.success }]}>of {users.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Late</Text>
            <Text style={styles.statValue}>{lateCount}</Text>
            <Text style={[styles.statSub, { color: colors.warning }]}>today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Absent</Text>
            <Text style={styles.statValue}>{absentCount}</Text>
            <Text style={[styles.statSub, { color: colors.danger }]}>no check-in</Text>
          </View>
        </View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>Members · Today</Text>

        {/* Members list */}
        {filtered.map((u, i) => {
          const status   = getStatus(u.user_id);
          const rec      = getTodayAttendance(u.user_id);
          const avatarC  = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const initials = u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          return (
            <View key={u.user_id} style={styles.memberItem}>
              <View style={[styles.avatar, { backgroundColor: avatarC.bg, borderColor: avatarC.border }]}>
                <Text style={[styles.avatarText, { color: avatarC.text }]}>{initials}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{u.full_name}</Text>
                <Text style={styles.memberMeta}>{u.department} · {rec?.door_name || '—'}</Text>
              </View>
              <View style={styles.memberRight}>
                <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
                <Text style={styles.memberTime}>
                  {rec
                    ? new Date(rec.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'No check-in'}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

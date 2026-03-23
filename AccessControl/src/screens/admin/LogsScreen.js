import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import colors from '../../constants/colors';

const FILTERS = ['All', 'Granted', 'Denied', 'Face auth'];
const AVATAR_COLORS = [
  { bg: colors.bgDeep,    border: colors.accentDark,    text: colors.accentText },
  { bg: colors.successBg, border: colors.successBorder, text: colors.success },
  { bg: colors.warningBg, border: colors.warningBorder, text: colors.warning },
];

export default function LogsScreen() {
  const { accessToken } = useAuth();
  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [filter,    setFilter]    = useState('All');
  const [search,    setSearch]    = useState('');

  const headers = { Authorization: `Bearer ${accessToken}` };

  const fetchLogs = useCallback(async () => {
    try {
      const res = await axios.get(API.ALL_LOGS, { headers });
      setLogs(res.data.data || []);
    } catch (err) {
      console.log('Logs fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  const onRefresh = () => { setRefreshing(true); fetchLogs(); };

  const filtered = logs.filter(log => {
    const matchSearch = (log.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (log.door_name || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All'      ? true :
      filter === 'Granted'  ? log.result === 'GRANTED' :
      filter === 'Denied'   ? log.result !== 'GRANTED' :
      filter === 'Face auth'? log.face_auth_result !== 'SKIPPED' : true;
    return matchSearch && matchFilter;
  });

  // Group by date
  const grouped = filtered.reduce((acc, log) => {
    const date = new Date(log.timestamp).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (d.toDateString() === today)     return 'Today';
    if (d.toDateString() === yesterday) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
          <Text style={styles.title}>Access Logs</Text>
          <Text style={styles.subtitle}>{logs.length} entries · today {logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length}</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={14} color="#484F58" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search user or door..."
            placeholderTextColor={colors.textHint}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Grouped logs */}
        {Object.keys(grouped).length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>No logs found</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, dateLogs]) => (
            <View key={date}>
              <View style={styles.dateDivider}>
                <Text style={styles.dateDividerText}>
                  {formatDate(date).toUpperCase()} — {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                </Text>
              </View>
              {dateLogs.map((log, i) => {
                const initials = (log.full_name || 'UN').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const avatarC  = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const granted  = log.result === 'GRANTED';
                return (
                  <View key={log.log_id} style={styles.logItem}>
                    <View style={[styles.avatar, { backgroundColor: avatarC.bg, borderColor: avatarC.border }]}>
                      <Text style={[styles.avatarText, { color: avatarC.text }]}>{initials}</Text>
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={styles.logName} numberOfLines={1}>{log.full_name || 'Unknown'}</Text>
                      <Text style={styles.logDetail} numberOfLines={1}>
                        {log.door_name || 'Unknown door'} · {log.method || 'BLE'}
                        {log.face_auth_result !== 'SKIPPED' ? ' + Face' : ''}
                      </Text>
                    </View>
                    <View style={styles.logRight}>
                      <Text style={styles.logTime}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <View style={[styles.logBadge, granted ? styles.badgeGranted : styles.badgeDenied]}>
                        <Text style={[styles.logBadgeText, { color: granted ? colors.success : colors.danger }]}>
                          {granted ? 'Granted' : 'Denied'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  centered:  { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  header:    { marginBottom: 16 },
  title:     { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 3 },
  subtitle:  { color: colors.textMuted, fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13 },
  filterRow: { marginBottom: 16 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.borderMid, marginRight: 8 },
  filterPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { color: colors.textSecondary, fontSize: 12 },
  filterTextActive: { color: '#fff' },
  emptyCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  dateDivider: { paddingVertical: 6, marginBottom: 4 },
  dateDividerText: { color: '#484F58', fontSize: 11, letterSpacing: 0.3 },
  logItem:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.bgCard },
  avatar:    { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  avatarText: { fontSize: 11, fontWeight: '500' },
  logInfo:   { flex: 1, minWidth: 0 },
  logName:   { color: colors.textPrimary, fontSize: 12, fontWeight: '500', marginBottom: 2 },
  logDetail: { color: colors.textMuted, fontSize: 11 },
  logRight:  { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  logTime:   { color: colors.textMuted, fontSize: 11 },
  logBadge:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  badgeGranted: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  badgeDenied:  { backgroundColor: colors.dangerBg,  borderColor: colors.dangerBorder },
  logBadgeText: { fontSize: 10, fontWeight: '500' },
});

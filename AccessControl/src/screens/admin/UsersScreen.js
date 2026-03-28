import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

const FILTERS = ['All', 'Admin', 'Manager', 'Employee'];

export default function UsersScreen({ navigation }) {
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    safe:     { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
    header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    title:    { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 3 },
    subtitle: { color: colors.textMuted, fontSize: 13 },
    addBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14 },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13 },
    filterRow: { marginBottom: 16 },
    filterPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.borderMid, marginRight: 8 },
    filterPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    filterText: { color: colors.textSecondary, fontSize: 12 },
    filterTextActive: { color: '#fff' },
    userItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bgCard },
    avatar:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    avatarText: { fontSize: 13, fontWeight: '500' },
    userInfo: { flex: 1 },
    userName: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 2 },
    userMeta: { color: colors.textMuted, fontSize: 11 },
    userRight: { alignItems: 'flex-end', gap: 4 },
    rolePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
    roleText: { fontSize: 10, fontWeight: '500' },
    statusText: { fontSize: 10 },
  });

  const AVATAR_COLORS = [
    { bg: colors.bgDeep,    border: colors.accentDark,    text: colors.accentText },
    { bg: colors.successBg, border: colors.successBorder, text: colors.success },
    { bg: colors.warningBg, border: colors.warningBorder, text: colors.warning },
    { bg: colors.managerBg, border: colors.managerBorder, text: colors.managerColor },
  ];
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('All');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get(API.USERS);
      setUsers(res.data.data || []);
    } catch (err) {
      console.log('Users fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const getRoleInfo = (level) => {
    if (level >= 5) return { label: 'Admin',    color: colors.accentText,    bg: colors.bgDeep,    border: colors.accentDark };
    if (level >= 3) return { label: 'Manager',  color: colors.managerColor, bg: colors.managerBg, border: colors.managerBorder };
    return                  { label: 'Employee',color: colors.textMuted,    bg: colors.bgCard,    border: colors.border };
  };

  const filtered = users.filter(u => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    const roleInfo = getRoleInfo(u.access_level);
    const matchFilter = filter === 'All' || roleInfo.label === filter;
    return matchSearch && matchFilter;
  });

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
          <View>
            <Text style={styles.title}>Users</Text>
            <Text style={styles.subtitle}>{users.length} total · {users.filter(u => u.status === 'ACTIVE').length} active</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddUser')}
          >
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Add user</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={14} color="#484F58" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
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

        {/* Users list */}
        {filtered.map((u, i) => {
          const roleInfo = getRoleInfo(u.access_level);
          const avatarC  = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const initials = u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          const inactive = u.status === 'INACTIVE';
          return (
            <TouchableOpacity
              key={u.user_id}
              style={styles.userItem}
              onPress={() => navigation.navigate('FaceEnrollment', { user: u })}
            >
              <View style={[styles.avatar, { backgroundColor: inactive ? colors.bgCard : avatarC.bg, borderColor: inactive ? colors.border : avatarC.border }]}>
                <Text style={[styles.avatarText, { color: inactive ? '#484F58' : avatarC.text }]}>{initials}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, inactive && { color: '#484F58' }]}>{u.full_name}</Text>
                <Text style={styles.userMeta}>{u.department} · {u.email}</Text>
              </View>
              <View style={styles.userRight}>
                <View style={[styles.rolePill, { backgroundColor: roleInfo.bg, borderColor: roleInfo.border }]}>
                  <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
                </View>
                <Text style={[styles.statusText, { color: u.status === 'ACTIVE' ? colors.success : '#484F58' }]}>
                  ● {u.status === 'ACTIVE' ? 'Active' : u.status === 'PENDING' ? 'Pending' : 'Inactive'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

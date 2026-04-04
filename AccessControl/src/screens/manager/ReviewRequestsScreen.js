import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

const FILTERS = ['Pending', 'Approved', 'Rejected', 'All'];

export default function ReviewRequestsScreen({ navigation }) {
  const { accessToken } = useAuth();
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    safe:      { flex: 1, backgroundColor: colors.bg },
    centered:  { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
    header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    title:     { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 3 },
    subtitle:  { color: colors.textMuted, fontSize: 13 },
    pendingBadge: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    pendingBadgeText: { color: '#fff', fontSize: 13, fontWeight: '500' },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12 },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13 },
    filterRow: { marginBottom: 16 },
    filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.borderMid, marginRight: 8 },
    filterPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    filterText: { color: colors.textSecondary, fontSize: 12 },
    filterTextActive: { color: '#fff' },
    emptyCard: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
    emptyText: { color: colors.textMuted, fontSize: 14 },
    reqCard:   { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
    cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    typeIcon:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    typeName:  { color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 1 },
    reqDate:   { color: colors.textMuted, fontSize: 11 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '500' },
    userRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, backgroundColor: colors.bg, borderRadius: 10, padding: 10 },
    userAvatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
    userAvatarText: { color: colors.accentText, fontSize: 11, fontWeight: '500' },
    userName:  { color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 1 },
    userDept:  { color: colors.textMuted, fontSize: 11 },
    description: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 10 },
    reviewedBy: { color: colors.success, fontSize: 11, marginBottom: 10 },
    actions:   { flexDirection: 'row', gap: 10, marginTop: 4 },
    rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: 10, paddingVertical: 10 },
    rejectBtnText: { color: colors.danger, fontSize: 13, fontWeight: '500' },
    approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10 },
    approveBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  });

  const REQUEST_TYPES = {
    ACCESS_REQUEST:  { label: 'Access Request',  icon: 'lock-closed-outline',  color: colors.accentText,    bg: colors.bgDeep,    border: colors.accentDark },
    LEAVE:           { label: 'Leave Request',   icon: 'calendar-outline',     color: colors.success,       bg: colors.successBg, border: colors.successBorder },
    VISITOR_INVITE:  { label: 'Visitor Invite',  icon: 'people-outline',       color: colors.warning,       bg: colors.warningBg, border: colors.warningBorder },
    SCHEDULE_CHANGE: { label: 'Schedule Change', icon: 'time-outline',         color: colors.managerColor,  bg: colors.managerBg, border: colors.managerBorder },
    FACE_ENROLLMENT: { label: 'Face Enrollment', icon: 'scan-outline',         color: colors.accentText,    bg: colors.bgDeep,    border: colors.accentDark },
  };
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('Pending');
  const [search,     setSearch]     = useState('');
  const [reviewing,  setReviewing]  = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      const params = filter !== 'All' ? `?status=${filter.toUpperCase()}` : '';
      const res = await api.get(`${API.ALL_REQUESTS}${params}`);
      setRequests(res.data.data || []);
    } catch (err) {
      console.log('Requests fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const handleReview = (request, status) => {
    const action = status === 'APPROVED' ? 'Approve' : 'Reject';
    Alert.alert(
      `${action} request`,
      `Are you sure you want to ${action.toLowerCase()} ${request.full_name}'s ${REQUEST_TYPES[request.type]?.label || request.type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: status === 'APPROVED' ? 'default' : 'destructive',
          onPress: async () => {
            setReviewing(request.request_id);
            try {
              await api.patch(
                API.REVIEW_REQUEST(request.request_id),
                { status }
              );
              fetchRequests();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to review request.');
            } finally {
              setReviewing(null);
            }
          },
        },
      ]
    );
  };

  const filtered = requests.filter(r =>
    (r.full_name     || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.department    || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.description   || '').toLowerCase().includes(search.toLowerCase())
  );

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 0) return 'Just now';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const getStatusStyle = (status) => {
    if (status === 'APPROVED') return { color: colors.success,  bg: colors.successBg,  border: colors.successBorder };
    if (status === 'REJECTED') return { color: colors.danger,   bg: colors.dangerBg,   border: colors.dangerBorder };
    return                            { color: colors.warning,  bg: colors.warningBg,  border: colors.warningBorder };
  };

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color={colors.accent} /></View>
  );

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

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
            <Text style={styles.title}>Review Requests</Text>
            <Text style={styles.subtitle}>
              {pendingCount} pending · {requests.length} total
            </Text>
          </View>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={14} color="#484F58" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or department..."
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

        {/* Request cards */}
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {filter === 'Pending' ? 'No pending requests' : 'No requests found'}
            </Text>
          </View>
        ) : (
          filtered.map((req) => {
            const typeInfo   = REQUEST_TYPES[req.type] || REQUEST_TYPES.ACCESS_REQUEST;
            const statusInfo = getStatusStyle(req.status);
            const isPending  = req.status === 'PENDING';
            const isReviewing = reviewing === req.request_id;

            return (
              <View key={req.request_id} style={styles.reqCard}>
                {/* Card header */}
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: typeInfo.bg, borderColor: typeInfo.border }]}>
                      <Ionicons name={typeInfo.icon} size={14} color={typeInfo.color} />
                    </View>
                    <View>
                      <Text style={styles.typeName}>{typeInfo.label}</Text>
                      <Text style={styles.reqDate}>{timeAgo(req.created_at)}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusInfo.bg, borderColor: statusInfo.border }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{req.status}</Text>
                  </View>
                </View>

                {/* User info */}
                <View style={styles.userRow}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {(req.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.userName}>{req.full_name || 'Unknown'}</Text>
                    <Text style={styles.userDept}>{req.department || '—'}</Text>
                  </View>
                </View>

                {/* Description */}
                {req.description && (
                  <Text style={styles.description} numberOfLines={3}>{req.description}</Text>
                )}

                {/* Reviewed by */}
                {req.reviewed_by_name && (
                  <Text style={styles.reviewedBy}>
                    Reviewed by {req.reviewed_by_name}
                  </Text>
                )}

                {/* Action buttons — only show for pending */}
                {isPending && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.rejectBtn, isReviewing && { opacity: 0.6 }]}
                      onPress={() => handleReview(req, 'REJECTED')}
                      disabled={isReviewing}
                    >
                      {isReviewing
                        ? <ActivityIndicator size="small" color={colors.danger} />
                        : <>
                            <Ionicons name="close" size={14} color={colors.danger} />
                            <Text style={styles.rejectBtnText}>Reject</Text>
                          </>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.approveBtn, isReviewing && { opacity: 0.6 }]}
                      onPress={() => handleReview(req, 'APPROVED')}
                      disabled={isReviewing}
                    >
                      {isReviewing
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                            <Text style={styles.approveBtnText}>Approve</Text>
                          </>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

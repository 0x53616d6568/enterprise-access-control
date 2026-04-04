import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

export default function RequestsScreen() {
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    safe:     { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
    header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    title:    { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 3 },
    subtitle: { color: colors.textMuted, fontSize: 13 },
    newBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    newBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
    filterRow: { marginBottom: 20 },
    filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.borderMid, marginRight: 8 },
    filterPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    filterText: { color: colors.textSecondary, fontSize: 12 },
    filterTextActive: { color: '#fff' },
    emptyCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 24, alignItems: 'center', gap: 8 },
    emptyText: { color: colors.textMuted, fontSize: 13 },
    reqCard:  { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
    reqTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    reqLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reqIcon:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    reqTypeName: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
    reqDate:  { color: colors.textMuted, fontSize: 11 },
    statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '500' },
    reqDesc:  { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 10 },
    reqFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    reqFooterLeft:  { color: colors.textMuted, fontSize: 11 },
    reqFooterRight: { color: colors.textMuted, fontSize: 11 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '500' },
    modalLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    typeOpt: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12 },
    typeOptText: { color: colors.textMuted, fontSize: 12, flex: 1 },
    modalInput: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, color: colors.textPrimary, fontSize: 13, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 },
    submitBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  });

  const REQUEST_TYPES = [
    { key: 'ACCESS_REQUEST',  label: 'Access Request',   icon: 'lock-closed-outline',   color: colors.accent,   bg: colors.bgDeep,      border: colors.accentDark },
    { key: 'LEAVE',           label: 'Leave Request',    icon: 'calendar-outline',      color: colors.success,  bg: colors.successBg,   border: colors.successBorder },
    { key: 'VISITOR_INVITE',  label: 'Visitor Invite',   icon: 'people-outline',        color: colors.warning,  bg: colors.warningBg,   border: colors.warningBorder },
    { key: 'SCHEDULE_CHANGE', label: 'Schedule Change',  icon: 'time-outline',          color: colors.managerColor, bg: colors.managerBg, border: colors.managerBorder },
  ];
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [newType,    setNewType]    = useState('ACCESS_REQUEST');
  const [newDesc,    setNewDesc]    = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get(API.MY_REQUESTS);
      setRequests(res.data.data || []);
    } catch (err) {
      console.log('Requests fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const submitRequest = async () => {
    if (!newDesc.trim()) {
      Alert.alert('Missing info', 'Please add a description.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(API.MY_REQUESTS.replace('/me', ''), { type: newType, description: newDesc });
      setModalVisible(false);
      setNewDesc('');
      fetchRequests();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = requests.filter(r => {
    if (filter === 'All')      return true;
    if (filter === 'Pending')  return r.status === 'PENDING';
    if (filter === 'Approved') return r.status === 'APPROVED';
    if (filter === 'Rejected') return r.status === 'REJECTED';
    return true;
  });

  const getTypeInfo = (key) => REQUEST_TYPES.find(t => t.key === key) || REQUEST_TYPES[0];

  const getStatusStyle = (status) => {
    if (status === 'APPROVED') return { color: colors.success,  bg: colors.successBg,  border: colors.successBorder };
    if (status === 'REJECTED') return { color: colors.danger,   bg: colors.dangerBg,   border: colors.dangerBorder };
    return                            { color: colors.warning,  bg: colors.warningBg,  border: colors.warningBorder };
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 0) return 'Just now';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
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
          <View>
            <Text style={styles.title}>Requests</Text>
            <Text style={styles.subtitle}>{requests.length} total · {requests.filter(r => r.status === 'PENDING').length} pending</Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
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
            <Ionicons name="document-text-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>No requests found</Text>
          </View>
        ) : (
          filtered.map((req, i) => {
            const typeInfo   = getTypeInfo(req.type);
            const statusInfo = getStatusStyle(req.status);
            return (
              <View key={i} style={styles.reqCard}>
                <View style={styles.reqTop}>
                  <View style={styles.reqLeft}>
                    <View style={[styles.reqIcon, { backgroundColor: typeInfo.bg, borderColor: typeInfo.border }]}>
                      <Ionicons name={typeInfo.icon} size={14} color={typeInfo.color} />
                    </View>
                    <View>
                      <Text style={styles.reqTypeName}>{typeInfo.label}</Text>
                      <Text style={styles.reqDate}>
                        {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusInfo.bg, borderColor: statusInfo.border }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{req.status}</Text>
                  </View>
                </View>
                <Text style={styles.reqDesc} numberOfLines={2}>{req.description}</Text>
                <View style={styles.reqFooter}>
                  <Text style={styles.reqFooterLeft}>{timeAgo(req.created_at)}</Text>
                  <Text style={[styles.reqFooterRight, req.reviewed_by_name && { color: colors.success }]}>
                    {req.reviewed_by_name ? `Reviewed by ${req.reviewed_by_name}` : 'Awaiting review'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* New Request Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New request</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Request type</Text>
            <View style={styles.typeGrid}>
              {REQUEST_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeOpt, newType === t.key && { borderColor: colors.accent, backgroundColor: colors.bgDeep }]}
                  onPress={() => setNewType(t.key)}
                >
                  <Ionicons name={t.icon} size={16} color={newType === t.key ? colors.accent : colors.textMuted} />
                  <Text style={[styles.typeOptText, newType === t.key && { color: colors.accentText }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe your request..."
              placeholderTextColor={colors.textHint}
              multiline
              numberOfLines={4}
              value={newDesc}
              onChangeText={setNewDesc}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={submitRequest}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Submit request</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

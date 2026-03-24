import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Modal, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import colors from '../../constants/colors';

export default function VisitorsScreen() {
  const { accessToken } = useAuth();
  const [visitors,   setVisitors]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [qrModal,    setQrModal]    = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [fullName,   setFullName]   = useState('');
  const [validFrom,  setValidFrom]  = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [revoking,   setRevoking]   = useState(null);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const fetchVisitors = useCallback(async () => {
    try {
      const res = await axios.get(API.MY_VISITORS, { headers });
      setVisitors(res.data.data || []);
    } catch (err) {
      console.log('Visitors fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchVisitors(); }, [fetchVisitors]);
  const onRefresh = () => { setRefreshing(true); fetchVisitors(); };

  const handleInvite = async () => {
    if (!fullName.trim()) {
      Alert.alert('Missing info', 'Visitor name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(API.MY_VISITORS.replace('/me', ''), {
        full_name:   fullName.trim(),
        valid_from:  validFrom  || null,
        valid_until: validUntil || null,
      }, { headers });
      setModalVisible(false);
      setFullName('');
      setValidFrom('');
      setValidUntil('');
      fetchVisitors();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to invite visitor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = (visitor) => {
    Alert.alert(
      'Revoke access',
      `Revoke access for ${visitor.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke', style: 'destructive',
          onPress: async () => {
            setRevoking(visitor.visitor_id);
            try {
              await axios.patch(API.REVOKE_VISITOR(visitor.visitor_id), {}, { headers });
              fetchVisitors();
            } catch (err) {
              Alert.alert('Error', 'Failed to revoke access.');
            } finally {
              setRevoking(null);
            }
          }
        }
      ]
    );
  };

  const getStatusStyle = (status) => {
    if (status === 'ACTIVE')  return { color: colors.success, bg: colors.successBg, border: colors.successBorder };
    if (status === 'EXPIRED') return { color: colors.textMuted, bg: colors.bgCard,  border: colors.border };
    if (status === 'USED')    return { color: colors.accent,  bg: colors.bgDeep,    border: colors.accentDark };
    return { color: colors.textMuted, bg: colors.bgCard, border: colors.border };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color={colors.accent} /></View>
  );

  const activeCount = visitors.filter(v => v.status === 'ACTIVE').length;

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
            <Text style={styles.title}>Visitors</Text>
            <Text style={styles.subtitle}>{activeCount} active · {visitors.length} total</Text>
          </View>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Visitors list */}
        {visitors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No visitors yet</Text>
            <Text style={styles.emptySubText}>Invite a visitor to get started</Text>
          </View>
        ) : (
          visitors.map((visitor) => {
            const statusStyle = getStatusStyle(visitor.status);
            const isRevoking  = revoking === visitor.visitor_id;
            return (
              <View key={visitor.visitor_id} style={styles.visitorCard}>
                <View style={styles.cardTop}>
                  <View style={styles.visitorLeft}>
                    <View style={styles.visitorAvatar}>
                      <Ionicons name="person-outline" size={18} color={colors.accentText} />
                    </View>
                    <View>
                      <Text style={styles.visitorName}>{visitor.full_name}</Text>
                      <Text style={styles.visitorDates}>
                        {formatDate(visitor.valid_from)} → {formatDate(visitor.valid_until)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>{visitor.status}</Text>
                  </View>
                </View>

                <View style={styles.tokenRow}>
                  <Ionicons name="qr-code-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.tokenText} numberOfLines={1}>
                    {visitor.qr_token ? `${visitor.qr_token.slice(0, 20)}...` : 'No token'}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.qrBtn}
                    onPress={() => { setSelectedVisitor(visitor); setQrModal(true); }}
                  >
                    <Ionicons name="qr-code-outline" size={14} color={colors.accentText} />
                    <Text style={styles.qrBtnText}>View QR</Text>
                  </TouchableOpacity>
                  {visitor.status === 'ACTIVE' && (
                    <TouchableOpacity
                      style={[styles.revokeBtn, isRevoking && { opacity: 0.6 }]}
                      onPress={() => handleRevoke(visitor)}
                      disabled={isRevoking}
                    >
                      {isRevoking
                        ? <ActivityIndicator size="small" color={colors.danger} />
                        : <Text style={styles.revokeBtnText}>Revoke</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite visitor</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Visitor name</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={colors.textHint}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.fieldLabel}>Valid from (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textHint}
              value={validFrom}
              onChangeText={setValidFrom}
            />

            <Text style={styles.fieldLabel}>Valid until (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textHint}
              value={validUntil}
              onChangeText={setValidUntil}
            />

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={14} color={colors.accentText} />
              <Text style={styles.infoText}>A unique QR code will be generated for your visitor to use at the entrance.</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleInvite}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Send invite</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal visible={qrModal} transparent animationType="fade">
        <View style={styles.qrOverlay}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>{selectedVisitor?.full_name}</Text>
            <Text style={styles.qrSubtitle}>Visitor QR Code</Text>

            <View style={styles.qrBox}>
              <Ionicons name="qr-code-outline" size={120} color={colors.textPrimary} />
            </View>

            <Text style={styles.qrToken} numberOfLines={2}>
              {selectedVisitor?.qr_token}
            </Text>

            <View style={styles.qrDates}>
              <Text style={styles.qrDateText}>Valid: {formatDate(selectedVisitor?.valid_from)} → {formatDate(selectedVisitor?.valid_until)}</Text>
            </View>

            <TouchableOpacity style={styles.closeQrBtn} onPress={() => setQrModal(false)}>
              <Text style={styles.closeQrText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  centered:  { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:     { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 3 },
  subtitle:  { color: colors.textMuted, fontSize: 13 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  inviteBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  emptyCard: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
  emptyText: { color: colors.textPrimary, fontSize: 16, fontWeight: '500' },
  emptySubText: { color: colors.textMuted, fontSize: 13 },
  visitorCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  visitorLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  visitorAvatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
  visitorName: { color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 2 },
  visitorDates: { color: colors.textMuted, fontSize: 11 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '500' },
  tokenRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 8, padding: 10, marginBottom: 12 },
  tokenText: { color: colors.textMuted, fontSize: 11, flex: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardActions: { flexDirection: 'row', gap: 8 },
  qrBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 10, paddingVertical: 9 },
  qrBtnText: { color: colors.accentText, fontSize: 13, fontWeight: '500' },
  revokeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: 10, paddingVertical: 9 },
  revokeBtnText: { color: colors.danger, fontSize: 13, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '500' },
  fieldLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  input:     { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: colors.textPrimary, fontSize: 13, marginBottom: 14 },
  infoBox:   { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 10, padding: 12, marginBottom: 20 },
  infoText:  { color: colors.accentText, fontSize: 12, lineHeight: 18, flex: 1 },
  submitBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  qrOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  qrCard:    { backgroundColor: colors.bgCard, borderRadius: 24, padding: 28, alignItems: 'center', width: '100%' },
  qrTitle:   { color: colors.textPrimary, fontSize: 20, fontWeight: '500', marginBottom: 4 },
  qrSubtitle: { color: colors.textMuted, fontSize: 13, marginBottom: 24 },
  qrBox:     { backgroundColor: colors.bg, borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  qrToken:   { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginBottom: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  qrDates:   { marginBottom: 20 },
  qrDateText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  closeQrBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  closeQrText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});

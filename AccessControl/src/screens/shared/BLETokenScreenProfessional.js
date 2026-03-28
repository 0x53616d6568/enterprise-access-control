import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
  FlatList, Clipboard, Share, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

export default function BLETokenScreen({ navigation }) {
  const { accessToken } = useAuth();
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    backBtn: { width: 36, height: 36, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title: { color: colors.textPrimary, fontSize: 20, fontWeight: '600', marginBottom: 2 },
    subtitle: { color: colors.textMuted, fontSize: 12 },
    sectionLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 12, fontWeight: '600' },
    alertCard: { backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 12, padding: 14, marginBottom: 20 },
    alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    alertTitle: { color: colors.warning, fontSize: 13, fontWeight: '600' },
    alertText: { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
    emptyCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 32, alignItems: 'center', gap: 8, marginBottom: 16 },
    emptyText: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
    emptySubtext: { color: colors.textMuted, fontSize: 12 },
    tokenItem: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 10 },
    tokenItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    tokenItemInfo: { flex: 1 },
    tokenDeviceName: { color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 2 },
    tokenDate: { color: colors.textMuted, fontSize: 11 },
    tokenExpiryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderRadius: 8 },
    tokenExpiryText: { fontSize: 11, fontWeight: '500' },
    tokenActions: { flexDirection: 'row', gap: 8 },
    actionBtnWarning: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 8 },
    actionBtnDanger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: 8 },
    actionBtnTextWarning: { color: colors.warning, fontSize: 12, fontWeight: '500' },
    actionBtnTextDanger: { color: colors.danger, fontSize: 12, fontWeight: '500' },
    createCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 16 },
    createLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 8 },
    textInput: { backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, color: colors.textPrimary, fontSize: 14, marginBottom: 12 },
    createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 12 },
    createBtnText: { color: colors.bgCard, fontSize: 14, fontWeight: '600' },
    emergencyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.danger, borderRadius: 8, paddingVertical: 12 },
    emergencyBtnText: { color: colors.bgCard, fontSize: 14, fontWeight: '600' },
    emergencyHint: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 6, marginBottom: 16 },
    infoCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', marginBottom: 40 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoText: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, flex: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.bg, width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
    modalBody: { alignItems: 'center', gap: 16 },
    successIcon: { marginBottom: 8 },
    modalMessage: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
    tokenDisplayBox: { width: '100%', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 12, padding: 14, gap: 8, marginVertical: 8 },
    tokenDisplayLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
    tokenDisplay: { color: colors.accent, fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
    tokenDisplayHint: { color: colors.textMuted, fontSize: 11, lineHeight: 14 },
    expiryInfo: { color: colors.textSecondary, fontSize: 11 },
    modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
    modalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
    modalBtnClose: { backgroundColor: colors.accent, borderColor: colors.accent },
    modalBtnText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  });

  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [tokensNeedingRotation, setTokensNeedingRotation] = useState([]);
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenData, setNewTokenData] = useState(null);
  const [deviceName, setDeviceName] = useState('My Device');
  const [rotationCheck, setRotationCheck] = useState(null);

  // Fetch all tokens and rotation status
  const fetchTokens = useCallback(async () => {
    try {
      const [tokensRes, rotationRes] = await Promise.all([
        api.get(API.BLE_TOKENS || `${API.BASE}/auth/ble-tokens`),
        api.get(API.BASE + '/auth/ble-token/rotation-check'),
      ]);

      setTokens(tokensRes.data?.data?.tokens || []);
      setRotationCheck(rotationRes.data?.data);
      setTokensNeedingRotation(rotationRes.data?.data?.tokensNeedingRotation || []);
    } catch (err) {
      console.log('Token fetch error:', err.message);
      Alert.alert('Error', 'Failed to load tokens');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTokens();
  };

  // Create new token
  const handleCreateToken = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(API.BLE_TOKEN + `?deviceName=${encodeURIComponent(deviceName)}`);
      setNewTokenData({
        ...res.data?.data,
        displayToken: res.data?.data?.displayToken || 'Token created',
      });
      setShowNewTokenModal(true);
      fetchTokens(); // Refresh list
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  // Rotate specific token
  const handleRotateToken = (tokenId) => {
    Alert.alert(
      'Rotate Token?',
      'This will invalidate the current token and create a new one. Your device will need to reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate',
          style: 'destructive',
          onPress: async () => {
            setRotating(true);
            try {
              const res = await api.post(API.BLE_TOKEN_ROTATE, { tokenId });
              setNewTokenData({
                ...res.data?.data,
                isRotation: true,
              });
              setShowNewTokenModal(true);
              fetchTokens();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to rotate token');
            } finally {
              setRotating(false);
            }
          },
        },
      ]
    );
  };

  // Revoke specific token
  const handleRevokeToken = (tokenId, deviceName) => {
    Alert.alert(
      'Revoke Token?',
      `This will disable access for "${deviceName}". This action cannot be undone easily.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevoking(true);
            try {
              await api.post(API.BASE + '/auth/ble-token/revoke', {
                tokenId,
                reason: 'USER_REQUESTED',
              });
              Alert.alert('Success', 'Token has been revoked');
              fetchTokens();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to revoke token');
            } finally {
              setRevoking(false);
            }
          },
        },
      ]
    );
  };

  // Emergency: revoke all tokens
  const handleRevokeAll = () => {
    Alert.alert(
      '⚠️ Emergency Revocation',
      'This will disable all your BLE tokens. You will need to generate new ones to regain access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All',
          style: 'destructive',
          onPress: async () => {
            setRevoking(true);
            try {
              await api.post(API.BASE + '/auth/ble-tokens/revoke-all', {});
              Alert.alert('Success', 'All tokens have been revoked');
              fetchTokens();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to revoke tokens');
            } finally {
              setRevoking(false);
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Token copied to clipboard');
  };

  const getExpiryStatus = (expiresAt) => {
    const diff = new Date(expiresAt) - Date.now();
    const days = Math.floor(diff / 86400000);
    if (days < 0) return { label: 'Expired', color: colors.danger, icon: 'alert-circle' };
    if (days <= 7) return { label: `${days}d left`, color: colors.warning, icon: 'alert' };
    return { label: `${days}d left`, color: colors.success, icon: 'checkmark-circle' };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>BLE Security</Text>
            <Text style={styles.subtitle}>Manage your access tokens</Text>
          </View>
        </View>

        {/* Rotation Alerts */}
        {tokensNeedingRotation.length > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="information-circle" size={18} color={colors.warning} />
              <Text style={styles.alertTitle}>Tokens Need Rotation</Text>
            </View>
            <Text style={styles.alertText}>
              {tokensNeedingRotation.length} token(s) have been active for 90+ days and should be rotated for security.
            </Text>
          </View>
        )}

        {/* Active Tokens */}
        <Text style={styles.sectionLabel}>Active Tokens ({tokens.length})</Text>
        {tokens.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bluetooth-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No active tokens</Text>
            <Text style={styles.emptySubtext}>Create your first token below to get started</Text>
          </View>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={tokens}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const expiry = getExpiryStatus(item.expires_at);
              return (
                <View style={styles.tokenItem}>
                  <View style={styles.tokenItemTop}>
                    <View style={styles.tokenItemInfo}>
                      <Text style={styles.tokenDeviceName}>{item.device_name}</Text>
                      <Text style={styles.tokenDate}>
                        Created {new Date(item.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={[styles.tokenExpiryBadge, { borderColor: expiry.color }]}>
                      <Ionicons name={expiry.icon} size={12} color={expiry.color} />
                      <Text style={[styles.tokenExpiryText, { color: expiry.color }]}>
                        {expiry.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tokenActions}>
                    {tokensNeedingRotation.some((t) => t.id === item.id) && (
                      <TouchableOpacity
                        style={styles.actionBtnWarning}
                        onPress={() => handleRotateToken(item.id)}
                        disabled={rotating}
                      >
                        <Ionicons name="refresh-outline" size={14} color={colors.warning} />
                        <Text style={styles.actionBtnTextWarning}>Rotate</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionBtnDanger}
                      onPress={() => handleRevokeToken(item.id, item.device_name)}
                      disabled={revoking}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      <Text style={styles.actionBtnTextDanger}>Revoke</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Create New Token */}
        <Text style={styles.sectionLabel}>Create New Token</Text>
        <View style={styles.createCard}>
          <Text style={styles.createLabel}>Device Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., iPhone 13, Office Door"
            placeholderTextColor={colors.textMuted}
            value={deviceName}
            onChangeText={setDeviceName}
          />
          <TouchableOpacity
            style={[styles.createBtn, loading && { opacity: 0.6 }]}
            onPress={handleCreateToken}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.bgCard} />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={16} color={colors.bgCard} />
                <Text style={styles.createBtnText}>Create Token</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Emergency Revoke */}
        <Text style={styles.sectionLabel}>Emergency</Text>
        <TouchableOpacity
          style={[styles.emergencyBtn, revoking && { opacity: 0.6 }]}
          onPress={handleRevokeAll}
          disabled={revoking}
        >
          {revoking ? (
            <ActivityIndicator color={colors.bgCard} />
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={16} color={colors.bgCard} />
              <Text style={styles.emergencyBtnText}>Revoke All Tokens</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.emergencyHint}>
          Use if you suspect a security breach. All devices will be disconnected.
        </Text>

        {/* How it works */}
        <Text style={styles.sectionLabel}>How It Works</Text>
        <View style={styles.infoCard}>
          {[
            { icon: 'lock-closed-outline', text: 'Tokens are AES-256 encrypted and hashed for security' },
            { icon: 'sync-outline', text: 'Rotate tokens every 90 days for best security practices' },
            { icon: 'time-outline', text: 'Tokens expire after 365 days and can\'t be renewed' },
            { icon: 'alert-circle-outline', text: 'Audit log tracks all token actions for compliance' },
          ].map((item, i) => (
            <View key={i} style={[styles.infoRow, i === 3 && { borderBottomWidth: 0 }]}>
              <Ionicons name={item.icon} size={16} color={colors.accent} />
              <Text style={styles.infoText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* New Token Modal */}
      <Modal
        visible={showNewTokenModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNewTokenModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNewTokenModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {newTokenData?.isRotation ? 'Token Rotated' : 'Token Created'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalBody}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>

              <Text style={styles.modalMessage}>
                {newTokenData?.isRotation
                  ? 'Your token has been successfully rotated. The old token is now invalid.'
                  : 'Your new access token has been created successfully.'}
              </Text>

              <View style={styles.tokenDisplayBox}>
                <Text style={styles.tokenDisplayLabel}>Your Token</Text>
                <Text style={styles.tokenDisplay}>{newTokenData?.displayToken}</Text>
                <Text style={styles.tokenDisplayHint}>
                  Save this in a secure location. You won't see it again after closing this dialog.
                </Text>
              </View>

              <Text style={styles.expiryInfo}>
                Expires: {new Date(newTokenData?.expiresAt).toLocaleDateString()}
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => copyToClipboard(newTokenData?.displayToken)}
                >
                  <Ionicons name="copy-outline" size={16} color={colors.accent} />
                  <Text style={styles.modalBtnText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnClose]}
                  onPress={() => setShowNewTokenModal(false)}
                >
                  <Ionicons name="checkmark" size={16} color={colors.bgCard} />
                  <Text style={[styles.modalBtnText, { color: colors.bgCard }]}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

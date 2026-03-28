import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
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
    safe:        { flex: 1, backgroundColor: colors.bg },
    centered:    { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container:   { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
    header:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    backBtn:     { width: 34, height: 34, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title:       { color: colors.textPrimary, fontSize: 20, fontWeight: '500', letterSpacing: -0.4, marginBottom: 2 },
    subtitle:    { color: colors.textMuted, fontSize: 12 },
    tokenCard:   { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 24 },
    tokenTop:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    tokenIconWrap: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
    tokenInfo:   { flex: 1 },
    tokenLabel:  { color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 2 },
    tokenStatus: { color: colors.success, fontSize: 12 },
    expiryBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    expiryText:  { fontSize: 11, fontWeight: '500' },
    tokenDetails:{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, gap: 0 },
    tokenRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    tokenRowLabel: { color: colors.textMuted, fontSize: 12 },
    tokenRowValue: { color: colors.textPrimary, fontSize: 12, fontWeight: '500' },
    sectionLabel:  { color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
    infoCard:    { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
    infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoIconWrap:{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
    infoText:    { color: colors.textSecondary, fontSize: 12, lineHeight: 18, flex: 1 },
    rotateBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: 12, paddingVertical: 14, marginBottom: 10 },
    rotateBtnText: { color: colors.danger, fontSize: 14, fontWeight: '500' },
    rotateHint:  { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  });

  const [token,      setToken]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rotating,   setRotating]   = useState(false);

  const fetchToken = useCallback(async () => {
    try {
      const res = await api.get(API.BLE_TOKEN);
      setToken(res.data.data || null);
    } catch (err) {
      console.log('BLE token fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchToken(); }, [fetchToken]);
  const onRefresh = () => { setRefreshing(true); fetchToken(); };

  const handleRotate = () => {
    Alert.alert(
      'Rotate BLE Token',
      'This will invalidate your current token and generate a new one. Your phone will need to reconnect to all doors.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate', style: 'destructive',
          onPress: async () => {
            setRotating(true);
            try {
              const res = await api.post(API.BLE_TOKEN_ROTATE, { tokenId: token.token_id });
              setToken(res.data.data);
              Alert.alert('Token rotated', 'Your BLE token has been refreshed successfully.');
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to rotate token.');
            } finally {
              setRotating(false);
            }
          },
        },
      ]
    );
  };

  const getExpiryInfo = () => {
    if (!token?.expires_at) return { label: 'Unknown', color: colors.textMuted, urgent: false };
    const diff = new Date(token.expires_at) - Date.now();
    const days = Math.floor(diff / 86400000);
    if (days < 0)  return { label: 'Expired',        color: colors.danger,  urgent: true };
    if (days < 3)  return { label: `${days}d left`,  color: colors.danger,  urgent: true };
    if (days < 7)  return { label: `${days}d left`,  color: colors.warning, urgent: false };
    return               { label: `${days}d left`,  color: colors.success, urgent: false };
  };

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color={colors.accent} /></View>
  );

  const expiry = getExpiryInfo();

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
            <Text style={styles.title}>Security & BLE Token</Text>
            <Text style={styles.subtitle}>Manage your access credentials</Text>
          </View>
        </View>

        {/* Token status card */}
        <View style={[styles.tokenCard, expiry.urgent && { borderColor: colors.dangerBorder }]}>
          <View style={styles.tokenTop}>
            <View style={styles.tokenIconWrap}>
              <Ionicons name="bluetooth-outline" size={22} color={colors.accentText} />
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenLabel}>BLE Access Token</Text>
              <Text style={styles.tokenStatus}>
                {token ? 'Active & Broadcasting' : 'No token assigned'}
              </Text>
            </View>
            <View style={[
              styles.expiryBadge,
              { backgroundColor: expiry.urgent ? colors.dangerBg : colors.successBg,
                borderColor: expiry.urgent ? colors.dangerBorder : colors.successBorder }
            ]}>
              <Text style={[styles.expiryText, { color: expiry.color }]}>{expiry.label}</Text>
            </View>
          </View>

          {token && (
            <View style={styles.tokenDetails}>
              <View style={styles.tokenRow}>
                <Text style={styles.tokenRowLabel}>Token ID</Text>
                <Text style={styles.tokenRowValue}>#{token.token_id || '—'}</Text>
              </View>
              <View style={styles.tokenRow}>
                <Text style={styles.tokenRowLabel}>Issued</Text>
                <Text style={styles.tokenRowValue}>
                  {token.created_at
                    ? new Date(token.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </Text>
              </View>
              <View style={[styles.tokenRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.tokenRowLabel}>Expires</Text>
                <Text style={[styles.tokenRowValue, { color: expiry.color }]}>
                  {token.expires_at
                    ? new Date(token.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* How it works */}
        <Text style={styles.sectionLabel}>How it works</Text>
        <View style={styles.infoCard}>
          {[
            { icon: 'radio-outline',       text: 'Your phone broadcasts a BLE signal near access points' },
            { icon: 'hardware-chip-outline',text: 'The Raspberry Pi at each door detects and validates your token' },
            { icon: 'lock-open-outline',   text: 'If valid, the door opens instantly without any action needed' },
            { icon: 'shield-outline',      text: 'Your raw token is never stored — only a secure hash' },
          ].map((item, i, arr) => (
            <View key={i} style={[styles.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.infoIconWrap}>
                <Ionicons name={item.icon} size={14} color={colors.accentText} />
              </View>
              <Text style={styles.infoText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Rotate token */}
        <Text style={styles.sectionLabel}>Token Management</Text>
        <TouchableOpacity
          style={[styles.rotateBtn, rotating && { opacity: 0.7 }]}
          onPress={handleRotate}
          disabled={rotating}
        >
          {rotating
            ? <ActivityIndicator color={colors.danger} />
            : <>
                <Ionicons name="refresh-outline" size={16} color={colors.danger} />
                <Text style={styles.rotateBtnText}>Rotate token</Text>
              </>
          }
        </TouchableOpacity>
        <Text style={styles.rotateHint}>
          Use this if you suspect your token has been compromised or if you're having access issues.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}
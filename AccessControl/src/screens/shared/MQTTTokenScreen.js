import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';
import { mqttTokenService } from '../../services/mqttService';

export default function MQTTTokenScreen({ navigation }) {
  const { user } = useAuth();
  const colors = useThemeColors();
  
  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { padding: 24 },
    header: { marginBottom: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    title: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
    subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    infoCard: { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 14, padding: 16, marginBottom: 24, flexDirection: 'row', gap: 12 },
    infoIcon: { width: 40, height: 40, backgroundColor: colors.accent, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    infoText: { flex: 1, color: colors.textPrimary, fontSize: 13, lineHeight: 18 },
    sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionLabel: { flex: 1 },
    tokenCount: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: '600' },
    tokenCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 12, overflow: 'hidden' },
    tokenHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    tokenIcon: { width: 36, height: 36, backgroundColor: colors.accentBg, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    tokenInfo: { flex: 1 },
    tokenDevice: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 2 },
    tokenMeta: { color: colors.textMuted, fontSize: 11 },
    tokenDetails: { backgroundColor: colors.bgDeep, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10, paddingTop: 10 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
    detailLabel: { color: colors.textMuted, fontSize: 11 },
    detailValue: { color: colors.textPrimary, fontSize: 11, fontWeight: '500' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.successBg },
    statusText: { color: colors.success, fontSize: 10, fontWeight: '600' },
    revokeBtn: { marginTop: 10, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: 8, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
    revokeBtnText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyIcon: { marginBottom: 12 },
    emptyText: { color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 4 },
    emptySubtext: { color: colors.textMuted, fontSize: 12 },
  });

  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mqttTokenService.getTokens();
      setTokens(data || []);
    } catch (err) {
      console.log('Error fetching tokens:', err.message);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTokens();
    }, [fetchTokens])
  );

  const handleRevokeToken = (tokenId, deviceName) => {
    Alert.alert(
      'Revoke Token',
      `Remove access for "${deviceName}"?\n\nYou'll need to generate a new token to regain access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              setRevoking(tokenId);
              await mqttTokenService.revokeToken(tokenId, 'USER_REQUESTED');
              setTokens(tokens.filter(t => t.id !== tokenId));
              Alert.alert('Success', 'Token revoked');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to revoke token');
            } finally {
              setRevoking(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, { justifyContent: 'center', flex: 1 }]}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Ionicons name="key" size={28} color={colors.accent} />
            <Text style={styles.title}>Access Tokens</Text>
          </View>
          <Text style={styles.subtitle}>Manage your MQTT tokens for door access requests</Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={24} color="#fff" />
          </View>
          <Text style={styles.infoText}>
            Tokens are automatically generated and manage your door access requests. Revoke a token if your device is lost or compromised.
          </Text>
        </View>

        {/* Active Tokens */}
        <View style={styles.sectionTitle}>
          <View style={styles.sectionLabel}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Active Tokens</Text>
          </View>
          <Text style={styles.tokenCount}>{tokens.length}</Text>
        </View>

        {tokens.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="lock-open" size={48} color={colors.accent} />
            </View>
            <Text style={styles.emptyText}>No Active Tokens</Text>
            <Text style={styles.emptySubtext}>Tokens are auto-generated on first login</Text>
          </View>
        ) : (
          tokens.map((token) => (
            <View key={token.id} style={styles.tokenCard}>
              {/* Token Header */}
              <View style={styles.tokenHeader}>
                <View style={styles.tokenIcon}>
                  <Ionicons name="phone-portrait" size={18} color={colors.accent} />
                </View>
                <View style={styles.tokenInfo}>
                  <Text style={styles.tokenDevice}>{token.device_name || 'Mobile Device'}</Text>
                  <Text style={styles.tokenMeta}>Created {new Date(token.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>

              {/* Token Details */}
              <View style={styles.tokenDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expires</Text>
                  <Text style={styles.detailValue}>{new Date(token.expires_at).toLocaleDateString()}</Text>
                </View>
                
                {token.last_used_at && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Last Used</Text>
                    <Text style={styles.detailValue}>{new Date(token.last_used_at).toLocaleDateString()}</Text>
                  </View>
                )}
              </View>

              {/* Revoke Button */}
              <TouchableOpacity
                style={styles.revokeBtn}
                onPress={() => handleRevokeToken(token.id, token.device_name)}
                disabled={revoking === token.id}
              >
                {revoking === token.id ? (
                  <>
                    <ActivityIndicator color={colors.danger} size="small" />
                    <Text style={styles.revokeBtnText}>Revoking...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    <Text style={styles.revokeBtnText}>Revoke Token</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
    title: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    card: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, marginBottom: 16 },
    cardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    cardSub: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
    tokenCard: { backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 12, padding: 14, marginBottom: 10 },
    tokenDevice: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
    tokenMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    tokenDate: { fontSize: 11, color: colors.textMuted },
    tokenExpiry: { fontSize: 11, fontWeight: '500', color: colors.warning },
    tokenActions: { flexDirection: 'row', gap: 8 },
    revokeBtn: { flex: 1, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
    revokeBtnText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
    generateBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    generateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginVertical: 20 },
    sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 16, marginBottom: 12 },
  });

  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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

  const handleGenerateToken = async () => {
    Alert.prompt(
      'Device Name',
      'What device is this token for?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async (deviceName) => {
            if (!deviceName?.trim()) return;
            try {
              setGenerating(true);
              const newToken = await mqttTokenService.generateToken(deviceName);
              setTokens([...tokens, newToken]);
              Alert.alert('Success', 'MQTT token generated for ' + deviceName);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to generate token');
            } finally {
              setGenerating(false);
            }
          }
        }
      ],
      'plain-text',
      `Mobile-${user?.full_name || 'Device'}`
    );
  };

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

  const handleRevokeAll = () => {
    if (tokens.length === 0) {
      Alert.alert('No Tokens', 'You have no active tokens to revoke');
      return;
    }

    Alert.alert(
      'Revoke All Tokens',
      'This will disable all your MQTT tokens. You will need to generate new ones to regain access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All',
          style: 'destructive',
          onPress: async () => {
            try {
              setRevoking('all');
              await mqttTokenService.revokeAllTokens();
              setTokens([]);
              Alert.alert('Success', 'All tokens revoked');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to revoke tokens');
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
        <View style={styles.header}>
          <Text style={styles.title}>🔐 MQTT Tokens</Text>
          <Text style={styles.subtitle}>Manage door access tokens for prompted MQTT-based door unlocking</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What are MQTT tokens?</Text>
          <Text style={styles.cardSub}>
            MQTT tokens are used to request door access on your mobile device. Unlike automatic BLE proximity, you explicitly tap a button to request access. Each token is encrypted and expires after 30 days.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Active Tokens ({tokens.length})</Text>

        {tokens.length === 0 ? (
          <Text style={styles.emptyText}>No active tokens. Generate one to start requesting door access.</Text>
        ) : (
          tokens.map((token) => (
            <View key={token.id} style={styles.tokenCard}>
              <Text style={styles.tokenDevice}>📱 {token.device_name || 'Mobile Device'}</Text>
              <View style={styles.tokenMeta}>
                <Text style={styles.tokenDate}>
                  Created: {new Date(token.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.tokenExpiry}>
                  Expires: {new Date(token.expires_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.tokenActions}>
                <TouchableOpacity
                  style={styles.revokeBtn}
                  onPress={() => handleRevokeToken(token.id, token.device_name)}
                  disabled={revoking === token.id}
                >
                  {revoking === token.id ? (
                    <ActivityIndicator color={colors.danger} size="small" />
                  ) : (
                    <Text style={styles.revokeBtnText}>🔴 Revoke</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.generateBtn, generating && { opacity: 0.6 }]}
          onPress={handleGenerateToken}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateBtnText}>+ Generate New Token</Text>
          )}
        </TouchableOpacity>

        {tokens.length > 0 && (
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: colors.danger, marginTop: 8 }]}
            onPress={handleRevokeAll}
            disabled={revoking === 'all'}
          >
            {revoking === 'all' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateBtnText}>Revoke All Tokens (Emergency)</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

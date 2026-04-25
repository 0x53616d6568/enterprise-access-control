/**
 * Door Access Screen (MQTT-Based)
 * Allows users to request access to doors with button-triggered behavior
 * Supports optional face authentication
 * 
 * Flow:
 * 1. Select door from list
 * 2. Select MQTT token to use
 * 3. Press "Request Access" button
 * 4. System verifies access rights
 * 5. If face auth required → show camera UI
 * 6. Wait for door response
 * 7. Display result (granted/denied)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
  Modal, FlatList, SafeAreaView
} from 'react-native';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { mqttAccessFlow, mqttTokenService, mqttAccessService } from '../../services/mqttService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';
import { useAuth } from '../../context/AuthContext';

export default function DoorAccessScreen({ navigation }) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const accessRequestTimeoutRef = useRef(null);

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    backBtn: { width: 36, height: 36, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title: { color: colors.textPrimary, fontSize: 20, fontWeight: '600', marginBottom: 2 },
    subtitle: { color: colors.textMuted, fontSize: 12 },
    sectionLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 12, fontWeight: '600' },
    emptyCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 32, alignItems: 'center', gap: 8, marginBottom: 16 },
    emptyText: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
    emptySubtext: { color: colors.textMuted, fontSize: 12 },
    
    // Door card
    doorCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 10, overflow: 'hidden' },
    doorCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    doorInfo: { flex: 1 },
    doorName: { color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 2 },
    doorLocation: { color: colors.textMuted, fontSize: 11 },
    doorIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
    doorMeta: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    metaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    metaBadgeText: { fontSize: 10, fontWeight: '500' },
    requestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 10 },
    requestBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    requestBtnDisabled: { opacity: 0.5 },

    // Status modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.bg, width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
    modalCloseBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    statusContainer: { alignItems: 'center', gap: 16 },
    statusIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    statusText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    statusSubtext: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
    spinnerContainer: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
    faceAuthSection: { alignItems: 'center', gap: 12, marginTop: 20 },
    faceAuthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20 },
    faceAuthBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

    // Token selector
    tokenSelectorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 16 },
    tokenSelectorText: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
    tokenSelectModal: { backgroundColor: colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
    tokenItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tokenItemText: { color: colors.textPrimary, fontSize: 13 },
    tokenItemSubtext: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  });

  const [doors, setDoors] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestingDoorId, setRequestingDoorId] = useState(null);
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  // Fetch accessible doors and tokens
  const fetchData = useCallback(async () => {
    try {
      const [doorsRes, tokensRes] = await Promise.all([
        api.get(API.DOORS + '/access/my-doors'),
        mqttTokenService.getTokens()
      ]);
      
      const doorList = doorsRes.data.data || [];
      setDoors(doorList);
      setTokens(tokensRes);
      
      // Auto-select first token if available
      if (tokensRes.length > 0 && !selectedToken) {
        setSelectedToken(tokensRes[0]);
      }
    } catch (err) {
      console.log('Fetch error:', err.message);
      Alert.alert('Error', 'Failed to load doors and tokens');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  /**
   * Handle request access button press
   */
  const handleRequestAccess = async (door) => {
    if (!selectedToken) {
      Alert.alert('Error', 'Please select an MQTT token');
      return;
    }

    setRequesting(true);
    setRequestingDoorId(door.door_id);

    try {
      // Start the access request flow
      const result = await mqttAccessFlow.requestAccessWithAuth(
        door.door_id,
        selectedToken.id,
        false, // Don't force face auth
        handleFaceAuthNeeded // Face auth callback
      );

      // Show result modal
      setStatusData({
        ...result,
        doorName: door.door_name,
        timestamp: new Date().toLocaleTimeString()
      });
      setShowStatusModal(true);

    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to request access');
    } finally {
      setRequesting(false);
      setRequestingDoorId(null);
    }
  };

  /**
   * Handle face auth when needed
   */
  const handleFaceAuthNeeded = async (requestId) => {
    // Navigate to face recognition screen or show face camera UI
    // For now, we'll show an alert
    return await new Promise((resolve) => {
      Alert.alert(
        'Face Authentication Required',
        'Please position your face in the camera',
        [
          {
            text: 'Cancel',
            onPress: () => resolve(false),
            style: 'cancel'
          },
          {
            text: 'Verify Face',
            onPress: () => {
              // In real app, integrate with face recognition service
              // For now, simulate successful face auth
              resolve(true);
            }
          }
        ]
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaViewContext style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Door Access</Text>
            <Text style={styles.subtitle}>Request access with one tap</Text>
          </View>
        </View>

        {/* Token Selector */}
        {tokens.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Device Token</Text>
            <TouchableOpacity
              style={styles.tokenSelectorBtn}
              onPress={() => setShowTokenSelector(true)}
            >
              <View>
                <Text style={styles.tokenSelectorText}>
                  {selectedToken?.device_name || 'Select token'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* Accessible Doors */}
        <Text style={styles.sectionLabel}>Available Doors</Text>

        {doors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="lock-open-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No accessible doors</Text>
            <Text style={styles.emptySubtext}>You don't have access to any doors yet</Text>
          </View>
        ) : (
          doors.map((door) => (
            <View key={door.door_id} style={styles.doorCard}>
              <View style={styles.doorCardTop}>
                <View style={styles.doorInfo}>
                  <Text style={styles.doorName}>{door.door_name}</Text>
                  <Text style={styles.doorLocation}>{door.location}</Text>
                </View>
                <View style={[styles.doorIconWrap, { backgroundColor: colors.accentBg }]}>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.accent} />
                </View>
              </View>

              {/* Door metadata */}
              <View style={styles.doorMeta}>
                <View style={[styles.metaBadge, { borderColor: colors.border }]}>
                  <Text style={[styles.metaBadgeText, { color: colors.textMuted }]}>
                    Level {door.security_level}
                  </Text>
                </View>
                {door.requires_face_auth ? (
                  <View style={[styles.metaBadge, { borderColor: colors.accentDark }]}>
                    <Text style={[styles.metaBadgeText, { color: colors.accent }]}>
                      🔐 Face Auth
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Request button */}
              <TouchableOpacity
                style={[styles.requestBtn, (requesting && requestingDoorId === door.door_id) && styles.requestBtnDisabled]}
                onPress={() => handleRequestAccess(door)}
                disabled={requesting && requestingDoorId === door.door_id}
              >
                {requesting && requestingDoorId === door.door_id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-open-outline" size={14} color="#fff" />
                    <Text style={styles.requestBtnText}>Request Access</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Token Selector Modal */}
      <Modal
        visible={showTokenSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTokenSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tokenSelectModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Device Token</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowTokenSelector(false)}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={tokens}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.tokenItem}
                  onPress={() => {
                    setSelectedToken(item);
                    setShowTokenSelector(false);
                  }}
                >
                  <View>
                    <Text style={styles.tokenItemText}>{item.device_name}</Text>
                    <Text style={styles.tokenItemSubtext}>
                      {item.status} • Expires {new Date(item.expires_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {selectedToken?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {statusData?.success ? 'Access Granted' : 'Access Denied'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowStatusModal(false)}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusContainer}>
              <View style={[styles.statusIcon, {
                backgroundColor: statusData?.success ? colors.successBg : colors.dangerBg
              }]}>
                <Ionicons
                  name={statusData?.success ? 'checkmark-circle' : 'close-circle'}
                  size={40}
                  color={statusData?.success ? colors.success : colors.danger}
                />
              </View>

              <Text style={styles.statusText}>{statusData?.message}</Text>
              
              {statusData?.doorName && (
                <Text style={styles.statusSubtext}>
                  Door: {statusData.doorName}
                </Text>
              )}

              {!statusData?.success && statusData?.status === 'FACE_AUTH_FAILED' && (
                <View style={styles.faceAuthSection}>
                  <Text style={styles.statusSubtext}>Face authentication failed. Please try again.</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.requestBtn, { marginTop: 24 }]}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.requestBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaViewContext>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';
import { mqttAccessService } from '../../services/mqttService';
import { CustomAlert } from '../../components/CustomAlert';
import { DoorControlPanel } from '../../components/DoorControlPanel';

export default function MyDoorsScreen({ navigation }) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const alertRef = React.useRef(null);

  // Helper function to show custom alerts
  const showAlert = (title, message, type = 'info', buttons = []) => {
    const defaultButtons = [{ text: 'OK', onPress: () => {} }];
    alertRef.current?.show({
      title,
      message,
      type,
      buttons: buttons.length > 0 ? buttons : defaultButtons
    });
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { padding: 24 },
    centered: { flex: 1, justifyContent: 'center', backgroundColor: colors.bg },
    rowBC: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    doorRequestCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 12 },
    doorRequestHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0, justifyContent: 'space-between' },
    doorRequestName: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    metaText: { color: colors.textMuted, fontSize: 12 },
    doorAccessLevel: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.accentBg },
    doorAccessLevelText: { fontSize: 10, fontWeight: '600', color: colors.accent },
    requestAccessBtn: { backgroundColor: colors.accent, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    requestAccessBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.bgCard },
    availabilityItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    availabilityLabel: { color: colors.textMuted, fontSize: 10 },
    availabilityValue: { color: colors.textPrimary, fontSize: 10, fontWeight: '500' },
    emptyIcon: { marginBottom: 10 },
    emptyTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 4 },
    emptySubtitle: { color: colors.textMuted, fontSize: 10, fontStyle: 'italic', marginTop: 12 },
  });

  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingDoorId, setRequestingDoorId] = useState(null);

  const fetchEmployeeDoors = useCallback(async () => {
    try {
      // Employees see doors assigned to THEM
      const doorsRes = await api.get(API.MY_DOORS);
      const employeeDoors = doorsRes.data.data || [];
      
      console.log(`[MyDoors] Employee loaded ${employeeDoors.length} assigned doors`);
      setDoors(employeeDoors);
    } catch (err) {
      console.error('Failed to fetch employee doors:', err.message);
      setDoors([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchEmployeeDoors();
    }, [fetchEmployeeDoors])
  );

  // Handle door access requests
  const handleRequestAccess = async (door) => {
    if (!user) {
      showAlert('Error', 'User not authenticated', 'error');
      return;
    }
    
    setRequestingDoorId(door.door_id || door.id);
    try {
      await mqttAccessService.requestAccess({
        door_id: door.door_id || door.id,
        door_name: door.door_name || door.name,
        user_id: user.user_id,
        user_name: user.full_name
      });
      showAlert('Success', `Access request sent for ${door.door_name || door.name}`, 'success');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to request access';
      showAlert('Error', errorMsg, 'error');
    } finally {
      setRequestingDoorId(null);
    }
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
      <CustomAlert ref={alertRef} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchEmployeeDoors} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.rowBC}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Doors</Text>
          </View>
        </View>

        {/* Door Cards with Request Button on Right */}
        {doors && doors.length > 0 ? (
          doors.map((door) => (
            <View key={door.door_id || door.id} style={styles.doorRequestCard}>
              <View style={styles.doorRequestHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doorRequestName}>{door.door_name || door.name || 'Door'}</Text>
                  <Text style={styles.metaText}>{door.location || 'Unknown location'}</Text>
                </View>
                <View style={[styles.doorAccessLevel, { backgroundColor: colors.accentBg }]}>
                  <Text style={styles.doorAccessLevelText}>
                    {door.security_level || 'Standard'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[
                    styles.requestAccessBtn,
                    requestingDoorId === (door.door_id || door.id) && { opacity: 0.7 }
                  ]}
                  onPress={() => handleRequestAccess(door)}
                  disabled={requestingDoorId === (door.door_id || door.id)}
                >
                  {requestingDoorId === (door.door_id || door.id) ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.requestAccessBtnText}>Request</Text>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Direct MQTT Control Panel */}
              <DoorControlPanel doorId={door.door_id || door.id} doorName={door.door_name || door.name} />
            </View>
          ))
        ) : (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Ionicons name="lock-outline" size={40} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No Doors Available</Text>
            <Text style={styles.emptySubtitle}>You don't have access to any doors yet. Contact your manager.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import useThemeColors from '../../hooks/useThemeColors';

export default function MyDoorsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
    header: { marginBottom: 24 },
    title: { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 3 },
    subtitle: { color: colors.textMuted, fontSize: 13 },
    
    doorCard: { 
      backgroundColor: colors.bgCard, 
      borderWidth: 1, 
      borderColor: colors.border, 
      borderRadius: 16, 
      padding: 18,
      marginBottom: 14,
    },
    doorHeader: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 12, 
      marginBottom: 12 
    },
    doorIcon: { 
      width: 44, 
      height: 44, 
      borderRadius: 12, 
      backgroundColor: colors.accentBg,
      borderWidth: 1,
      borderColor: colors.accentDark,
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    doorInfo: { flex: 1 },
    doorName: { 
      color: colors.textPrimary, 
      fontSize: 15, 
      fontWeight: '600', 
      marginBottom: 2 
    },
    doorLocation: { 
      color: colors.textMuted, 
      fontSize: 12 
    },
    doorDetails: { gap: 10 },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    detailLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    detailValue: {
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    statusAvailable: {
      backgroundColor: colors.successBg,
      borderWidth: 1,
      borderColor: colors.successBorder,
    },
    statusAvailableText: {
      color: colors.success,
    },
    statusScheduled: {
      backgroundColor: colors.warningBg,
      borderWidth: 1,
      borderColor: colors.warningBorder,
    },
    statusScheduledText: {
      color: colors.warning,
    },
    statusNotAvailable: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    statusNotAvailableText: {
      color: colors.danger,
    },
    accessInfo: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    accessRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    accessText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    emptyCard: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 32,
      alignItems: 'center',
      gap: 12,
    },
    emptyIcon: { fontSize: 32 },
    emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
    emptySubText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  });

  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getSecurityLevelLabel = (level) => {
    switch (level) {
      case 1: return 'Level 1 - Standard';
      case 3: return 'Level 3 - Elevated';
      case 5: return 'Level 5 - High Security';
      default: return 'Standard';
    }
  };

  const checkAccessAvailability = (rule) => {
    if (!rule) return { status: 'No Access', color: 'statusNotAvailable' };

    const now = new Date();
    const currentDay = now.toLocaleString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3);
    const currentTime = now.toTimeString().slice(0, 5);

    const days = rule.days_of_week?.split(',').map(d => d.trim()) || [];
    if (!days.includes(currentDay)) {
      return { status: 'Not Available Today', color: 'statusNotAvailable' };
    }

    const from = rule.allowed_from || '00:00';
    const until = rule.allowed_until || '23:59';

    if (currentTime >= from && currentTime <= until) {
      return { status: 'Available Now', color: 'statusAvailable' };
    } else {
      return { status: 'Not Available Now', color: 'statusScheduled' };
    }
  };

  const fetchMyDoors = useCallback(async () => {
    try {
      const [doorsRes, rulesRes] = await Promise.all([
        api.get(API.DOORS),
        api.get(`${API.BASE_URL}/doors/access/my-doors`),
      ]);

      const allDoors = doorsRes.data.data || [];
      const myAccessibleDoors = rulesRes.data.data || [];
      const accessibleDoorIds = new Set(myAccessibleDoors.map(d => d.door_id));

      const filtered = allDoors.filter(door => accessibleDoorIds.has(door.door_id));
      
      // Enrich with access rules
      const enrichedDoors = filtered.map(door => {
        const rule = myAccessibleDoors.find(d => d.door_id === door.door_id);
        return { ...door, accessRule: rule };
      });

      setDoors(enrichedDoors);
    } catch (err) {
      console.log('Fetch my doors error:', err.message);
      // Fallback: get all doors - user can see all but might not have access
      try {
        const res = await api.get(API.DOORS);
        setDoors(res.data.data || []);
      } catch (e) {
        console.log('Fallback fetch error:', e.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyDoors();
  }, [fetchMyDoors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyDoors();
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
          <Text style={styles.title}>My Access</Text>
          <Text style={styles.subtitle}>
            {doors.length > 0 ? `${doors.length} door${doors.length !== 1 ? 's' : ''} available` : 'No accessible doors'}
          </Text>
        </View>

        {/* Doors List */}
        {doors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="lock-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No Accessible Doors</Text>
            <Text style={styles.emptySubText}>You don't have access to any doors yet. Contact your manager.</Text>
          </View>
        ) : (
          doors.map((door) => {
            const { status, color } = checkAccessAvailability(door.accessRule);
            return (
              <View key={door.door_id} style={styles.doorCard}>
                {/* Door Header */}
                <View style={styles.doorHeader}>
                  <View style={styles.doorIcon}>
                    <Ionicons name="lock-closed-outline" size={22} color={colors.accent} />
                  </View>
                  <View style={styles.doorInfo}>
                    <Text style={styles.doorName}>{door.door_name}</Text>
                    <Text style={styles.doorLocation}>{door.location || 'Location not set'}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.doorDetails}>
                  {/* Status */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={[styles.statusBadge, styles[color]]}>
                      <Text style={[styles.statusBadgeText, styles[`${color}Text`]]}>
                        {status}
                      </Text>
                    </View>
                  </View>

                  {/* Security Level */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Security</Text>
                    <Text style={styles.detailValue}>
                      {getSecurityLevelLabel(door.security_level || 1)}
                    </Text>
                  </View>

                  {/* Pi Device */}
                  {door.pi_device_id && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Device</Text>
                      <Text style={styles.detailValue}>{door.pi_device_id}</Text>
                    </View>
                  )}

                  {/* Access Schedule */}
                  {door.accessRule && (
                    <View style={styles.accessInfo}>
                      <View style={styles.accessRow}>
                        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.accessText}>
                          {door.accessRule.allowed_from} - {door.accessRule.allowed_until}
                        </Text>
                      </View>
                      <View style={styles.accessRow}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.accessText}>
                          {door.accessRule.days_of_week}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

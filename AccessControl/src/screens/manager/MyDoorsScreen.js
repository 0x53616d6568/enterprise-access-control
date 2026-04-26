import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

export default function MyDoorsScreen({ navigation }) {
  const colors = useThemeColors();
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchManagerDoors = useCallback(async () => {
    try {
      // Managers see doors assigned to THEM (just like employees see in Quick Access)
      // Use the same MY_DOORS endpoint that employees use
      const doorsRes = await api.get(API.MY_DOORS);
      const managerDoors = doorsRes.data.data || [];
      
      console.log(`[MyDoors] Manager loaded ${managerDoors.length} assigned doors`);
      setDoors(managerDoors);
    } catch (err) {
      console.error('Failed to fetch manager doors:', err.message);
      setDoors([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchManagerDoors();
  }, [fetchManagerDoors]);

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { padding: 16 },
    header: { marginBottom: 20, paddingTop: 10 },
    title: { color: colors.textPrimary, fontSize: 24, fontWeight: '600', marginBottom: 4 },
    subtitle: { color: colors.textMuted, fontSize: 12 },
    doorCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, marginBottom: 12 },
    doorName: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 8 },
    doorInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    infoIcon: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    infoText: { color: colors.textMuted, fontSize: 12, flex: 1 },
    membersSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    membersTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
    memberBadge: { display: 'inline-block', backgroundColor: colors.accentBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, marginBottom: 6 },
    memberText: { color: colors.accent, fontSize: 11, fontWeight: '500' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyIcon: { marginBottom: 16 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
    emptyText: { fontSize: 12, color: colors.textMuted },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  });

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchManagerDoors} tintColor={colors.accent} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Team Doors</Text>
          <Text style={styles.subtitle}>Doors accessible by your team members</Text>
        </View>

        {doors && doors.length > 0 ? (
          doors.map((door) => (
            <View key={door.door_id || door.id} style={styles.doorCard}>
              <Text style={styles.doorName}>{door.door_name || door.name || 'Door'}</Text>
              
              <View style={styles.doorInfo}>
                <View style={[styles.infoIcon, { backgroundColor: colors.accentBg }]}>
                  <Ionicons name="location-outline" size={12} color={colors.accent} />
                </View>
                <Text style={styles.infoText}>{door.location || 'Unknown location'}</Text>
              </View>

              <View style={styles.doorInfo}>
                <View style={[styles.infoIcon, { backgroundColor: colors.accentBg }]}>
                  <Ionicons name="shield-outline" size={12} color={colors.accent} />
                </View>
                <Text style={styles.infoText}>{door.security_level || 'Standard'}</Text>
              </View>

              {door.assignedTo && door.assignedTo.length > 0 && (
                <View style={styles.membersSection}>
                  <Text style={styles.membersTitle}>Assigned to</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {door.assignedTo.map((member, idx) => (
                      <View key={idx} style={styles.memberBadge}>
                        <Text style={styles.memberText}>{member}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="lock-outline" size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Doors Assigned</Text>
            <Text style={styles.emptyText}>Your team members don't have any door access</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

export default function AllLogsScreen({ navigation }) {
  const colors = useThemeColors();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await api.get(API.MY_LOGS);
      setLogs(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err.message);
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingTop: 10 },
    title: { color: colors.textPrimary, fontSize: 22, fontWeight: '600' },
    logItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: 10 },
    logIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    logContent: { flex: 1 },
    logDoor: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
    logMeta: { color: colors.textMuted, fontSize: 11 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    badgeText: { fontSize: 10, fontWeight: '600' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLogs} tintColor={colors.accent} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Access Logs</Text>
          <View style={{ width: 24 }} />
        </View>

        {logs && logs.length > 0 ? (
          logs.map((log, index) => (
            <View key={index} style={styles.logItem}>
              <View
                style={[
                  styles.logIcon,
                  {
                    backgroundColor:
                      log.result === 'GRANTED'
                        ? colors.successBg
                        : log.result === 'PENDING'
                        ? colors.warningBg
                        : colors.dangerBg,
                  },
                ]}
              >
                <Ionicons
                  name={log.result === 'GRANTED' ? 'lock-open' : 'lock-closed-outline'}
                  size={18}
                  color={
                    log.result === 'GRANTED'
                      ? colors.success
                      : log.result === 'PENDING'
                      ? colors.warning
                      : colors.danger
                  }
                />
              </View>

              <View style={styles.logContent}>
                <Text style={styles.logDoor}>{log.door_name || 'Door'}</Text>
                <Text style={styles.logMeta}>
                  {new Date(log.timestamp).toLocaleString()} · {log.method || 'MQTT'}
                </Text>
              </View>

              <View
                style={[
                  styles.badge,
                  {
                    borderColor:
                      log.result === 'GRANTED'
                        ? colors.successBorder
                        : log.result === 'PENDING'
                        ? colors.warningBorder
                        : colors.dangerBorder,
                    backgroundColor:
                      log.result === 'GRANTED'
                        ? colors.successBg
                        : log.result === 'PENDING'
                        ? colors.warningBg
                        : colors.dangerBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        log.result === 'GRANTED'
                          ? colors.success
                          : log.result === 'PENDING'
                          ? colors.warning
                          : colors.danger,
                    },
                  ]}
                >
                  {log.result || 'UNKNOWN'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-outline" size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Access Logs</Text>
            <Text style={styles.emptyText}>Your access history will appear here</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

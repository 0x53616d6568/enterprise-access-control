import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';
import { mqttTokenService, mqttAccessService } from '../../services/mqttService';
import { CustomAlert } from '../../components/CustomAlert';

export default function DashboardScreen({ navigation }) {
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
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowBC: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    greeting: { color: colors.textPrimary, fontSize: 22, fontWeight: '600', marginBottom: 4 },
    metaText: { color: colors.textMuted, fontSize: 12 },
    iconBtn: { width: 40, height: 40, backgroundColor: colors.bgCard, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.bg },
    statusCard: { backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    statusIcon: { width: 38, height: 38, backgroundColor: colors.accent, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    accentMeta: { color: colors.accentText, fontSize: 10, fontWeight: '600', marginBottom: 2 },
    statusValue: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14 },
    statValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginVertical: 4 },
    statSub: { fontSize: 11 },
    sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    link: { color: colors.accent, fontSize: 12 },
    logItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bgCard },
    logIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    logDoor: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
    // Quick Access Section
    quickAccessContainer: { marginBottom: 24 },
    quickAccessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    quickAccessBtn: { flex: 1, minWidth: '30%', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8 },
    quickAccessBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentBg },
    quickAccessIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    quickAccessText: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
    doorRequestCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 12 },
    doorRequestHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    doorRequestName: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    doorAccessLevel: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.accentBg },
    doorAccessLevelText: { fontSize: 10, fontWeight: '600', color: colors.accent },
    requestAccessBtn: { backgroundColor: colors.accent, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
    requestAccessBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    requestAccessBtnDisabled: { backgroundColor: colors.textMuted, opacity: 0.5 },
  });

  const StatCard = ({ label, value, sub, color }) => (
    <View style={styles.statCard}>
      <Text style={styles.metaText}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statSub, { color }]}>{sub}</Text>
    </View>
  );

  const [data, setData] = useState({ att: [], logs: [], reqs: [], notifs: [], doors: [], tokens: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingDoorId, setRequestingDoorId] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [a, l, r, n, d, t] = await Promise.all([
        api.get(API.MY_ATTENDANCE), 
        api.get(API.MY_LOGS),
        api.get(API.MY_REQUESTS), 
        api.get(API.NOTIFICATIONS),
        api.get(API.MY_DOORS),
        mqttTokenService.getTokens().catch(() => [])
      ]);
      
      let doors = d.data.data || [];
      
      // Ensure doors array is properly formatted
      if (!Array.isArray(doors)) {
        doors = [];
      }
      
      setData({ 
        att: a.data.data || [], 
        logs: l.data.data || [], 
        reqs: r.data.data || [], 
        notifs: n.data.data || [], 
        doors: doors,
        tokens: t || []
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err.message);
      // Fallback to empty data on error
      setData({ att: [], logs: [], reqs: [], notifs: [], doors: [], tokens: [] });
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    if (!hasInitialized) {
      fetchData();
      setHasInitialized(true);
    }
  }, [hasInitialized, fetchData]);

  // Auto-generate MQTT token after initial fetch
  useEffect(() => {
    if (hasInitialized && !loading && user && data.tokens.length === 0) {
      const autoGenerateToken = async () => {
        try {
          const newToken = await mqttTokenService.generateToken(`Mobile-${user.full_name}`);
          setData(prev => ({
            ...prev,
            tokens: [newToken]
          }));
        } catch (error) {
          console.log('Auto-token generation skipped:', error.message);
        }
      };
      autoGenerateToken();
    }
  }, [hasInitialized, loading, user, data.tokens.length]);

  // Handle door access requests
  const handleRequestAccess = async (door) => {
    if (!user) {
      showAlert('Error', 'User not authenticated', 'error');
      return;
    }

    if (!data.tokens || data.tokens.length === 0) {
      showAlert('No Tokens', 'Generating access token...', 'warning');
      return;
    }

    const doorId = door.door_id || door.id;
    setRequestingDoorId(doorId);

    try {
      const token = data.tokens[0];
      const response = await mqttAccessService.requestDoorAccess(doorId, token.id);
      
      if (response.status === 'GRANTED') {
        showAlert('✓ Access Granted', `${door.door_name || door.name} is unlocking...`, 'success');
      } else if (response.status === 'FACE_AUTH_REQUIRED') {
        showAlert('Face Authentication Required', 'Please proceed to face recognition', 'info');
      } else if (response.status === 'PENDING') {
        showAlert('Request Pending', `Waiting for approval from ${door.door_name || door.name}...`, 'info');
      } else {
        showAlert('Access Denied', response.message || 'Your request was denied', 'error');
      }

      setTimeout(() => fetchData(), 2000);
    } catch (error) {
      showAlert('Error', error.message || 'Failed to request access', 'error');
    } finally {
      setRequestingDoorId(null);
    }
  };

  const today = data.att.find(a => new Date(a.check_in).toDateString() === new Date().toDateString());
  const weekHrs = data.att.filter(a => new Date(a.check_in) > new Date(Date.now() - 7 * 864e5)).reduce((s, a) => s + (a.total_hours || 0), 0).toFixed(1);
  const unread = data.notifs.filter(n => !n.is_read).length;

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={colors.accent} />}>
        <View style={styles.rowBC}>
          <View>
            <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'morning' : 'day'}, {user?.full_name?.split(' ')[0]}</Text>
            <Text style={styles.metaText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            {unread > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.row}>
            <View style={styles.statusIcon}><Ionicons name="person-outline" size={18} color="#fff" /></View>
            <View>
              <Text style={styles.accentMeta}>ATTENDANCE STATUS</Text>
              <Text style={styles.statusValue}>{today ? (today.check_out ? 'Checked out' : 'Checked in') : 'Not checked in'}</Text>
            </View>
          </View>
          <Text style={styles.metaText}>{today ? new Date(today.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="This week" value={`${weekHrs}h`} sub="Logged" color={colors.success} />
          <StatCard label="Requests" value={data.reqs.filter(r => r.status === 'PENDING').length} sub="Pending" color={colors.warning} />
          <StatCard label="Alerts" value={unread} sub="Unread" color={colors.accent} />
        </View>

        {/* Quick Access Section - Request Door Access */}
        <View style={styles.quickAccessContainer}>
          <View style={styles.rowBC}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="folder-open" size={14} color={colors.textSecondary} />
              <Text style={styles.sectionTitle}>Assigned Doors</Text>
            </View>
            {data.tokens.length > 0 && (
              <TouchableOpacity onPress={() => showAlert('Active Tokens', `You have ${data.tokens.length} active token${data.tokens.length !== 1 ? 's' : ''} for door access requests`, 'info')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="key" size={12} color={colors.accent} />
                  <Text style={[styles.link, { fontSize: 11 }]}>{data.tokens.length} Token{data.tokens.length !== 1 ? 's' : ''}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {data.doors && data.doors.length > 0 ? (
            <>
              {/* Assigned Doors List */}
              {data.doors.map((door) => {
                return (
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
                        <>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.requestAccessBtnText}>Requesting...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="lock-open" size={14} color="#fff" />
                          <Text style={styles.requestAccessBtnText}>Request Access</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={{ backgroundColor: colors.bgCard, padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.accentBg, borderStyle: 'dashed' }}>
              <Ionicons name="information-circle-outline" size={32} color={colors.accent} style={{ marginBottom: 10 }} />
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 4 }}>No Doors Assigned</Text>
              <Text style={styles.metaText}>Your account doesn't have any door access</Text>
              <Text style={[styles.metaText, { marginTop: 12, fontStyle: 'italic', fontSize: 10 }]}>Please contact your administrator to assign doors to your account</Text>
            </View>
          )}
        </View>

        <View style={styles.rowBC}>
          <Text style={styles.sectionTitle}>Recent Access</Text>
          <TouchableOpacity 
            onPress={() => {
              // Navigate to AllLogs - DashboardScreen is in HomeStack for employees and can navigate directly
              navigation.navigate('AllLogs');
            }}
          >
            <Text style={styles.link}>See all</Text>
          </TouchableOpacity>
        </View>

        {data.logs.slice(0, 5).map((log, i) => (
          <View key={i} style={styles.logItem}>
            <View style={[styles.logIcon, { backgroundColor: log.result === 'GRANTED' ? colors.successBg : colors.dangerBg }]}>
              <Ionicons name="lock-closed-outline" size={14} color={log.result === 'GRANTED' ? colors.success : colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.logDoor}>{log.door_name || 'Door'}</Text>
              <Text style={styles.metaText}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {log.method || 'MQTT'}</Text>
            </View>
            <View style={[styles.badge, { borderColor: log.result === 'GRANTED' ? colors.successBorder : colors.dangerBorder }]}>
              <Text style={{ fontSize: 10, color: log.result === 'GRANTED' ? colors.success : colors.danger }}>{log.result}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Custom Alert Modal */}
      <CustomAlert ref={alertRef} />
    </SafeAreaView>
  );
}


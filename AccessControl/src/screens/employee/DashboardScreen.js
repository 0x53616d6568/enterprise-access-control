import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import colors from '../../constants/colors';

export default function DashboardScreen({ navigation }) {
  const { user, accessToken, logout } = useAuth();

  const [attendance,     setAttendance]     = useState([]);
  const [logs,           setLogs]           = useState([]);
  const [requests,       setRequests]       = useState([]);
  const [notifications,  setNotifications]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const fetchData = useCallback(async () => {
    try {
      const [attRes, logsRes, reqRes, notifRes] = await Promise.all([
        axios.get(API.MY_ATTENDANCE, { headers }),
        axios.get(API.MY_LOGS,       { headers }),
        axios.get(API.MY_REQUESTS,   { headers }),
        axios.get(API.NOTIFICATIONS, { headers }),
      ]);
      setAttendance(attRes.data.data   || []);
      setLogs(logsRes.data.data        || []);
      setRequests(reqRes.data.data     || []);
      setNotifications(notifRes.data.data || []);
    } catch (err) {
      console.log('Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Helpers
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const todayAttendance = attendance.find(a => {
    const d = new Date(a.check_in);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const weekHours = attendance
    .filter(a => {
      const d = new Date(a.check_in);
      const now = new Date();
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      return d >= weekAgo;
    })
    .reduce((sum, a) => sum + (a.total_hours || 0), 0)
    .toFixed(1);

  const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
  const unreadNotifs    = notifications.filter(n => !n.is_read).length;
  const recentLogs      = logs.slice(0, 5);

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
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} />
            {unreadNotifs > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>

        {/* Attendance status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <View style={styles.statusIcon}>
              <Ionicons name="person-outline" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.statusLabel}>ATTENDANCE STATUS</Text>
              <Text style={styles.statusValue}>
                {todayAttendance
                  ? todayAttendance.check_out ? 'Checked out' : 'Checked in'
                  : 'Not checked in'}
              </Text>
            </View>
          </View>
          <View style={styles.statusRight}>
            <Text style={styles.statusTime}>
              {todayAttendance
                ? new Date(todayAttendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </Text>
            {todayAttendance && !todayAttendance.check_out && (
              <Text style={styles.statusActive}>● Active</Text>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This week</Text>
            <Text style={styles.statValue}>{weekHours}h</Text>
            <Text style={[styles.statSub, { color: colors.success }]}>Logged</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Requests</Text>
            <Text style={styles.statValue}>{pendingRequests}</Text>
            <Text style={[styles.statSub, { color: colors.warning }]}>
              {pendingRequests > 0 ? 'Pending' : 'All clear'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Notifications</Text>
            <Text style={styles.statValue}>{unreadNotifs}</Text>
            <Text style={[styles.statSub, { color: colors.accent }]}>
              {unreadNotifs > 0 ? 'Unread' : 'All read'}
            </Text>
          </View>
        </View>

        {/* Recent access logs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent access</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Logs")}>
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentLogs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="lock-open-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>No access logs yet</Text>
          </View>
        ) : (
          recentLogs.map((log, i) => (
            <View key={i} style={styles.logItem}>
              <View style={[
                styles.logIcon,
                log.result === 'GRANTED' ? styles.logIconGranted : styles.logIconDenied
              ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={log.result === 'GRANTED' ? colors.success : colors.danger}
                />
              </View>
              <View style={styles.logInfo}>
                <Text style={styles.logDoor}>{log.door_name || 'Unknown door'}</Text>
                <Text style={styles.logMeta}>
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' · '}{log.method || 'BLE'}
                </Text>
              </View>
              <View style={[
                styles.logBadge,
                log.result === 'GRANTED' ? styles.badgeGranted : styles.badgeDenied
              ]}>
                <Text style={[
                  styles.logBadgeText,
                  { color: log.result === 'GRANTED' ? colors.success : colors.danger }
                ]}>
                  {log.result === 'GRANTED' ? 'Granted' : 'Denied'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex:            1,
    backgroundColor: colors.bg,
    alignItems:      'center',
    justifyContent:  'center',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop:        16,
    paddingBottom:     32,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   24,
  },
  greeting: {
    color:         colors.textPrimary,
    fontSize:      22,
    fontWeight:    '500',
    letterSpacing: -0.4,
    marginBottom:  3,
  },
  date: {
    color:    colors.textMuted,
    fontSize: 13,
  },
  notifBtn: {
    width:           36,
    height:          36,
    backgroundColor: colors.bgCard,
    borderWidth:     1,
    borderColor:     colors.borderMid,
    borderRadius:    10,
    alignItems:      'center',
    justifyContent:  'center',
  },
  notifDot: {
    position:        'absolute',
    top:             7,
    right:           7,
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: colors.accent,
    borderWidth:     1.5,
    borderColor:     colors.bg,
  },
  statusCard: {
    backgroundColor: colors.bgDeep,
    borderWidth:     1,
    borderColor:     colors.accentDark,
    borderRadius:    16,
    padding:         16,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    marginBottom:    20,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  statusIcon: {
    width:           40,
    height:          40,
    backgroundColor: colors.accent,
    borderRadius:    12,
    alignItems:      'center',
    justifyContent:  'center',
  },
  statusLabel: {
    color:         colors.accentText,
    fontSize:      11,
    letterSpacing: 0.3,
    marginBottom:  2,
  },
  statusValue: {
    color:      colors.textPrimary,
    fontSize:   15,
    fontWeight: '500',
  },
  statusRight: {
    alignItems: 'flex-end',
  },
  statusTime: {
    color:    colors.textMuted,
    fontSize: 12,
  },
  statusActive: {
    color:    colors.success,
    fontSize: 11,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap:           10,
    marginBottom:  24,
  },
  statCard: {
    flex:            1,
    backgroundColor: colors.bgCard,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    14,
    padding:         14,
  },
  statLabel: {
    color:        colors.textMuted,
    fontSize:     11,
    marginBottom: 6,
  },
  statValue: {
    color:         colors.textPrimary,
    fontSize:      20,
    fontWeight:    '500',
    letterSpacing: -0.5,
  },
  statSub: {
    fontSize:  11,
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   12,
  },
  sectionTitle: {
    color:         colors.textSecondary,
    fontSize:      11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionLink: {
    color:    colors.accent,
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: colors.bgCard,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    14,
    padding:         24,
    alignItems:      'center',
    gap:             8,
  },
  emptyText: {
    color:    colors.textMuted,
    fontSize: 13,
  },
  logItem: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgCard,
  },
  logIcon: {
    width:          36,
    height:         36,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  logIconGranted: {
    backgroundColor: colors.successBg,
    borderWidth:     1,
    borderColor:     colors.successBorder,
  },
  logIconDenied: {
    backgroundColor: colors.dangerBg,
    borderWidth:     1,
    borderColor:     colors.dangerBorder,
  },
  logInfo: {
    flex: 1,
  },
  logDoor: {
    color:        colors.textPrimary,
    fontSize:     13,
    fontWeight:   '500',
    marginBottom: 2,
  },
  logMeta: {
    color:    colors.textMuted,
    fontSize: 11,
  },
  logBadge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      6,
    borderWidth:       1,
  },
  badgeGranted: {
    backgroundColor: colors.successBg,
    borderColor:     colors.successBorder,
  },
  badgeDenied: {
    backgroundColor: colors.dangerBg,
    borderColor:     colors.dangerBorder,
  },
  logBadgeText: {
    fontSize:   11,
    fontWeight: '500',
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function AttendanceScreen() {
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    safe:    { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
    header:    { marginBottom: 20 },
    title:     { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 3 },
    subtitle:  { color: colors.textMuted, fontSize: 13 },
    weekStrip: { flexDirection: 'row', gap: 6, marginBottom: 20 },
    dayBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 10,
      borderRadius: 12, gap: 6,
    },
    dayBtnHasData: {
      backgroundColor: colors.bgCard,
      borderWidth: 1, borderColor: colors.border,
    },
    dayBtnActive: { backgroundColor: colors.accent },
    dayName:      { fontSize: 10, color: colors.textMuted },
    dayNum:       { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
    dayTextActive: { color: '#fff' },
    dayDot:       { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
    dayDotActive: { backgroundColor: 'rgba(255,255,255,0.5)' },
    summaryRow:   { flexDirection: 'row', gap: 10, marginBottom: 24 },
    sumCard: {
      flex: 1, backgroundColor: colors.bgCard,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 14, padding: 14,
    },
    sumLabel:  { color: colors.textMuted, fontSize: 11, marginBottom: 6 },
    sumValue:  { color: colors.textPrimary, fontSize: 18, fontWeight: '500', letterSpacing: -0.3 },
    sumSub:    { fontSize: 11, marginTop: 3 },
    sectionHeader: { marginBottom: 12 },
    sectionTitle:  { color: colors.textSecondary, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
    logItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: colors.bgCard,
    },
    logDate: {
      width: 36, height: 36,
      backgroundColor: colors.bgCard,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    logDateNum: { fontSize: 14, fontWeight: '500', color: colors.textPrimary, lineHeight: 16 },
    logDateDay: { fontSize: 9, color: colors.textMuted },
    logInfo:   { flex: 1 },
    logTimes:  { color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 2 },
    logHours:  { color: colors.textMuted, fontSize: 11 },
    pill: {
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 6, borderWidth: 1,
    },
    pillText:    { fontSize: 11, fontWeight: '500' },
    pillFull:    { backgroundColor: colors.successBg, borderColor: colors.successBorder },
    pillPartial: { backgroundColor: colors.warningBg, borderColor: colors.warningBorder },
    pillAbsent:  { backgroundColor: colors.dangerBg,  borderColor: colors.dangerBorder },
  });
  
  const [attendance, setAttendance] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await api.get(API.MY_ATTENDANCE);
      setAttendance(res.data.data || []);
    } catch (err) {
      console.log('Attendance fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const onRefresh = () => { setRefreshing(true); fetchAttendance(); };

  // Build week strip (last 7 days)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const getAttendanceForDate = (date) => {
    return attendance.find(a => {
      const d = new Date(a.check_in);
      return d.toDateString() === date.toDateString();
    });
  };

  const getPillStyle = (record) => {
    if (!record) return { style: styles.pillAbsent, text: 'Absent', color: colors.danger };
    if (!record.check_out) return { style: styles.pillPartial, text: 'Active', color: colors.warning };
    const hours = record.total_hours || 0;
    if (hours >= 8) return { style: styles.pillFull, text: 'Full', color: colors.success };
    return { style: styles.pillPartial, text: 'Partial', color: colors.warning };
  };

  // Stats
  const thisWeekRecords = weekDays.map(d => getAttendanceForDate(d)).filter(Boolean);
  const weekHours = thisWeekRecords.reduce((s, a) => s + (a.total_hours || 0), 0).toFixed(1);
  const monthRecords = attendance.filter(a => {
    const d = new Date(a.check_in);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthHours = monthRecords.reduce((s, a) => s + (a.total_hours || 0), 0).toFixed(0);

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
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Week strip */}
        <View style={styles.weekStrip}>
          {weekDays.map((day, i) => {
            const record  = getAttendanceForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = selectedDay?.toDateString() === day.toDateString();
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayBtn,
                  record && styles.dayBtnHasData,
                  (isToday || isSelected) && styles.dayBtnActive,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayName, (isToday || isSelected) && styles.dayTextActive]}>
                  {DAYS[day.getDay()]}
                </Text>
                <Text style={[styles.dayNum, (isToday || isSelected) && styles.dayTextActive]}>
                  {day.getDate()}
                </Text>
                <View style={[styles.dayDot, (isToday || isSelected) && styles.dayDotActive, !record && { opacity: 0 }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.sumCard}>
            <Text style={styles.sumLabel}>This week</Text>
            <Text style={styles.sumValue}>{weekHours}h</Text>
            <Text style={[styles.sumSub, { color: colors.success }]}>
              {thisWeekRecords.length} days
            </Text>
          </View>
          <View style={styles.sumCard}>
            <Text style={styles.sumLabel}>This month</Text>
            <Text style={styles.sumValue}>{monthHours}h</Text>
            <Text style={[styles.sumSub, { color: colors.accent }]}>
              {monthRecords.length} days
            </Text>
          </View>
        </View>

        {/* Log list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This week</Text>
        </View>

        {weekDays.slice().reverse().map((day, i) => {
          const record = getAttendanceForDate(day);
          const pill   = getPillStyle(record);
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <View key={i} style={styles.logItem}>
              <View style={styles.logDate}>
                <Text style={styles.logDateNum}>{day.getDate()}</Text>
                <Text style={styles.logDateDay}>{DAYS[day.getDay()]}</Text>
              </View>
              <View style={styles.logInfo}>
                {record ? (
                  <>
                    <Text style={styles.logTimes}>
                      {new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {record.check_out
                        ? ` → ${new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : ' → Active'}
                    </Text>
                    <Text style={styles.logHours}>
                      {record.total_hours ? `${record.total_hours.toFixed(1)}h` : 'In progress'}
                      {record.door_name ? ` · ${record.door_name}` : ''}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.logTimes}>—</Text>
                    <Text style={styles.logHours}>
                      {isToday ? 'Not checked in yet' : 'No check-in recorded'}
                    </Text>
                  </>
                )}
              </View>
              <View style={[styles.pill, pill.style]}>
                <Text style={[styles.pillText, { color: pill.color }]}>{pill.text}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

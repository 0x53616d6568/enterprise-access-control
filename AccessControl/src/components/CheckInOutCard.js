/**
 * Check-In/Check-Out Component
 * Professional UI for attendance tracking
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeColors from '../hooks/useThemeColors';
import { api } from '../services/apiService';
import { API } from '../constants/api';

export default function CheckInOutCard({ onStatusChange }) {
  const colors = useThemeColors();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [showModal, setShowModal] = useState(false);

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      overflow: 'hidden',
    },
    cardActive: {
      borderColor: colors.accent,
      borderWidth: 2,
      backgroundColor: colors.bgCard,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.bgHover,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.accent,
    },
    statusSection: {
      marginBottom: 16,
    },
    statusLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statusValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    statusSub: {
      fontSize: 12,
      color: colors.textMuted,
    },
    timeDisplay: {
      alignItems: 'center',
      paddingVertical: 16,
      marginBottom: 16,
      backgroundColor: colors.bgHover,
      borderRadius: 12,
    },
    timeLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    timeLarge: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.accent,
      fontVariant: ['tabular-nums'],
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    buttonCheckIn: {
      backgroundColor: colors.success,
    },
    buttonCheckOut: {
      backgroundColor: colors.danger,
    },
    buttonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    emptyIcon: {
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    emptySub: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });

  // Fetch current check-in status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get(`${API.ATTENDANCE}/status/current`);
      if (res.data.data) {
        setStatus(res.data.data);
        if (onStatusChange) onStatusChange(res.data.data);
      } else {
        setStatus(null);
        if (onStatusChange) onStatusChange(null);
      }
    } catch (err) {
      console.log('Status fetch error:', err.message);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Update elapsed time for active check-in
  useEffect(() => {
    if (!status || !status.check_in || status.check_out) return;

    const updateElapsed = () => {
      const checkIn = new Date(status.check_in);
      const now = new Date();
      const diff = now - checkIn;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Handle check-in
  const handleCheckIn = async () => {
    try {
      setLoading(true);
      // Assuming door_id = 1 (Main Entrance) for simplicity
      const res = await api.post(`${API.ATTENDANCE}/check-in`, {
        door_id: 1,
        notes: 'Auto check-in via mobile app',
      });
      Alert.alert('Success', 'You have been checked in successfully!');
      fetchStatus();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    try {
      setLoading(true);
      const res = await api.post(`${API.ATTENDANCE}/check-out`, {
        attendance_id: status.attendance_id,
        notes: 'Check-out via mobile app',
      });
      Alert.alert('Success', `You have been checked out. Total time: ${res.data.data.total_hours}h`);
      setShowModal(false);
      fetchStatus();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={[styles.card, status && !status.check_out && styles.cardActive]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Attendance</Text>
          {status && !status.check_out && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>● Active</Text>
            </View>
          )}
        </View>

        {/* Status */}
        {!status || status.check_out ? (
          // Not checked in
          <View style={styles.emptyState}>
            <Ionicons
              name="log-in"
              size={40}
              color={colors.textMuted}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>Not checked in</Text>
            <Text style={styles.emptySub}>Tap below to check in</Text>
          </View>
        ) : (
          // Checked in - show elapsed time
          <>
            <View style={styles.statusSection}>
              <Text style={styles.statusLabel}>Check-In Time</Text>
              <Text style={styles.statusValue}>
                {new Date(status.check_in).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </Text>
              <Text style={styles.statusSub}>
                {new Date(status.check_in).toLocaleDateString()}
              </Text>
            </View>

            {/* Elapsed time display */}
            <View style={styles.timeDisplay}>
              <Text style={styles.timeLabel}>Time Elapsed</Text>
              <Text style={styles.timeLarge}>{elapsedTime}</Text>
            </View>

            {status.door_name && (
              <View style={styles.statusSection}>
                <Text style={styles.statusLabel}>Door</Text>
                <Text style={styles.statusValue}>{status.door_name}</Text>
              </View>
            )}
          </>
        )}

        {/* Action buttons */}
        <View style={styles.buttonContainer}>
          {!status || status.check_out ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonCheckIn]}
              onPress={handleCheckIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Check In</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.buttonCheckOut]}
              onPress={() => setShowModal(true)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-out" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Check Out</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Check-out confirmation modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'transparent',
            }}
          >
            <View
              style={{
                backgroundColor: colors.bgCard,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                paddingBottom: 40,
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
                  Confirm Check-Out
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Stats */}
              <View
                style={{
                  backgroundColor: colors.bgHover,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>CHECK-IN</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>
                    {new Date(status.check_in).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>CHECK-OUT</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.border,
                    marginVertical: 8,
                  }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>ELAPSED TIME</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>
                    {elapsedTime}
                  </Text>
                </View>
              </View>

              {/* Buttons */}
              <TouchableOpacity
                style={{
                  backgroundColor: colors.danger,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginBottom: 10,
                }}
                onPress={handleCheckOut}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Confirm Check-Out</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: colors.bgHover,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
                onPress={() => setShowModal(false)}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

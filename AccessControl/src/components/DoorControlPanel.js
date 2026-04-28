import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMQTT } from '../context/MQTTContext';
import useThemeColors from '../hooks/useThemeColors';

export function DoorControlPanel({ doorId, doorName }) {
  const { connected, publishUnlock, publishLock, publishStatus, doorStatus, lastMessage } = useMQTT();
  const [loading, setLoading] = useState(null);
  const colors = useThemeColors();

  const handleUnlock = () => {
    setLoading('unlock');
    setTimeout(() => {
      publishUnlock(doorId, 5000);
      setLoading(null);
    }, 100);
  };

  const handleLock = () => {
    setLoading('lock');
    setTimeout(() => {
      publishLock(doorId);
      setLoading(null);
    }, 100);
  };

  const handleStatus = () => {
    setLoading('status');
    setTimeout(() => {
      publishStatus(doorId);
      setLoading(null);
    }, 100);
  };

  const currentStatus = doorStatus[doorId] || 'UNKNOWN';
  const statusColor = currentStatus === 'LOCKED' ? colors.accent : 
                      currentStatus === 'UNLOCKED' ? '#4CAF50' : 
                      colors.textMuted;

  const styles = StyleSheet.create({
    panel: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12
    },
    title: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600'
    },
    statusBadge: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: statusColor
    },
    statusText: {
      color: statusColor,
      fontSize: 11,
      fontWeight: '600'
    },
    connectionStatus: {
      color: connected ? '#4CAF50' : colors.textMuted,
      fontSize: 11,
      fontWeight: '500'
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12
    },
    button: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6
    },
    unlockBtn: {
      backgroundColor: '#4CAF50',
      borderColor: '#45a049',
    },
    lockBtn: {
      backgroundColor: colors.accent,
      borderColor: colors.accentDark,
    },
    statusBtn: {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
    },
    buttonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600'
    },
    statusBtnText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '600'
    },
    lastMessageContainer: {
      backgroundColor: colors.bg,
      padding: 10,
      borderRadius: 6,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent
    },
    lastMessageLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: 4
    },
    lastMessageText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontFamily: 'monospace'
    }
  });

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Direct Control</Text>
        <View style={styles.statusBadge}>
          <Text style={[styles.connectionStatus, { color: connected ? '#4CAF50' : colors.textMuted }]}>
            {connected ? '● Connected' : '○ Disconnected'}
          </Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>Door Status:</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{currentStatus}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.unlockBtn]}
          onPress={handleUnlock}
          disabled={!connected || loading !== null}
        >
          {loading === 'unlock' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-open" size={16} color="#fff" />
              <Text style={styles.buttonText}>Unlock</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.lockBtn]}
          onPress={handleLock}
          disabled={!connected || loading !== null}
        >
          {loading === 'lock' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={16} color="#fff" />
              <Text style={styles.buttonText}>Lock</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.statusBtn]}
          onPress={handleStatus}
          disabled={!connected || loading !== null}
        >
          {loading === 'status' ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="information-circle" size={16} color={colors.textPrimary} />
              <Text style={styles.statusBtnText}>Status</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {lastMessage && lastMessage.topic.includes(`doors/${doorId}`) && (
        <View style={styles.lastMessageContainer}>
          <Text style={styles.lastMessageLabel}>Last Message</Text>
          <Text style={styles.lastMessageText}>{lastMessage.payload.substring(0, 100)}</Text>
        </View>
      )}
    </View>
  );
}

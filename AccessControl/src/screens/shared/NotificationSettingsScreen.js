import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { saveNotificationPreferences, getNotificationPreferences } from '../../services/preferencesService';
import useThemeColors from '../../hooks/useThemeColors';

const SETTINGS = [
  {
    section: 'Access events',
    items: [
      { key: 'access_granted', label: 'Access granted',    sub: 'When you enter a door successfully',  default: true },
      { key: 'access_denied',  label: 'Access denied',     sub: 'When entry is refused at a door',     default: true },
      { key: 'face_fail',      label: 'Face auth failed',  sub: 'When face recognition fails',         default: true },
    ]
  },
  {
    section: 'Requests',
    items: [
      { key: 'req_approved', label: 'Request approved', sub: 'When a manager approves your request',  default: true },
      { key: 'req_rejected', label: 'Request rejected', sub: 'When a manager rejects your request',   default: true },
      { key: 'new_request',  label: 'New request',      sub: 'When a team member submits a request',  default: false },
    ]
  },
  {
    section: 'Visitors',
    items: [
      { key: 'visitor_arrived', label: 'Visitor arrived', sub: 'When your visitor checks in',         default: true },
      { key: 'visitor_expired', label: 'Visitor expired', sub: 'When a visitor pass expires',         default: false },
    ]
  },
  {
    section: 'System',
    items: [
      { key: 'token_expiry', label: 'BLE token expiring', sub: 'Reminder before your token expires',  default: true },
      { key: 'security_alert', label: 'Security alerts', sub: 'Unusual access patterns detected',     default: true },
    ]
  },
];

export default function NotificationSettingsScreen({ navigation }) {
  const { accessToken } = useAuth();
  const { showAlert } = useAlert();
  const colors = useThemeColors();
  const initialState = {};
  SETTINGS.forEach(s => s.items.forEach(i => { initialState[i.key] = i.default; }));
  const [settings, setSettings] = useState(initialState);
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getNotificationPreferences(accessToken);
        // Merge loaded preferences with defaults to ensure all fields exist
        setSettings(prev => ({ ...prev, ...prefs }));
      } catch (err) {
        console.log('Failed to load notification preferences:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, [accessToken]);

  // Reload preferences every time screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const reloadPreferences = async () => {
        try {
          const prefs = await getNotificationPreferences(accessToken);
          setSettings(prev => ({ ...prev, ...prefs }));
        } catch (err) {
          console.log('Failed to reload notification preferences:', err.message);
        }
      };
      reloadPreferences();
    }, [accessToken])
  );

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Ensure all values are properly typed as booleans
      const settingsToSave = {};
      const validKeys = [
        'access_granted', 'access_denied', 'face_fail',
        'req_approved', 'req_rejected', 'new_request',
        'visitor_arrived', 'visitor_expired',
        'token_expiry', 'security_alert'
      ];
      
      validKeys.forEach(key => {
        settingsToSave[key] = settings[key] === true;
      });

      await saveNotificationPreferences(accessToken, settingsToSave);
      showAlert('Success', 'Your notification preferences have been saved.', [{ text: 'OK' }], 'success');
      
      // Manually reload to ensure we show saved data
      setTimeout(async () => {
        try {
          const prefs = await getNotificationPreferences(accessToken);
          setSettings(prev => { return { ...prev, ...prefs }; });
        } catch (reloadErr) {
          console.error('Failed to reload:', reloadErr.message);
        }
      }, 300);
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to save preferences. Please try again.';
      showAlert('Error', message, [{ text: 'OK' }], 'error');
    } finally {
      setSaving(false);
    }
  };

  // Styles must be defined inside component to access dynamic colors
  const styles = StyleSheet.create({
    safe:      { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
    header:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    backBtn:   { width: 34, height: 34, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title:     { color: colors.textPrimary, fontSize: 20, fontWeight: '500', letterSpacing: -0.4 },
    subtitle:  { color: colors.textMuted, fontSize: 12 },
    sectionLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
    card:      { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
    row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowInfo:   { flex: 1, paddingRight: 12 },
    rowLabel:  { color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 2 },
    rowSub:    { color: colors.textMuted, fontSize: 11 },
    saveBtn:   { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>Choose what you want to be notified about</Text>
          </View>
        </View>

        {SETTINGS.map((section) => (
          <View key={section.section}>
            <Text style={styles.sectionLabel}>{section.section}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <View key={item.key} style={[styles.row, i === section.items.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowSub}>{item.sub}</Text>
                  </View>
                  <Switch
                    value={settings[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.saveBtn, (saving || loading) && { opacity: 0.7 }]} onPress={handleSave} disabled={saving || loading}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save preferences</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
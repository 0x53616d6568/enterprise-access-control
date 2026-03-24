import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import colors from '../../constants/colors';

const SECURITY_LEVELS = [
  { level: 1, label: 'Level 1 — Standard',   sub: 'BLE only',            color: colors.success,  bg: colors.successBg,  border: colors.successBorder },
  { level: 3, label: 'Level 3 — Elevated',   sub: 'BLE + manager rule',  color: colors.warning,  bg: colors.warningBg,  border: colors.warningBorder },
  { level: 5, label: 'Level 5 — High Security', sub: 'BLE + Face auth',  color: colors.danger,   bg: colors.dangerBg,   border: colors.dangerBorder },
];

const FALLBACK_METHODS = ['NONE', 'PIN', 'ADMIN_OVERRIDE'];

export default function EditDoorScreen({ navigation, route }) {
  const { accessToken } = useAuth();
  const { doorId } = route.params;
  
  const [doorName,      setDoorName]      = useState('');
  const [location,      setLocation]      = useState('');
  const [piDeviceId,    setPiDeviceId]    = useState('');
  const [securityLevel, setSecurityLevel] = useState(1);
  const [fallback,      setFallback]      = useState('NONE');
  const [requiresFace,  setRequiresFace]  = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [showFallback,  setShowFallback]  = useState(false);

  const headers = { Authorization: `Bearer ${accessToken}` };

  // Load door data on mount
  useEffect(() => {
    const loadDoor = async () => {
      try {
        const res = await axios.get(`${API.DOORS}/${doorId}`, { headers });
        const door = res.data.data;
        setDoorName(door.door_name || '');
        setLocation(door.location || '');
        setPiDeviceId(door.pi_device_id || '');
        setSecurityLevel(door.security_level || 1);
        setFallback(door.fallback_method || 'NONE');
        setRequiresFace(door.requires_face_auth === 1 || door.requires_face_auth === true);
      } catch (err) {
        Alert.alert('Error', 'Failed to load door details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    loadDoor();
  }, [doorId]);

  const handleLevelSelect = (level) => {
    setSecurityLevel(level);
    if (level === 5) setRequiresFace(true);
    if (level === 1) setRequiresFace(false);
  };

  const handleSave = async () => {
    if (!doorName.trim()) {
      Alert.alert('Missing fields', 'Door name is required.');
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API.DOORS}/${doorId}`, {
        door_name:          doorName.trim(),
        location:           location.trim(),
        pi_device_id:       piDeviceId.trim() || null,
        security_level:     securityLevel,
        requires_face_auth: requiresFace ? 1 : 0,
        fallback_method:    fallback,
      }, { headers });
      Alert.alert('Success', 'Door updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update door.');
    } finally {
      setSaving(false);
    }
  };

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Edit door</Text>
              <Text style={styles.subtitle}>Update door configuration</Text>
            </View>
          </View>

          {/* Door name */}
          <View style={styles.field}>
            <Text style={styles.label}>Door name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Server Room A"
              placeholderTextColor={colors.textHint}
              value={doorName}
              onChangeText={setDoorName}
            />
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Building 2, Floor 3"
              placeholderTextColor={colors.textHint}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Pi Device ID */}
          <View style={styles.field}>
            <Text style={styles.label}>Raspberry Pi Device ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. pi-door-01"
              placeholderTextColor={colors.textHint}
              autoCapitalize="none"
              value={piDeviceId}
              onChangeText={setPiDeviceId}
            />
          </View>

          {/* Security level */}
          <View style={styles.field}>
            <Text style={styles.label}>Security Level</Text>
            <View style={styles.levelGrid}>
              {SECURITY_LEVELS.map(s => (
                <TouchableOpacity
                  key={s.level}
                  style={[
                    styles.levelOpt,
                    securityLevel === s.level && { borderColor: s.color, backgroundColor: s.bg },
                  ]}
                  onPress={() => handleLevelSelect(s.level)}
                >
                  <View style={[styles.levelBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
                    <Text style={[styles.levelBadgeText, { color: s.color }]}>{s.level}</Text>
                  </View>
                  <Text style={[styles.levelLabel, securityLevel === s.level && { color: colors.textPrimary }]}>
                    {s.label}
                  </Text>
                  <Text style={styles.levelSub}>{s.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Face auth toggle */}
          <View style={styles.field}>
            <Text style={styles.label}>Face Authentication</Text>
            <TouchableOpacity
              style={[styles.toggleRow, requiresFace && { borderColor: colors.accent, backgroundColor: colors.bgDeep }]}
              onPress={() => setRequiresFace(!requiresFace)}
            >
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIcon, requiresFace
                  ? { backgroundColor: colors.bgDeep, borderColor: colors.accentDark }
                  : { backgroundColor: colors.bgCard, borderColor: colors.border }
                ]}>
                  <Ionicons name="scan-outline" size={14} color={requiresFace ? colors.accentText : colors.textMuted} />
                </View>
                <View>
                  <Text style={[styles.toggleLabel, requiresFace && { color: colors.textPrimary }]}>
                    Require face recognition
                  </Text>
                  <Text style={styles.toggleSub}>Enables ArcFace Layer 2 auth</Text>
                </View>
              </View>
              <View style={[styles.checkbox, requiresFace && styles.checkboxActive]}>
                {requiresFace && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Fallback method */}
          <View style={styles.field}>
            <Text style={styles.label}>Fallback Method</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setShowFallback(!showFallback)}
            >
              <Text style={styles.selectText}>{fallback}</Text>
              <Ionicons name={showFallback ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
            </TouchableOpacity>
            {showFallback && (
              <View style={styles.picker}>
                {FALLBACK_METHODS.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.pickerOpt, fallback === f && styles.pickerOptActive]}
                    onPress={() => { setFallback(f); setShowFallback(false); }}
                  >
                    <Text style={[styles.pickerOptText, fallback === f && { color: colors.accentText }]}>{f}</Text>
                    {fallback === f && <Ionicons name="checkmark" size={14} color={colors.accent} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={14} color={colors.accentText} style={{ marginTop: 1 }} />
            <Text style={styles.infoText}>
              Changes will be synced to the Pi device on its next heartbeat.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Save changes</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  container:   { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  backBtn:     { width: 34, height: 34, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title:       { color: colors.textPrimary, fontSize: 20, fontWeight: '500', letterSpacing: -0.4, marginBottom: 2 },
  subtitle:    { color: colors.textMuted, fontSize: 12 },
  field:       { marginBottom: 18 },
  label:       { color: colors.textMuted, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  input:       { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: colors.textPrimary, fontSize: 13 },
  levelGrid:   { gap: 8 },
  levelOpt:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14 },
  levelBadge:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  levelBadgeText: { fontSize: 12, fontWeight: '600' },
  levelLabel:  { color: colors.textSecondary, fontSize: 13, fontWeight: '500', flex: 1 },
  levelSub:    { color: colors.textMuted, fontSize: 11 },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14 },
  toggleLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleIcon:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  toggleLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 2 },
  toggleSub:   { color: colors.textMuted, fontSize: 11 },
  checkbox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  selectBtn:   { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText:  { color: colors.textPrimary, fontSize: 13 },
  picker:      { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  pickerOpt:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptActive: { backgroundColor: colors.bgDeep },
  pickerOptText: { color: colors.textPrimary, fontSize: 13 },
  infoBox:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 10, padding: 14, marginBottom: 20 },
  infoText:    { color: colors.accentText, fontSize: 12, lineHeight: 18, flex: 1 },
  submitBtn:   { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitText:  { color: '#fff', fontSize: 15, fontWeight: '500' },
});

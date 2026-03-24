import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { saveThemePreferences, getThemePreferences } from '../../services/preferencesService';
import useThemeColors from '../../hooks/useThemeColors';

const THEMES = [
  { id: 'dark',   label: 'Dark Mode',      sub: 'Optimized for security environments',  icon: 'moon-outline' },
  { id: 'light',  label: 'Light Mode',     sub: 'High contrast in bright environments', icon: 'sunny-outline' },
  { id: 'system', label: 'System Default', sub: 'Follows your device setting',           icon: 'phone-portrait-outline' },
];

const ACCENT_COLORS = [
  { id: 'blue',   color: '#2D7DD2', label: 'Blue' },
  { id: 'green',  color: '#3D8F3D', label: 'Green' },
  { id: 'purple', color: '#8957E5', label: 'Purple' },
  { id: 'orange', color: '#D29922', label: 'Amber' },
];

export default function AppearanceScreen({ navigation }) {
  const { accessToken, updateTheme, updateAccentColor } = useAuth();
  const colors = useThemeColors();
  const [selectedTheme,  setSelectedTheme]  = useState('dark');
  const [selectedAccent, setSelectedAccent] = useState('blue');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getThemePreferences(accessToken);
        const theme = prefs.theme || 'dark';
        const accent = prefs.accentColor || 'blue';
        setSelectedTheme(theme);
        setSelectedAccent(accent);
        // Update context with loaded preferences
        updateTheme(theme);
        updateAccentColor(accent);
      } catch (err) {
        console.log('Failed to load preferences:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, [accessToken, updateTheme, updateAccentColor]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveThemePreferences(accessToken, selectedTheme, selectedAccent);
      // Update context immediately
      updateTheme(selectedTheme);
      updateAccentColor(selectedAccent);
      Alert.alert('Success', 'Theme preferences saved successfully.');
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to save preferences.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  // Styles must be defined inside component to access dynamic colors
  const styles = StyleSheet.create({
    safe:        { flex: 1, backgroundColor: colors.bg },
    container:   { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
    header:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
    backBtn:     { width: 34, height: 34, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title:       { color: colors.textPrimary, fontSize: 20, fontWeight: '500', letterSpacing: -0.4, marginBottom: 2 },
    subtitle:    { color: colors.textMuted, fontSize: 12 },
    sectionLabel:{ color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
    card:        { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
    row:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    iconWrap:    { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    iconWrapActive: { backgroundColor: colors.bgDeep, borderColor: colors.accentDark },
    rowInfo:     { flex: 1 },
    rowLabel:    { color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 2 },
    rowSub:      { color: colors.textMuted, fontSize: 11 },
    accentCard:  { flexDirection: 'row', gap: 8, marginBottom: 20 },
    accentOpt:   { flex: 1, alignItems: 'center', gap: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 },
    accentDot:   { width: 24, height: 24, borderRadius: 12 },
    accentLabel: { color: colors.textMuted, fontSize: 11 },
    infoBox:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 10, padding: 14, marginBottom: 24 },
    infoText:    { color: colors.accentText, fontSize: 12, lineHeight: 18, flex: 1 },
    saveBtn:     { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
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
            <Text style={styles.title}>Appearance</Text>
            <Text style={styles.subtitle}>Customize how the app looks</Text>
          </View>
        </View>

        {/* Theme */}
        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.card}>
          {THEMES.map((theme, i) => (
            <TouchableOpacity
              key={theme.id}
              style={[styles.row, i === THEMES.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => setSelectedTheme(theme.id)}
            >
              <View style={[styles.iconWrap, selectedTheme === theme.id && styles.iconWrapActive]}>
                <Ionicons
                  name={theme.icon}
                  size={16}
                  color={selectedTheme === theme.id ? colors.accentText : colors.textMuted}
                />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowLabel, selectedTheme === theme.id && { color: colors.textPrimary }]}>
                  {theme.label}
                </Text>
                <Text style={styles.rowSub}>{theme.sub}</Text>
              </View>
              {selectedTheme === theme.id && (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Accent color */}
        <Text style={styles.sectionLabel}>Accent Color</Text>
        <View style={styles.accentCard}>
          {ACCENT_COLORS.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[styles.accentOpt, selectedAccent === a.id && { borderColor: a.color, borderWidth: 2 }]}
              onPress={() => setSelectedAccent(a.id)}
            >
              <View style={[styles.accentDot, { backgroundColor: a.color }]} />
              <Text style={[styles.accentLabel, selectedAccent === a.id && { color: colors.textPrimary }]}>
                {a.label}
              </Text>
              {selectedAccent === a.id && (
                <Ionicons name="checkmark" size={12} color={a.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Info note */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color={colors.accentText} style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            The app is optimized for Dark Mode to reduce eye strain in security environments.
            Light mode may have limited support on some screens.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, (saving || loading) && { opacity: 0.6 }]} 
          onPress={handleSave}
          disabled={saving || loading}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save preferences</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
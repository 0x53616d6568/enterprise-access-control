import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

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
  const [selectedTheme,  setSelectedTheme]  = useState('dark');
  const [selectedAccent, setSelectedAccent] = useState('blue');

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

        <TouchableOpacity style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save preferences</Text>
        </TouchableOpacity>

      </ScrollView>
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
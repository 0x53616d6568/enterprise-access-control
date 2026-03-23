import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import colors from '../../constants/colors';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = user?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const getRoleBadge = (level) => {
    if (level >= 5) return { label: 'Administrator', color: colors.accentText,    bg: colors.bgDeep,    border: colors.accentDark };
    if (level >= 3) return { label: 'Manager',       color: colors.managerColor, bg: colors.managerBg, border: colors.managerBorder };
    return                  { label: 'Employee',     color: colors.textMuted,    bg: colors.bgCard,    border: colors.border };
  };

  const roleBadge = getRoleBadge(user?.access_level);

  const MENU_ITEMS = [
    { key: 'security',      label: 'Security & BLE token',  icon: 'shield-checkmark-outline', color: colors.accentText,  bg: colors.bgDeep,    border: colors.accentDark,    onPress: () => navigation.navigate('BLEToken') },
    { key: 'notifications', label: 'Notifications',         icon: 'notifications-outline',    color: colors.success,     bg: colors.successBg, border: colors.successBorder, onPress: () => navigation.navigate('NotificationSettings') },
    { key: 'appearance',    label: 'Appearance',            icon: 'sunny-outline',            color: colors.warning,     bg: colors.warningBg, border: colors.warningBorder, onPress: () => navigation.navigate('Appearance') },
  ];

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try { await logout(); }
          catch (err) { console.log('Logout error:', err.message); }
          finally { setLoggingOut(false); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Profile hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.name}>{user?.full_name}</Text>
            <Text style={styles.email}>{user?.department} · {user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg, borderColor: roleBadge.border }]}>
              <Ionicons name="person-outline" size={10} color={roleBadge.color} />
              <Text style={[styles.roleText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
            </View>
          </View>
        </View>

        {/* Account info */}
        <Text style={styles.sectionLabel}>Account info</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}><Ionicons name="call-outline" size={13} color={colors.textMuted} /></View>
              <Text style={styles.infoLabel}>Phone</Text>
            </View>
            <Text style={styles.infoValue}>{user?.phone || 'Not set'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}><Ionicons name="business-outline" size={13} color={colors.textMuted} /></View>
              <Text style={styles.infoLabel}>Department</Text>
            </View>
            <Text style={styles.infoValue}>{user?.department || '—'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIcon}><Ionicons name="time-outline" size={13} color={colors.textMuted} /></View>
              <Text style={styles.infoLabel}>Last login</Text>
            </View>
            <Text style={styles.infoValue}>
              {user?.last_login
                ? new Date(user.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Now'}
            </Text>
          </View>
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>Settings</Text>
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuRow, i === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={item.onPress}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: item.bg, borderColor: item.border }]}>
                  <Ionicons name={item.icon} size={14} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}

          {/* Sign out */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
                {loggingOut
                  ? <ActivityIndicator size="small" color={colors.danger} />
                  : <Ionicons name="log-out-outline" size={14} color={colors.danger} />
                }
              </View>
              <Text style={[styles.menuLabel, { color: colors.danger }]}>Sign out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Enterprise Access Control · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  hero:      { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
  avatar:    { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accentText, fontSize: 22, fontWeight: '500' },
  heroInfo:  { flex: 1 },
  name:      { color: colors.textPrimary, fontSize: 18, fontWeight: '500', letterSpacing: -0.3, marginBottom: 3 },
  email:     { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText:  { fontSize: 11 },
  sectionLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  infoCard:  { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  infoRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon:  { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { color: colors.textSecondary, fontSize: 13 },
  infoValue: { color: colors.textPrimary, fontSize: 13 },
  menuCard:  { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  menuRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuIcon:  { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  menuLabel: { color: colors.textPrimary, fontSize: 13 },
  version:   { textAlign: 'center', color: '#3D444D', fontSize: 11 },
});

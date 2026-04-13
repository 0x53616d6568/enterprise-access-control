import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { api } from '../../services/apiService';
import { resendVerificationEmail } from '../../services/emailService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const colors = useThemeColors();
  
  const styles = StyleSheet.create({
    safe:      { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
    hero:      { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
    avatarContainer: { position: 'relative' },
    avatar:    { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
    avatarImage: { width: 68, height: 68, borderRadius: 22 },
    avatarText: { color: colors.accentText, fontSize: 24, fontWeight: '600' },
    editBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: colors.accent, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg },
    heroInfo:  { flex: 1 },
    name:      { color: colors.textPrimary, fontSize: 19, fontWeight: '600', letterSpacing: -0.4, marginBottom: 2 },
    email:     { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
    roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    roleText:  { fontSize: 11, fontWeight: '500' },
    sectionLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
    infoCard:  { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
    infoRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoIcon:  { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    infoLabel: { color: colors.textSecondary, fontSize: 13 },
    infoValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
    menuCard:  { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden' },
    menuRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    menuLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuIcon:  { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    menuLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '400' },
    version:   { textAlign: 'center', color: '#3D444D', fontSize: 11, marginTop: 32 },
  });
  
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Generate initials for the avatar placeholder
  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const getRoleBadge = (level) => {
    if (level >= 5) return { label: 'Administrator', color: colors.accentText,    bg: colors.bgDeep,    border: colors.accentDark };
    if (level >= 3) return { label: 'Manager',       color: colors.managerColor, bg: colors.managerBg, border: colors.managerBorder };
    return                  { label: 'Employee',     color: colors.textMuted,    bg: colors.bgCard,    border: colors.border };
  };

  const roleBadge = getRoleBadge(user?.access_level);

  const SETTINGS_GROUPS = [
    {
      title: 'Security & Access',
      items: [
        { 
          key: 'security', 
          label: 'Security & BLE token', 
          icon: 'shield-checkmark-outline', 
          color: colors.accentText, 
          bg: colors.bgDeep, 
          border: colors.accentDark, 
          onPress: () => navigation.navigate('BLEToken') 
        },
        { 
          key: 'password', 
          label: 'Change Password', 
          icon: 'key-outline', 
          color: colors.warning, 
          bg: colors.warningBg, 
          border: colors.warningBorder, 
          onPress: () => navigation.navigate('ChangeCurrentPassword') 
        },
        { 
          key: 'resendEmail', 
          label: 'Resend Verification Email', 
          icon: 'mail-outline', 
          color: colors.success, 
          bg: colors.successBg, 
          border: colors.successBorder, 
          onPress: handleResendVerificationEmail,
          loading: resendingEmail
        },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { 
          key: 'notifications', 
          label: 'Notifications', 
          icon: 'notifications-outline', 
          color: colors.success, 
          bg: colors.successBg, 
          border: colors.successBorder, 
          onPress: () => navigation.navigate('NotificationSettings') 
        },
        { 
          key: 'appearance', 
          label: 'Appearance', 
          icon: 'sunny-outline', 
          color: colors.warning, 
          bg: colors.warningBg, 
          border: colors.warningBorder, 
          onPress: () => navigation.navigate('Appearance') 
        },
      ]
    }
  ];

  const handleLogout = () => {
    showAlert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
            setLoggingOut(false);
          },
        },
      ],
      'warning'
    );
  };

  const handleProfilePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(
          'Permission required',
          'Please allow access to your photo library.',
          [{ text: 'OK' }],
          'warning'
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) return;

      setUploadingPhoto(true);
      
      // Convert to base64 data URL
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;

      // Upload to server
      await api.put(API.USER(user.user_id), {
        avatar_url: base64Image,
      });

      // Refresh user data
      if (refreshUser) await refreshUser();
      showAlert(
        'Success',
        'Profile photo updated successfully!',
        [{ text: 'OK' }],
        'success'
      );
    } catch (err) {
      console.error('Photo upload error:', err);
      showAlert(
        'Error',
        'Failed to update profile photo. Please try again.',
        [{ text: 'OK' }],
        'error'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    try {
      setResendingEmail(true);
      await resendVerificationEmail();
      showAlert(
        'Success',
        'Verification email has been sent to your inbox!',
        [{ text: 'OK' }],
        'success'
      );
    } catch (err) {
      console.error('Resend email error:', err);
      showAlert(
        'Error',
        err.response?.data?.error || 'Failed to send verification email. Please try again.',
        [{ text: 'OK' }],
        'error'
      );
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.hero}>
          <View style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.editBadge} 
              activeOpacity={0.8}
              onPress={handleProfilePhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera-outline" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.heroInfo}>
            <Text style={styles.name}>{user?.full_name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg, borderColor: roleBadge.border }]}>
              <Ionicons name="shield-checkmark-outline" size={10} color={roleBadge.color} />
              <Text style={[styles.roleText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Account Info</Text>
        {/* FIXED: Changed <div> to <View> */}
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
                : 'Active Now'}
            </Text>
          </View>
        </View>

        {SETTINGS_GROUPS.map((group) => (
          <View key={group.title} style={{ marginBottom: 24 }}>
            <Text style={styles.sectionLabel}>{group.title}</Text>
            <View style={styles.menuCard}>
              {group.items.map((item, i) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.menuRow, i === group.items.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={item.onPress}
                  disabled={item.loading}
                >
                  <View style={styles.menuLeft}>
                    <View style={[styles.menuIcon, { backgroundColor: item.bg, borderColor: item.border }]}>
                      <Ionicons name={item.icon} size={14} color={item.color} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </View>
                  {item.loading ? (
                    <ActivityIndicator size="small" color={item.color} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity 
            style={styles.menuRow}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
              </View>
              <Text style={styles.menuLabel}>Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
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
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Enterprise Access Control · v1.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
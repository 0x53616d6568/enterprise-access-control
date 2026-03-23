import React, { useState } from 'react';
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

const ROLES = [
  { id: 1, label: 'Employee', icon: 'person-outline',   color: colors.success,      bg: colors.successBg,  border: colors.successBorder },
  { id: 2, label: 'Manager',  icon: 'people-outline',   color: colors.managerColor, bg: colors.managerBg,  border: colors.managerBorder },
  { id: 3, label: 'Admin',    icon: 'shield-outline',   color: colors.accentText,   bg: colors.bgDeep,     border: colors.accentDark },
];

const DEPARTMENTS = ['Engineering', 'Operations', 'IT', 'HR', 'Finance', 'Sales', 'Marketing'];

export default function AddUserScreen({ navigation }) {
  const { accessToken } = useAuth();
  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [department,  setDepartment]  = useState('');
  const [roleId,      setRoleId]      = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Missing fields', 'Name and email are required.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(API.USERS, {
        full_name:  fullName.trim(),
        email:      email.trim().toLowerCase(),
        phone:      phone.trim(),
        department: department,
        role_id:    roleId,
      }, { headers });
      Alert.alert('Success', 'Account created and welcome email sent!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

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
              <Text style={styles.title}>Add new user</Text>
              <Text style={styles.subtitle}>Account will be emailed to the user</Text>
            </View>
          </View>

          {/* Full name */}
          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John Anderson"
              placeholderTextColor={colors.textHint}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Work email</Text>
            <TextInput
              style={styles.input}
              placeholder="john@company.com"
              placeholderTextColor={colors.textHint}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>Phone (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={colors.textHint}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Department */}
          <View style={styles.field}>
            <Text style={styles.label}>Department</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setShowDeptPicker(!showDeptPicker)}
            >
              <Text style={[styles.selectText, !department && { color: colors.textHint }]}>
                {department || 'Select department'}
              </Text>
              <Ionicons name={showDeptPicker ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
            </TouchableOpacity>
            {showDeptPicker && (
              <View style={styles.deptPicker}>
                {DEPARTMENTS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.deptOpt, department === d && styles.deptOptActive]}
                    onPress={() => { setDepartment(d); setShowDeptPicker(false); }}
                  >
                    <Text style={[styles.deptOptText, department === d && { color: colors.accentText }]}>{d}</Text>
                    {department === d && <Ionicons name="checkmark" size={14} color={colors.accent} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Role */}
          <View style={styles.field}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleGrid}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleOpt, roleId === r.id && { borderColor: colors.accent, backgroundColor: colors.bgDeep }]}
                  onPress={() => setRoleId(r.id)}
                >
                  <View style={[styles.roleIcon, { backgroundColor: r.bg, borderColor: r.border }]}>
                    <Ionicons name={r.icon} size={14} color={r.color} />
                  </View>
                  <Text style={[styles.roleOptText, roleId === r.id && { color: colors.accentText }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={14} color={colors.accentText} style={{ marginTop: 1 }} />
            <Text style={styles.infoText}>
              A welcome email with login credentials and a temporary password will be sent automatically.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Create account &amp; send email</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  backBtn:   { width: 34, height: 34, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title:     { color: colors.textPrimary, fontSize: 20, fontWeight: '500', letterSpacing: -0.4, marginBottom: 2 },
  subtitle:  { color: colors.textMuted, fontSize: 12 },
  field:     { marginBottom: 16 },
  label:     { color: colors.textMuted, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  input:     { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: colors.textPrimary, fontSize: 13 },
  selectBtn: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { color: colors.textPrimary, fontSize: 13 },
  deptPicker: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  deptOpt:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  deptOptActive: { backgroundColor: colors.bgDeep },
  deptOptText: { color: colors.textPrimary, fontSize: 13 },
  roleGrid:  { flexDirection: 'row', gap: 8 },
  roleOpt:   { flex: 1, alignItems: 'center', gap: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14 },
  roleIcon:  { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  roleOptText: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  infoBox:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 10, padding: 14, marginBottom: 20 },
  infoText:  { color: colors.accentText, fontSize: 12, lineHeight: 18, flex: 1 },
  submitBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});

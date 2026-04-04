import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import { useAlert } from '../../context/AlertContext';
import useThemeColors from '../../hooks/useThemeColors';

export default function EditUserScreen({ navigation, route }) {
  const { user } = route.params;
  const { showAlert } = useAlert();
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    safe:      { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
    header:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    backBtn:   { width: 36, height: 36, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },
    title:     { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 2 },
    subtitle:  { color: colors.textMuted, fontSize: 13 },
    card:      { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 20, marginBottom: 20 },
    fieldWrap: { marginBottom: 16 },
    label:     { color: colors.textMuted, fontSize: 11, letterSpacing: 0.4, marginBottom: 8, textTransform: 'uppercase' },
    input:     { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: colors.textPrimary, fontSize: 14 },
    readOnly:  { backgroundColor: colors.bgDeep, color: colors.textMuted },
    saveBtn:   { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  });

  const [fullName,   setFullName]   = useState(user.full_name || '');
  const [phone,      setPhone]      = useState(user.phone || '');
  const [department, setDepartment] = useState(user.department || '');
  const [saving,     setSaving]     = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      showAlert('Required', 'Full name is required.', [{ text: 'OK' }], 'warning');
      return;
    }
    setSaving(true);
    try {
      await api.put(API.USER(user.user_id), {
        full_name: fullName.trim(),
        phone: phone.trim(),
        department: department.trim(),
      });
      showAlert(
        'Success',
        'User information updated successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
        'success'
      );
    } catch (err) {
      showAlert('Error', err?.response?.data?.message || 'Failed to update user.', [{ text: 'OK' }], 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.title}>Edit User</Text>
              <Text style={styles.subtitle}>Update user information</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.card}>
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor={colors.textHint}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.readOnly]}
                value={user.email}
                editable={false}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 234 567 8900"
                placeholderTextColor={colors.textHint}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={[styles.fieldWrap, { marginBottom: 0 }]}>
              <Text style={styles.label}>Department</Text>
              <TextInput
                style={styles.input}
                placeholder="Engineering"
                placeholderTextColor={colors.textHint}
                value={department}
                onChangeText={setDepartment}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

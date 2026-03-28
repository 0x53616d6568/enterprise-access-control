import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/authService';
import useThemeColors from '../../hooks/useThemeColors';

export default function ChangeCurrentPasswordScreen({ navigation }) {
  const { accessToken } = useAuth();
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    safe: {
      flex:            1,
      backgroundColor: colors.bg,
    },
    container: {
      flexGrow:          1,
      paddingHorizontal: 28,
      paddingTop:        40,
      paddingBottom:     32,
    },
    iconWrap: {
      width:           52,
      height:          52,
      backgroundColor: colors.bgDeep,
      borderWidth:     1,
      borderColor:     colors.accentDark,
      borderRadius:    16,
      alignItems:      'center',
      justifyContent:  'center',
      marginBottom:    24,
    },
    title: {
      color:         colors.textPrimary,
      fontSize:      24,
      fontWeight:    '500',
      letterSpacing: -0.4,
      marginBottom:  8,
    },
    subtitle: {
      color:        colors.textMuted,
      fontSize:     13,
      lineHeight:   20,
      marginBottom: 32,
    },
    fieldWrap: {
      marginBottom: 14,
    },
    label: {
      color:         colors.textMuted,
      fontSize:      11,
      letterSpacing: 0.4,
      marginBottom:  7,
      textTransform: 'uppercase',
    },
    passWrap: {
      flexDirection:     'row',
      alignItems:        'center',
      backgroundColor:   colors.bgInput,
      borderWidth:       1,
      borderColor:       colors.border,
      borderRadius:      10,
      paddingHorizontal: 14,
      paddingVertical:   13,
    },
    passInput: {
      flex:     1,
      color:    colors.textPrimary,
      fontSize: 14,
    },
    rules: {
      marginBottom: 24,
      gap:          8,
    },
    rule: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           8,
    },
    ruleDot: {
      width:           6,
      height:          6,
      borderRadius:    3,
      backgroundColor: '#484F58',
    },
    ruleDotPass: {
      backgroundColor: colors.success,
    },
    ruleText: {
      color:    '#484F58',
      fontSize: 12,
    },
    ruleTextPass: {
      color: colors.success,
    },
    btnPrimary: {
      backgroundColor: colors.accent,
      borderRadius:    12,
      paddingVertical: 15,
      alignItems:      'center',
      marginBottom:    14,
    },
    btnPrimaryText: {
      color:      '#fff',
      fontSize:   15,
      fontWeight: '500',
    },
  });

  const [currentPassword,  setCurrentPassword]  = useState('');
  const [newPassword,      setNewPassword]      = useState('');
  const [confirmPass,      setConfirmPass]      = useState('');
  const [loading,          setLoading]          = useState(false);
  const [showCurrent,      setShowCurrent]      = useState(false);
  const [showNew,          setShowNew]          = useState(false);
  const [showConfirm,      setShowConfirm]      = useState(false);

  const rules = [
    { label: 'At least 8 characters',    pass: newPassword.length >= 8 },
    { label: 'One uppercase letter',      pass: /[A-Z]/.test(newPassword) },
    { label: 'One number or symbol',      pass: /[0-9!@#$%^&*]/.test(newPassword) },
    { label: 'Passwords match',           pass: newPassword === confirmPass && confirmPass.length > 0 },
  ];

  const allRulesPassed = rules.every(r => r.pass);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPass) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (!allRulesPassed) {
      Alert.alert('Weak password', 'Please make sure all requirements are met.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(accessToken, currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully.');
      navigation.goBack();
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to change password.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={22} color={colors.accentText} />
          </View>

          {/* Heading */}
          <Text style={styles.title}>Change your password</Text>
          <Text style={styles.subtitle}>
            Please enter your current password and set a new one.
          </Text>

          {/* Current password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Current password</Text>
            <View style={styles.passWrap}>
              <TextInput
                style={styles.passInput}
                placeholder="Enter current password"
                placeholderTextColor={colors.textHint}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Ionicons
                  name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>New password</Text>
            <View style={styles.passWrap}>
              <TextInput
                style={styles.passInput}
                placeholder="Create a strong password"
                placeholderTextColor={colors.textHint}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Confirm new password</Text>
            <View style={styles.passWrap}>
              <TextInput
                style={styles.passInput}
                placeholder="Repeat new password"
                placeholderTextColor={colors.textHint}
                secureTextEntry={!showConfirm}
                value={confirmPass}
                onChangeText={setConfirmPass}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Rules */}
          <View style={styles.rules}>
            {rules.map((rule, i) => (
              <View key={i} style={styles.rule}>
                <View style={[styles.ruleDot, rule.pass && styles.ruleDotPass]} />
                <Text style={[styles.ruleText, rule.pass && styles.ruleTextPass]}>
                  {rule.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btnPrimary, (!allRulesPassed || loading) && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={!allRulesPassed || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>Update Password</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}



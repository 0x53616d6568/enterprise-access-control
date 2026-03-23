import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import colors from '../../constants/colors';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (result.is_first_login) {
        navigation.replace('ChangePassword');
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Login failed. Please try again.';
      Alert.alert('Login failed', message);
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
          {/* Secure badge */}
          <View style={styles.secureBadge}>
            <View style={styles.secureDot} />
            <Text style={styles.secureText}>Secure session</Text>
          </View>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Ionicons name="lock-closed" size={22} color={colors.accent} />
          </View>

          {/* Heading */}
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to your workspace</Text>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@company.com"
              placeholderTextColor={colors.textHint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passWrap}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0, padding: 0 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textHint}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign in button */}
          <TouchableOpacity
            style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>Sign in</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Biometric button */}
          <TouchableOpacity style={styles.btnSecondary}>
            <Ionicons name="finger-print-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.btnSecondaryText}>Fingerprint / Face ID</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>256-bit encrypted · Android</Text>
            <View style={styles.footerDot} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow:        1,
    paddingHorizontal: 28,
    paddingTop:      32,
    paddingBottom:   32,
  },
  secureBadge: {
    flexDirection:  'row',
    alignItems:     'center',
    alignSelf:      'flex-start',
    backgroundColor: colors.bgDeep,
    borderWidth:    1,
    borderColor:    colors.accentDark,
    borderRadius:   20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom:   20,
    gap:            6,
  },
  secureDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: colors.accent,
  },
  secureText: {
    color:    colors.accentText,
    fontSize: 11,
  },
  logoWrap: {
    width:           48,
    height:          48,
    backgroundColor: colors.bgDeep,
    borderWidth:     1,
    borderColor:     colors.accentDark,
    borderRadius:    14,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    24,
  },
  title: {
    color:        colors.textPrimary,
    fontSize:     28,
    fontWeight:   '500',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color:        colors.textMuted,
    fontSize:     14,
    marginBottom: 32,
    lineHeight:   20,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  label: {
    color:        colors.textMuted,
    fontSize:     11,
    letterSpacing: 0.4,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color:           colors.textPrimary,
    fontSize:        14,
  },
  passWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.bgInput,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  eyeBtn: {
    padding: 2,
  },
  forgotWrap: {
    alignSelf:    'flex-end',
    marginBottom: 20,
    marginTop:    -4,
  },
  forgotText: {
    color:    colors.accent,
    fontSize: 12,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius:    10,
    paddingVertical: 15,
    alignItems:      'center',
    marginBottom:    20,
  },
  btnPrimaryText: {
    color:      '#fff',
    fontSize:   15,
    fontWeight: '500',
  },
  divider: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    marginBottom:   20,
  },
  dividerLine: {
    flex:            1,
    height:          1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color:    '#484F58',
    fontSize: 12,
  },
  btnSecondary: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             10,
    backgroundColor: colors.bgCard,
    borderWidth:     1,
    borderColor:     colors.borderMid,
    borderRadius:    10,
    paddingVertical: 14,
    marginBottom:    32,
  },
  btnSecondaryText: {
    color:    colors.textSecondary,
    fontSize: 14,
  },
  footer: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    marginTop:      'auto',
  },
  footerDot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: colors.border,
  },
  footerText: {
    color:    '#3D444D',
    fontSize: 11,
  },
});

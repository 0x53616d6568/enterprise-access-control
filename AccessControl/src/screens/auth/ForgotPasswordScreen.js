import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { requestPasswordReset } from '../../services/emailService'

const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#21262D',
  text: '#F0F6FC',
  textSecondary: '#8B949E',
  accent: '#2D7DD2',
  accentLight: '#58A6FF',
  success: '#3D8F3D',
  danger: '#C53030',
}

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'

  const handleRequestReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await requestPasswordReset(email)
      setMessageType('success')
      setMessage(response.message || 'Reset email has been sent!')
      setEmail('')

      // Navigate back to login after 2 seconds
      setTimeout(() => {
        navigation.goBack()
      }, 2000)
    } catch (error) {
      setMessageType('error')
      setMessage(error.response?.data?.error || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={[COLORS.bg, '#1C2128']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your email to receive a password reset link</Text>
          </View>

          {/* Message */}
          {message && (
            <View
              style={[
                styles.messageBox,
                {
                  backgroundColor:
                    messageType === 'success'
                      ? 'rgba(61, 143, 61, 0.1)'
                      : 'rgba(197, 48, 48, 0.1)',
                  borderColor: messageType === 'success' ? COLORS.success : COLORS.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: messageType === 'success' ? COLORS.success : COLORS.danger },
                ]}
              >
                {message}
              </Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="your.email@company.com"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleRequestReset}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  messageBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    fontSize: 14,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  backButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.accentLight,
    fontWeight: '500',
  },
})

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useThemeColors from '../../hooks/useThemeColors';

const FAQ_ITEMS = [
  {
    question: 'How do I reset my password?',
    answer: 'Go to Settings > Change Password and enter your current password followed by your new password. Passwords must be at least 8 characters with uppercase letters and numbers.'
  },
  {
    question: 'How do I manage my notifications?',
    answer: 'Visit Settings > Notification Preferences to customize which notifications you receive. You can toggle each notification type on or off.'
  },
  {
    question: 'How do I request visitor access?',
    answer: 'Go to Visitors > Request Access, fill in visitor details, and submit. Managers will review and approve your request.'
  },
  {
    question: 'What should I do if face recognition fails?',
    answer: 'Face recognition may fail due to poor lighting or incorrect angle. Try repositioning yourself and ensure your face is clearly visible.'
  },
  {
    question: 'How do I check my access logs?',
    answer: 'Navigate to Logs to view your access history including door entries, timestamps, and recognition methods used.'
  },
  {
    question: 'Can I change my appearance theme?',
    answer: 'Yes! Go to Settings > Appearance to switch between Dark mode, Light mode, or System default, and choose your accent color.'
  },
];

const SOCIAL_LINKS = [
  { icon: 'logo-github', label: 'GitHub', url: 'https://github.com', color: '#333' },
  { icon: 'logo-twitter', label: 'Twitter', url: 'https://twitter.com', color: '#1DA1F2' },
  { icon: 'logo-linkedin', label: 'LinkedIn', url: 'https://linkedin.com', color: '#0077B5' },
  { icon: 'mail', label: 'Email', url: 'mailto:support@secureapp.com', color: '#EA4335' },
];

export default function HelpCenterScreen({ navigation }) {
  const colors = useThemeColors();
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const handleSocialPress = (url) => {
    Linking.openURL(url).catch(err =>
      Alert.alert('Error', 'Could not open link')
    );
  };

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const styles = StyleSheet.create({
    safe:           { flex: 1, backgroundColor: colors.bg },
    container:      { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
    header:         { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
    backBtn:        { width: 34, height: 34, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerText:     { flex: 1 },
    title:          { color: colors.textPrimary, fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
    subtitle:       { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    
    heroCard:       { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 20, marginBottom: 28, alignItems: 'center' },
    heroIcon:       { width: 60, height: 60, backgroundColor: colors.bgDeep, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    heroTitle:      { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
    heroSub:        { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    
    sectionLabel:   { color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' },
    card:           { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
    
    socialContainer:{ flexDirection: 'row', justifyContent: 'space-around' },
    socialBtn:      { alignItems: 'center', padding: 16, flex: 1 },
    socialIcon:     { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    socialLabel:    { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
    
    faqItem:        { borderBottomWidth: 1, borderBottomColor: colors.border },
    faqItemLast:    { borderBottomWidth: 0 },
    faqHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingHorizontal: 16 },
    faqQuestion:    { color: colors.textPrimary, fontSize: 14, fontWeight: '500', flex: 1, marginRight: 8 },
    faqIcon:        { color: colors.textMuted, fontSize: 18 },
    faqAnswer:      { paddingHorizontal: 16, paddingBottom: 16, color: colors.textMuted, fontSize: 13, lineHeight: 20 },
    
    infoBox:        { backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 12, padding: 16, marginTop: 20, flexDirection: 'row', gap: 12 },
    infoIcon:       { marginTop: 2 },
    infoText:       { color: colors.accentText, fontSize: 12, lineHeight: 18, flex: 1 },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Help Center</Text>
            <Text style={styles.subtitle}>Get support and answers</Text>
          </View>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={[styles.heroIcon, { backgroundColor: colors.accent + '20' }]}>
            <Ionicons name="help-circle" size={32} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>SecureApp Support</Text>
          <Text style={styles.heroSub}>
            Find answers to common questions and connect with our support team.
          </Text>
        </View>

        {/* Social Links */}
        <Text style={styles.sectionLabel}>Connect With Us</Text>
        <View style={styles.card}>
          <View style={styles.socialContainer}>
            {SOCIAL_LINKS.map((social, i) => (
              <TouchableOpacity
                key={i}
                style={styles.socialBtn}
                onPress={() => handleSocialPress(social.url)}
              >
                <View style={[styles.socialIcon, { backgroundColor: social.color + '15', borderWidth: 1, borderColor: social.color + '30' }]}>
                  <Ionicons name={social.icon} size={24} color={social.color} />
                </View>
                <Text style={styles.socialLabel}>{social.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>
        <View style={styles.card}>
          {FAQ_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.faqItem, index === FAQ_ITEMS.length - 1 && styles.faqItemLast]}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.6}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Ionicons
                  name={expandedFAQ === index ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </View>
              {expandedFAQ === index && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.accentText} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Can't find what you're looking for? Contact our support team through any of the social links above.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

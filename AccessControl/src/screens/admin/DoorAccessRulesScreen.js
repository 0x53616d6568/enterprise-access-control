import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import colors from '../../constants/colors';

const ROLES = [
  { id: 1, name: 'Employee', color: colors.textMuted, bg: colors.bgCard, border: colors.border },
  { id: 3, name: 'Manager', color: colors.warning, bg: colors.warningBg, border: colors.warningBorder },
  { id: 5, name: 'Administrator', color: colors.accentText, bg: colors.bgDeep, border: colors.accentDark },
];

export default function DoorAccessRulesScreen({ navigation, route }) {
  const { accessToken } = useAuth();
  const { doorId, doorName } = route.params;

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const headers = { Authorization: `Bearer ${accessToken}` };

  // Load rules on mount
  useEffect(() => {
    const loadRules = async () => {
      try {
        const res = await axios.get(`${API.DOORS}/${doorId}/rules`, { headers });
        setRules(res.data.data || []);
      } catch (err) {
        console.log('Failed to load access rules:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadRules();
  }, [doorId]);

  const handleAddRule = async (roleId) => {
    try {
      await axios.post(`${API.DOORS}/${doorId}/rules`, {
        role_id: roleId,
        allowed_from: '00:00',
        allowed_until: '23:59',
        days_of_week: 'MON,TUE,WED,THU,FRI,SAT,SUN',
      }, { headers });
      
      // Reload rules
      const res = await axios.get(`${API.DOORS}/${doorId}/rules`, { headers });
      setRules(res.data.data || []);
      setShowForm(false);
      setSelectedRole(null);
      Alert.alert('Success', 'Access rule added');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add access rule');
    }
  };

  const handleDeleteRule = (ruleId) => {
    Alert.alert('Delete rule', 'Remove this access rule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API.DOORS}/${doorId}/rules/${ruleId}`, { headers });
            setRules(rules.filter(r => r.rule_id !== ruleId));
            Alert.alert('Success', 'Access rule deleted');
          } catch (err) {
            Alert.alert('Error', 'Failed to delete rule');
          }
        },
      },
    ]);
  };

  const getRoleInfo = (roleId) => {
    return ROLES.find(r => r.id === roleId) || ROLES[0];
  };

  const isRoleAlreadyAdded = (roleId) => {
    return rules.some(r => r.role_id === roleId);
  };

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
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Access Rules</Text>
            <Text style={styles.subtitle}>{doorName}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
            <Ionicons name={showForm ? 'close' : 'add'} size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Add rule form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Add access for:</Text>
            <View style={styles.roleGrid}>
              {ROLES.map(role => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleOpt,
                    selectedRole === role.id && { borderColor: role.color, backgroundColor: role.bg },
                    isRoleAlreadyAdded(role.id) && styles.roleOptDisabled,
                  ]}
                  onPress={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                  disabled={isRoleAlreadyAdded(role.id)}
                >
                  <View style={[styles.roleBadge, { backgroundColor: role.bg, borderColor: role.border }]}>
                    <Ionicons name="shield-outline" size={14} color={role.color} />
                  </View>
                  <Text style={[styles.roleLabel, { color: role.color }]}>
                    {role.name}
                  </Text>
                  {isRoleAlreadyAdded(role.id) && (
                    <Ionicons name="checkmark" size={16} color={colors.success} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {selectedRole && (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => handleAddRule(selectedRole)}
              >
                <Text style={styles.confirmBtnText}>Add rule</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Rules list */}
        {rules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="lock-open-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>No access rules yet</Text>
            <Text style={styles.emptySubText}>Add roles that can access this door</Text>
          </View>
        ) : (
          <View>
            {rules.map((rule) => {
              const roleInfo = getRoleInfo(rule.role_id);
              return (
                <View key={rule.rule_id} style={styles.ruleCard}>
                  <View style={styles.ruleLeft}>
                    <View style={[styles.ruleIcon, { backgroundColor: roleInfo.bg, borderColor: roleInfo.border }]}>
                      <Ionicons name="shield-checkmark-outline" size={16} color={roleInfo.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ruleName}>{roleInfo.name}</Text>
                      <Text style={styles.ruleTime}>
                        {rule.allowed_from} - {rule.allowed_until}
                      </Text>
                      <Text style={styles.ruleDays} numberOfLines={1}>
                        {rule.days_of_week || 'All days'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteRule(rule.rule_id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Info box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color={colors.accentText} style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            These rules control which roles have access to this door. Rules sync to the Pi device automatically.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  container:   { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn:     { width: 34, height: 34, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title:       { color: colors.textPrimary, fontSize: 18, fontWeight: '500', letterSpacing: -0.3, marginBottom: 2 },
  subtitle:    { color: colors.textMuted, fontSize: 12 },
  addBtn:      { width: 34, height: 34, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  formCard:    { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, marginBottom: 20 },
  formLabel:   { color: colors.textMuted, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 12 },
  roleGrid:    { gap: 8, marginBottom: 12 },
  roleOpt:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12 },
  roleOptDisabled: { opacity: 0.5 },
  roleBadge:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  roleLabel:   { color: colors.textSecondary, fontSize: 13, fontWeight: '500', flex: 1 },
  confirmBtn:  { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  emptyCard:   { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 24, alignItems: 'center', gap: 8, marginBottom: 20 },
  emptyText:   { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  emptySubText: { color: colors.textMuted, fontSize: 12 },

  ruleCard:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  ruleLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  ruleIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ruleName:    { color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 3 },
  ruleTime:    { color: colors.textMuted, fontSize: 11 },
  ruleDays:    { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  deleteBtn:   { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder },

  infoBox:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 10, padding: 14 },
  infoText:    { color: colors.accentText, fontSize: 12, lineHeight: 18, flex: 1 },
});

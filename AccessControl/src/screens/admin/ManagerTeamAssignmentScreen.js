import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';
import { CustomAlert } from '../../components/CustomAlert';

export default function ManagerTeamAssignmentScreen({ navigation }) {
  const colors = useThemeColors();
  const alertRef = React.useRef(null);
  const [managers, setManagers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [assigning, setAssigning] = useState(false);

  const showAlert = (title, message, type = 'info', buttons = []) => {
    const defaultButtons = [{ text: 'OK', onPress: () => {} }];
    alertRef.current?.show({
      title,
      message,
      type,
      buttons: buttons.length > 0 ? buttons : defaultButtons
    });
  };

  const fetchData = useCallback(async () => {
    try {
      // Get all managers
      const managersRes = await api.get(`${API.BASE_URL}/users?role=manager`);
      const managerList = managersRes.data.data.filter(u => u.access_level === 4) || [];
      setManagers(managerList);

      // Get all non-manager users
      const usersRes = await api.get(`${API.BASE_URL}/users`);
      const nonManagers = (usersRes.data.data || []).filter(u => u.access_level < 4);
      setAllUsers(nonManagers);
    } catch (err) {
      console.error('Failed to fetch data:', err.message);
      showAlert('Error', 'Failed to load managers and users', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectManager = async (manager) => {
    setSelectedManager(manager);
    setSelectedMembers([]);
    // Fetch already assigned members
    try {
      const res = await api.get(`${API.BASE_URL}/admin/manager-teams/${manager.user_id}`);
      const assignedIds = (res.data.data || []).map(m => m.user_id);
      setSelectedMembers(assignedIds);
    } catch (err) {
      console.log('No team members assigned yet');
    }
  };

  const handleToggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssignTeam = async () => {
    if (!selectedManager || selectedMembers.length === 0) {
      showAlert('Warning', 'Please select at least one team member', 'warning');
      return;
    }

    setAssigning(true);
    try {
      const response = await api.post(
        `${API.BASE_URL}/admin/manager-teams/assign`,
        {
          manager_id: selectedManager.user_id,
          team_member_ids: selectedMembers
        }
      );

      showAlert('Success', `Assigned ${selectedMembers.length} team member(s) to ${selectedManager.full_name}`, 'success');
      handleSelectManager(selectedManager); // Refresh
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Failed to assign team members', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { padding: 16 },
    header: { marginBottom: 20, paddingTop: 10 },
    title: { color: colors.textPrimary, fontSize: 24, fontWeight: '600', marginBottom: 4 },
    subtitle: { color: colors.textMuted, fontSize: 12 },
    section: { marginBottom: 24 },
    sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
    managerCard: { backgroundColor: colors.bgCard, borderWidth: 2, borderRadius: 12, padding: 14, marginBottom: 10 },
    managerCardSelected: { borderColor: colors.accent },
    managerCardDefault: { borderColor: colors.border },
    managerName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
    managerMeta: { color: colors.textMuted, fontSize: 11 },
    searchInput: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, marginBottom: 12 },
    memberItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bgCard },
    memberCheckbox: { width: 24, height: 24, borderWidth: 2, borderColor: colors.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    memberCheckboxActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    memberName: { flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
    memberDept: { color: colors.textMuted, fontSize: 11 },
    assignBtn: { backgroundColor: colors.accent, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
    assignBtnDisabled: { opacity: 0.5 },
    assignBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    emptyText: { color: colors.textMuted, fontSize: 12 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const filteredUsers = allUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={colors.accent} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Team Assignment</Text>
          <Text style={styles.subtitle}>Assign employees to managers</Text>
        </View>

        {/* Managers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Manager</Text>
          {managers.length > 0 ? (
            managers.map(manager => (
              <TouchableOpacity
                key={manager.user_id}
                style={[
                  styles.managerCard,
                  selectedManager?.user_id === manager.user_id
                    ? styles.managerCardSelected
                    : styles.managerCardDefault
                ]}
                onPress={() => handleSelectManager(manager)}
              >
                <Text style={styles.managerName}>{manager.full_name}</Text>
                <Text style={styles.managerMeta}>{manager.email}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No managers found</Text>
            </View>
          )}
        </View>

        {/* Team Members Section */}
        {selectedManager && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assign Team Members</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {filteredUsers.length > 0 ? (
              <View style={{ backgroundColor: colors.bgCard, borderRadius: 10, overflow: 'hidden' }}>
                {filteredUsers.map(user => (
                  <TouchableOpacity
                    key={user.user_id}
                    style={styles.memberItem}
                    onPress={() => handleToggleMember(user.user_id)}
                  >
                    <View
                      style={[
                        styles.memberCheckbox,
                        selectedMembers.includes(user.user_id) && styles.memberCheckboxActive
                      ]}
                    >
                      {selectedMembers.includes(user.user_id) && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{user.full_name}</Text>
                      <Text style={styles.memberDept}>{user.department}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No employees found</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.assignBtn, assigning && styles.assignBtnDisabled]}
              onPress={handleAssignTeam}
              disabled={assigning}
            >
              {assigning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.assignBtnText}>
                  Assign {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CustomAlert ref={alertRef} />
    </SafeAreaView>
  );
}

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
      const usersRes = await api.get(API.USERS);
      const allUsers = usersRes.data.data || [];
      
      const managerList = allUsers.filter(u => u.access_level === 3 && u.role_name === 'Manager');
      setManagers(managerList);
      setAllUsers(allUsers.filter(u => u.access_level < 3));
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
      await api.post(
        `${API.BASE_URL}/admin/manager-teams/assign`,
        {
          manager_id: selectedManager.user_id,
          team_member_ids: selectedMembers
        }
      );

      showAlert('Success', `Assigned ${selectedMembers.length} team member(s) to ${selectedManager.full_name}`, 'success');
      handleSelectManager(selectedManager);
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Failed to assign team members', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 },
    header: { marginBottom: 24, paddingTop: 8 },
    title: { color: colors.textPrimary, fontSize: 26, fontWeight: '600', marginBottom: 4 },
    subtitle: { color: colors.textMuted, fontSize: 13 },
    twoColumnLayout: { flexDirection: 'row', gap: 16, flex: 1 },
    leftPanel: { flex: 1, minWidth: '40%' },
    rightPanel: { flex: 1, minWidth: '40%' },
    panelTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
    managerCard: { backgroundColor: colors.bgCard, borderWidth: 2, borderRadius: 12, padding: 14, marginBottom: 12, borderColor: colors.border },
    managerCardSelected: { borderColor: colors.accent, backgroundColor: colors.accentBg },
    managerName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
    managerMeta: { color: colors.textMuted, fontSize: 11 },
    searchInput: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, marginBottom: 12 },
    membersContainer: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', maxHeight: 350 },
    memberItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.bgDeep },
    memberCheckbox: { width: 22, height: 22, borderWidth: 2, borderColor: colors.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    memberCheckboxActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    memberName: { flex: 1, color: colors.textPrimary, fontSize: 12, fontWeight: '500' },
    memberDept: { color: colors.textMuted, fontSize: 10 },
    selectedCount: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.accentBg, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
    selectedCountText: { color: colors.accent, fontWeight: '600', fontSize: 12 },
    assignBtn: { backgroundColor: colors.accent, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
    assignBtnDisabled: { opacity: 0.5 },
    assignBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyIcon: { marginBottom: 12 },
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
          <Text style={styles.title}>Manage Teams</Text>
          <Text style={styles.subtitle}>Assign employees to managers</Text>
        </View>

        {/* Two Column Layout */}
        <View style={styles.twoColumnLayout}>
          {/* Left: Managers */}
          <View style={styles.leftPanel}>
            <Text style={styles.panelTitle}>Managers</Text>
            {managers.length > 0 ? (
              managers.map(manager => (
                <TouchableOpacity
                  key={manager.user_id}
                  style={[
                    styles.managerCard,
                    selectedManager?.user_id === manager.user_id && styles.managerCardSelected
                  ]}
                  onPress={() => handleSelectManager(manager)}
                >
                  <Text style={styles.managerName}>{manager.full_name}</Text>
                  <Text style={styles.managerMeta}>{manager.email}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="information-circle-outline" size={24} color={colors.textMuted} style={styles.emptyIcon} />
                <Text style={styles.emptyText}>No managers</Text>
              </View>
            )}
          </View>

          {/* Right: Team Members */}
          <View style={styles.rightPanel}>
            <Text style={styles.panelTitle}>Team Members</Text>
            {selectedManager ? (
              <>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                {filteredUsers.length > 0 ? (
                  <>
                    <FlatList
                      data={filteredUsers}
                      scrollEnabled={false}
                      keyExtractor={u => u.user_id.toString()}
                      style={styles.membersContainer}
                      renderItem={({ item: user, index }) => (
                        <TouchableOpacity
                          style={[
                            styles.memberItem,
                            index === filteredUsers.length - 1 && { borderBottomWidth: 0 }
                          ]}
                          onPress={() => handleToggleMember(user.user_id)}
                        >
                          <View
                            style={[
                              styles.memberCheckbox,
                              selectedMembers.includes(user.user_id) && styles.memberCheckboxActive
                            ]}
                          >
                            {selectedMembers.includes(user.user_id) && (
                              <Ionicons name="checkmark-sharp" size={14} color="#fff" />
                            )}
                          </View>
                          <View>
                            <Text style={styles.memberName}>{user.full_name}</Text>
                            <Text style={styles.memberDept}>{user.department}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                    <View style={styles.selectedCount}>
                      <Text style={styles.selectedCountText}>{selectedMembers.length} selected</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={24} color={colors.textMuted} style={styles.emptyIcon} />
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
                      {selectedMembers.length > 0 ? `Assign ${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}` : 'Select Members First'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="arrow-back-outline" size={24} color={colors.textMuted} style={styles.emptyIcon} />
                <Text style={styles.emptyText}>Select a manager</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <CustomAlert ref={alertRef} />
    </SafeAreaView>
  );
}

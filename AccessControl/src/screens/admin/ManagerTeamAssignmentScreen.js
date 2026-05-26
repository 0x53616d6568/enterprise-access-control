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
      
      const managerList = allUsers.filter(u => u.access_level === 3);
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
    container: { paddingHorizontal: 20, paddingVertical: 18, paddingBottom: 36 },
    header: { marginBottom: 18, paddingTop: 4 },
    title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700', marginBottom: 6, letterSpacing: -0.4 },
    subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    body: { gap: 14 },
    sectionCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
    sectionTitleWrap: { flex: 1 },
    panelTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
    panelSubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
    sectionBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.border },
    sectionBadgeText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
    managerList: { gap: 10 },
    managerCard: { backgroundColor: colors.bgDeep, borderWidth: 1, borderRadius: 14, padding: 14, borderColor: colors.border },
    managerCardSelected: { borderColor: colors.accent, backgroundColor: colors.accentBg },
    managerName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 },
    managerMeta: { color: colors.textMuted, fontSize: 12 },
    selectedManagerCard: { backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, marginBottom: 12 },
    selectedManagerLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    selectedManagerName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 3 },
    selectedManagerMeta: { color: colors.textMuted, fontSize: 12 },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },
    searchIcon: { marginTop: 1 },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 13, padding: 0 },
    membersContainer: { backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden' },
    memberItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    memberCheckbox: { width: 22, height: 22, borderWidth: 2, borderColor: colors.border, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    memberCheckboxActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    memberTextWrap: { flex: 1 },
    memberName: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 2 },
    memberDept: { color: colors.textMuted, fontSize: 11 },
    selectedCount: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
    selectedCountText: { color: colors.accent, fontWeight: '700', fontSize: 12 },
    assignBtn: { backgroundColor: colors.accent, paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 14 },
    assignBtnDisabled: { opacity: 0.5 },
    assignBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    emptyState: { alignItems: 'center', paddingVertical: 28 },
    emptyIcon: { marginBottom: 12 },
    emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    inlineMeta: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
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

        <View style={styles.body}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.panelTitle}>Managers</Text>
                <Text style={styles.panelSubtitle}>Pick one manager to assign or review a team.</Text>
              </View>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{managers.length} total</Text>
              </View>
            </View>

            {managers.length > 0 ? (
              <View style={styles.managerList}>
                {managers.map(manager => (
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
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="information-circle-outline" size={24} color={colors.textMuted} style={styles.emptyIcon} />
                <Text style={styles.emptyText}>No managers available right now.</Text>
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.panelTitle}>Team Members</Text>
                <Text style={styles.panelSubtitle}>Search employees, then tap to select who should report to the manager.</Text>
              </View>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{selectedMembers.length} selected</Text>
              </View>
            </View>

            {selectedManager ? (
              <>
                <View style={styles.selectedManagerCard}>
                  <Text style={styles.selectedManagerLabel}>Selected manager</Text>
                  <Text style={styles.selectedManagerName}>{selectedManager.full_name}</Text>
                  <Text style={styles.selectedManagerMeta}>{selectedManager.email}</Text>
                  <Text style={styles.inlineMeta}>{selectedMembers.length} team member{selectedMembers.length !== 1 ? 's' : ''} picked</Text>
                </View>

                <View style={styles.searchWrap}>
                  <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search employees"
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {filteredUsers.length > 0 ? (
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
                        <View style={styles.memberTextWrap}>
                          <Text style={styles.memberName}>{user.full_name}</Text>
                          <Text style={styles.memberDept}>{user.department}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={24} color={colors.textMuted} style={styles.emptyIcon} />
                    <Text style={styles.emptyText}>No employees match that search.</Text>
                  </View>
                )}

                <View style={styles.selectedCount}>
                  <Text style={styles.selectedCountText}>{selectedMembers.length} selected</Text>
                </View>

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
                <Text style={styles.emptyText}>Select a manager to start assigning team members.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <CustomAlert ref={alertRef} />
    </SafeAreaView>
  );
}

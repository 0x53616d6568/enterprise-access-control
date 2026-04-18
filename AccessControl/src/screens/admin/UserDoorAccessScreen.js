import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

export default function UserDoorAccessScreen({ route, navigation }) {
  const colors = useThemeColors();
  const { doorId, doorName } = route.params || {};

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
    header: { marginBottom: 20 },
    title: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 4 },
    subtitle: { color: colors.textMuted, fontSize: 12 },
    
    searchSection: { marginBottom: 16 },
    searchInput: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontSize: 13,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    searchInputField: {
      flex: 1,
      paddingVertical: 10,
      paddingLeft: 8,
      color: colors.textPrimary,
      fontSize: 13,
    },
    filterButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    filterBtn: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterBtnInactive: {
      backgroundColor: colors.bg,
      borderColor: colors.border,
    },
    filterBtnText: {
      fontSize: 11,
      fontWeight: '600',
    },
    filterBtnActiveText: {
      color: '#fff',
    },
    filterBtnInactiveText: {
      color: colors.textSecondary,
    },
    userCard: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    userInfo: { flex: 1 },
    userName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 2 },
    userEmail: { color: colors.textMuted, fontSize: 11 },
    accessToggle: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      minWidth: 70,
      alignItems: 'center',
    },
    accessToggleText: { fontSize: 12, fontWeight: '600' },
    accessEnabled: {
      backgroundColor: colors.successBg,
      borderWidth: 1,
      borderColor: colors.successBorder,
    },
    accessEnabledText: { color: colors.success },
    accessDisabled: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    accessDisabledText: { color: colors.danger },
    
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
    closeBtn: { padding: 8 },
    
    inputLabel: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 6 },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      color: colors.textPrimary,
      fontSize: 12,
    },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
    saveBtn: {
      flex: 1,
      backgroundColor: colors.success,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
    cancelBtn: {
      flex: 1,
      backgroundColor: colors.border,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelBtnText: { color: colors.textPrimary, fontWeight: '600', fontSize: 12 },
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState('all'); // all, with-access, without-access
  const [formData, setFormData] = useState({
    from: '00:00',
    until: '23:59',
    days: 'MON,TUE,WED,THU,FRI',
  });

  // Filter users based on search and filter options
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterOption === 'with-access') {
      return matchesSearch && user.has_access === 1;
    } else if (filterOption === 'without-access') {
      return matchesSearch && user.has_access === 0;
    }
    return matchesSearch;
  });

  const fetchUsers = useCallback(async () => {
    if (!doorId) return;
    try {
      const res = await api.get(`${API.BASE_URL}/doors/${doorId}/users`);
      setUsers(res.data.data || []);
    } catch (err) {
      console.log('Fetch users error:', err.message);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [doorId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleToggleAccess = (user) => {
    if (user.has_access) {
      Alert.alert(
        'Remove Access',
        `Remove ${user.name}'s access to this door?`,
        [
          { text: 'Cancel', onPress: () => {} },
          { text: 'Remove', onPress: () => handleRemoveAccess(user), style: 'destructive' },
        ]
      );
    } else {
      setSelectedUser(user);
      setFormData({
        from: '00:00',
        until: '23:59',
        days: 'MON,TUE,WED,THU,FRI',
      });
      setModalVisible(true);
    }
  };

  const handleRemoveAccess = async (user) => {
    try {
      await api.delete(`${API.BASE_URL}/doors/${doorId}/remove-user`, {
        data: { user_id: user.user_id, door_id: doorId },
      });
      Alert.alert('Success', 'Access removed');
      fetchUsers();
    } catch (err) {
      Alert.alert('Error', 'Failed to remove access');
    }
  };

  const handleAssignAccess = async () => {
    try {
      await api.post(`${API.BASE_URL}/doors/${doorId}/assign-user`, {
        user_id: selectedUser.user_id,
        door_id: doorId,
        allowed_from: formData.from,
        allowed_until: formData.until,
        days_of_week: formData.days,
      });
      Alert.alert('Success', 'Access assigned');
      setModalVisible(false);
      fetchUsers();
    } catch (err) {
      Alert.alert('Error', 'Failed to assign access');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{doorName || 'Door Access'}</Text>
          <Text style={styles.subtitle}>{users.length} total users</Text>
        </View>

        {/* Search and Filter Section */}
        <View style={styles.searchSection}>
          {/* Search Input */}
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInputField}
              placeholder="Search by name or email"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterBtn,
                filterOption === 'all' ? styles.filterBtnActive : styles.filterBtnInactive,
              ]}
              onPress={() => setFilterOption('all')}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  filterOption === 'all' ? styles.filterBtnActiveText : styles.filterBtnInactiveText,
                ]}
              >
                All ({users.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterBtn,
                filterOption === 'with-access' ? styles.filterBtnActive : styles.filterBtnInactive,
              ]}
              onPress={() => setFilterOption('with-access')}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  filterOption === 'with-access' ? styles.filterBtnActiveText : styles.filterBtnInactiveText,
                ]}
              >
                Has Access ({users.filter(u => u.has_access === 1).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterBtn,
                filterOption === 'without-access' ? styles.filterBtnActive : styles.filterBtnInactive,
              ]}
              onPress={() => setFilterOption('without-access')}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  filterOption === 'without-access' ? styles.filterBtnActiveText : styles.filterBtnInactiveText,
                ]}
              >
                No Access ({users.filter(u => u.has_access === 0).length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {users.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
            <Ionicons name="people-outline" size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 13 }}>No users found</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
            <Ionicons name="search-outline" size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 13 }}>No users match your search</Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View key={user.user_id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.accessToggle,
                  user.has_access ? styles.accessEnabled : styles.accessDisabled,
                ]}
                onPress={() => handleToggleAccess(user)}
              >
                <Text style={[
                  styles.accessToggleText,
                  user.has_access ? styles.accessEnabledText : styles.accessDisabledText,
                ]}>
                  {user.has_access ? 'Remove' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Access Configuration Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Access Rules</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <>
                <Text style={styles.inputLabel}>User: {selectedUser.name}</Text>

                <Text style={styles.inputLabel}>From Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={formData.from}
                  onChangeText={(val) => setFormData({ ...formData, from: val })}
                />

                <Text style={styles.inputLabel}>Until Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={formData.until}
                  onChangeText={(val) => setFormData({ ...formData, until: val })}
                />

                <Text style={styles.inputLabel}>Days (comma separated)</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60 }]}
                  placeholder="MON,TUE,WED,THU,FRI"
                  value={formData.days}
                  onChangeText={(val) => setFormData({ ...formData, days: val })}
                  multiline
                />

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAssignAccess}>
                    <Text style={styles.saveBtnText}>Assign Access</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

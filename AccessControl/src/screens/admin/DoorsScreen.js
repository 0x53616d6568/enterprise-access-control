import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';

export default function DoorsScreen({ navigation }) {
  const colors = useThemeColors();
  
  const styles = StyleSheet.create({
    safe:      { flex: 1, backgroundColor: colors.bg },
    centered:  { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
    header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    title:     { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 3 },
    subtitle:  { color: colors.textMuted, fontSize: 13 },
    addBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
    emptyCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 24, alignItems: 'center', gap: 8 },
    emptyText: { color: colors.textMuted, fontSize: 13 },
    doorCard:  { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
    doorTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    doorLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    doorIcon:  { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    doorName:  { color: colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 2 },
    doorLoc:   { color: colors.textMuted, fontSize: 11 },
    secBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    secBadgeText: { fontSize: 11, fontWeight: '500' },
    tagRow:    { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
    tag:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
    tagFace:   { backgroundColor: colors.bgDeep, borderColor: colors.accentDark },
    tagText:   { color: colors.textSecondary, fontSize: 11 },
    doorFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
    doorFooterLeft: { flex: 1 },
    footerLeft:  { color: colors.textMuted, fontSize: 11 },
    footerRight: { color: colors.accent, fontSize: 11 },
    actionButtons: { flexDirection: 'row', gap: 8 },
    actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    actionBtnEdit: { backgroundColor: colors.accentBg, borderColor: colors.accentDark },
    actionBtnUsers: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
    actionBtnDelete: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
    actionBtnText: { fontSize: 10, fontWeight: '600' },
  });

  const getSecurityInfo = (level) => {
    if (level >= 5) return { label: `Level ${level}`, color: colors.danger,  bg: colors.dangerBg,  border: colors.dangerBorder,  iconColor: colors.danger };
    if (level >= 3) return { label: `Level ${level}`, color: colors.warning, bg: colors.warningBg, border: colors.warningBorder, iconColor: colors.warning };
    return                  { label: `Level ${level}`, color: colors.success, bg: colors.successBg, border: colors.successBorder, iconColor: colors.success };
  };
  const [doors,     setDoors]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const fetchDoors = useCallback(async () => {
    try {
      const res = await api.get(API.DOORS);
      setDoors(res.data.data || []);
    } catch (err) {
      console.log('Doors fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDoors(); }, [fetchDoors]);

  const onRefresh = () => { setRefreshing(true); fetchDoors(); };

  const handleDelete = (doorId, doorName) => {
    Alert.alert('Delete door', `Remove "${doorName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`${API.DOORS}/${doorId}`);
            setDoors(doors.filter(d => d.door_id !== doorId));
            Alert.alert('Success', 'Door deleted');
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to delete door');
          }
        },
      },
    ]);
  };

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color={colors.accent} /></View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Doors</Text>
            <Text style={styles.subtitle}>{doors.length} doors configured</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddDoor')}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Add door</Text>
          </TouchableOpacity>
        </View>

        {/* Doors list */}
        {doors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="lock-open-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>No doors configured yet</Text>
          </View>
        ) : (
          doors.map((door) => {
            const secInfo = getSecurityInfo(door.security_level || 1);
            return (
              <View key={door.door_id} style={styles.doorCard}>
                <View style={styles.doorTop}>
                  <View style={styles.doorLeft}>
                    <View style={[styles.doorIcon, { backgroundColor: secInfo.bg, borderColor: secInfo.border }]}>
                      <Ionicons name="lock-closed-outline" size={16} color={secInfo.iconColor} />
                    </View>
                    <View>
                      <Text style={styles.doorName}>{door.door_name}</Text>
                      <Text style={styles.doorLoc}>{door.location}</Text>
                    </View>
                  </View>
                  <View style={[styles.secBadge, { backgroundColor: secInfo.bg, borderColor: secInfo.border }]}>
                    <Text style={[styles.secBadgeText, { color: secInfo.color }]}>{secInfo.label}</Text>
                  </View>
                </View>

                {/* Tags */}
                <View style={styles.tagRow}>
                  <View style={[styles.tag, door.requires_face_auth && styles.tagFace]}>
                    <Text style={[styles.tagText, door.requires_face_auth && { color: colors.accentText }]}>
                      {door.requires_face_auth ? 'BLE + Face' : 'BLE only'}
                    </Text>
                  </View>
                  {door.pi_device_id && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{door.pi_device_id}</Text>
                    </View>
                  )}
                </View>

                {/* Footer */}
                <View style={styles.doorFooter}>
                  <View style={styles.doorFooterLeft}>
                    <Text style={styles.footerLeft}>
                      Fallback: {door.fallback_method || 'None'}
                    </Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.actionBtnUsers]}
                      onPress={() => navigation.navigate('UserAccess', { doorId: door.door_id, doorName: door.door_name })}
                    >
                      <Ionicons name="people-outline" size={14} color={colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.actionBtnEdit]}
                      onPress={() => navigation.navigate('EditDoor', { doorId: door.door_id })}
                    >
                      <Ionicons name="create-outline" size={14} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.actionBtnDelete]}
                      onPress={() => handleDelete(door.door_id, door.door_name)}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

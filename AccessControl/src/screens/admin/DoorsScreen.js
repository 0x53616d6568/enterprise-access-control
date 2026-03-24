import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import colors from '../../constants/colors';

const getSecurityInfo = (level) => {
  if (level >= 5) return { label: `Level ${level}`, color: colors.danger,  bg: colors.dangerBg,  border: colors.dangerBorder,  iconColor: colors.danger };
  if (level >= 3) return { label: `Level ${level}`, color: colors.warning, bg: colors.warningBg, border: colors.warningBorder, iconColor: colors.warning };
  return                  { label: `Level ${level}`, color: colors.success, bg: colors.successBg, border: colors.successBorder, iconColor: colors.success };
};

export default function DoorsScreen({ navigation }) {
  const { accessToken } = useAuth();
  const [doors,     setDoors]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const fetchDoors = useCallback(async () => {
    try {
      const res = await axios.get(API.DOORS, { headers });
      setDoors(res.data.data || []);
    } catch (err) {
      console.log('Doors fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  const onRefresh = () => { setRefreshing(true); fetchDoors(); };

  const handleDelete = (doorId, doorName) => {
    Alert.alert('Delete door', `Remove "${doorName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API.DOORS}/${doorId}`, { headers });
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
                  <Text style={styles.footerLeft}>
                    Fallback: {door.fallback_method || 'None'}
                  </Text>
                  <Text style={styles.footerRight}>
                    {door.pi_device_id ? `${door.pi_device_id} ●` : 'No Pi assigned'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  doorFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  footerLeft:  { color: colors.textMuted, fontSize: 11 },
  footerRight: { color: colors.accent, fontSize: 11 },
});

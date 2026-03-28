import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../constants/api';
import useThemeColors from '../../hooks/useThemeColors';


const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function NotificationsScreen({ navigation }) {
  const { accessToken } = useAuth();
  const colors = useThemeColors();

  const styles = StyleSheet.create({
    safe:          { flex: 1, backgroundColor: colors.bg },
    centered:      { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    container:     { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
    header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    title:         { color: colors.textPrimary, fontSize: 22, fontWeight: '500', letterSpacing: -0.4, marginBottom: 3 },
    subtitle:      { color: colors.textMuted, fontSize: 13 },
    markBtn:       { backgroundColor: colors.bgDeep, borderWidth: 1, borderColor: colors.accentDark, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    markBtnText:   { color: colors.accentText, fontSize: 12 },
    emptyCard:     { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 32, alignItems: 'center', gap: 10, marginTop: 20 },
    emptyIcon:     { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyTitle:    { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
    emptySub:      { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
    notifItem:     { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.bgCard },
    notifItemUnread: { borderBottomColor: colors.border },
    notifIcon:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
    notifContent:  { flex: 1 },
    notifRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    notifTitle:    { color: colors.textSecondary, fontSize: 13, fontWeight: '500', flex: 1 },
    unreadDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
    notifBody:     { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 5 },
    notifTime:     { color: '#484F58', fontSize: 11 },
  });

  const NOTIF_ICONS = {
    ACCESS_GRANTED:  { icon: 'lock-open-outline',       color: colors.success,       bg: colors.successBg,  border: colors.successBorder },
    ACCESS_DENIED:   { icon: 'lock-closed-outline',     color: colors.danger,        bg: colors.dangerBg,   border: colors.dangerBorder },
    REQUEST_APPROVED:{ icon: 'checkmark-circle-outline',color: colors.success,       bg: colors.successBg,  border: colors.successBorder },
    REQUEST_REJECTED:{ icon: 'close-circle-outline',    color: colors.danger,        bg: colors.dangerBg,   border: colors.dangerBorder },
    VISITOR_ARRIVED: { icon: 'people-outline',          color: colors.warning,       bg: colors.warningBg,  border: colors.warningBorder },
    TOKEN_EXPIRY:    { icon: 'bluetooth-outline',       color: colors.accentText,    bg: colors.bgDeep,     border: colors.accentDark },
    SECURITY_ALERT:  { icon: 'warning-outline',         color: colors.danger,        bg: colors.dangerBg,   border: colors.dangerBorder },
    DEFAULT:         { icon: 'notifications-outline',   color: colors.textSecondary, bg: colors.bgCard,     border: colors.border },
  };

  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [marking,       setMarking]       = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get(API.NOTIFICATIONS);
      setNotifications(res.data.data || []);
    } catch (err) {
      console.log('Notifications fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const markAllRead = async () => {
    setMarking(true);
    try {
      await api.patch(API.NOTIFICATIONS_READ_ALL, {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.log('Mark read error:', err.message);
    } finally {
      setMarking(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIconInfo = (type) => NOTIF_ICONS[type] || NOTIF_ICONS.DEFAULT;

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
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={[styles.markBtn, marking && { opacity: 0.7 }]}
              onPress={markAllRead}
              disabled={marking}
            >
              {marking
                ? <ActivityIndicator size="small" color={colors.accentText} />
                : <Text style={styles.markBtnText}>Mark all read</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* Empty state */}
        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>Access events, request updates, and alerts will appear here.</Text>
          </View>
        ) : (
          notifications.map((notif, i) => {
            const iconInfo = getIconInfo(notif.type);
            const unread   = !notif.is_read;
            return (
              <TouchableOpacity
                key={notif.notification_id || i}
                style={[styles.notifItem, unread && styles.notifItemUnread]}
                activeOpacity={0.7}
              >
                <View style={[styles.notifIcon, { backgroundColor: iconInfo.bg, borderColor: iconInfo.border }]}>
                  <Ionicons name={iconInfo.icon} size={16} color={iconInfo.color} />
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifRow}>
                    <Text style={[styles.notifTitle, unread && { color: colors.textPrimary }]} numberOfLines={1}>
                      {notif.title || 'Notification'}
                    </Text>
                    {unread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifBody} numberOfLines={2}>{notif.message || notif.body}</Text>
                  <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './apiService';
import { API } from '../constants/api';

// Check if we're running in Expo Go (push notifications won't work)
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification handler behavior (how notifications appear when app is in foreground)
// Only if not in Expo Go
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Register for push notifications and get Expo push token
 * @returns {Promise<string|null>} The Expo push token or null if failed
 */
export async function registerForPushNotifications() {
  try {
    // Check if running in Expo Go - push notifications don't work there
    if (isExpoGo) {
      console.log('⚠️ Push notifications are not supported in Expo Go. Please use a development build.');
      return null;
    }

    if (Platform.OS === 'web') {
      console.log('Push notifications are not supported on web');
      return null;
    }

    // Check if we already have permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If not, request permission
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return null;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    
    const token = tokenData.data;
    console.log('✅ Expo Push Token:', token);

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error.message);
    return null;
  }
}

/**
 * Save push token to backend
 * @param {string} token - The Expo push token
 * @param {string} accessToken - User's auth token
 */
export async function savePushToken(token, accessToken) {
  try {
    if (!token) return;
    await api.post(API.PUSH_TOKEN, { push_token: token });
    console.log('Push token saved to backend');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Add notification received listener
 * @param {Function} callback - Function to call when notification is received
 * @returns {Subscription} - Subscription object to remove listener later
 */
export function addNotificationReceivedListener(callback) {
  if (isExpoGo) return { remove: () => {} }; // Return dummy subscription
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 * @param {Function} callback - Function to call when notification is tapped
 * @returns {Subscription} - Subscription object to remove listener later
 */
export function addNotificationResponseListener(callback) {
  if (isExpoGo) return { remove: () => {} }; // Return dummy subscription
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Schedule a local notification (for testing)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to pass with notification
 * @param {number} seconds - Seconds to wait before showing (default: 1)
 */
export async function scheduleLocalNotification(title, body, data = {}, seconds = 1) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: { seconds },
    });
  } catch (error) {
    console.error('Error scheduling local notification:', error);
  }
}

/**
 * Get current badge count
 * @returns {Promise<number>} Current badge count
 */
export async function getBadgeCount() {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
}

/**
 * Set badge count
 * @param {number} count - Badge count to set
 */
export async function setBadgeCount(count) {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications() {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}

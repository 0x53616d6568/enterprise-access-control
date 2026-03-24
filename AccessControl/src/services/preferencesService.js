import axios from 'axios';
import { API } from '../constants/api';
import * as SecureStore from 'expo-secure-store';

// Get all user preferences (theme + notifications)
export const getPreferences = async (accessToken) => {
  try {
    const response = await axios.get(API.PREFERENCES, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data.data;
  } catch (err) {
    // If API fails, try loading from local storage
    try {
      const cached = await SecureStore.getItemAsync('user_preferences');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Ignore
    }
    throw err;
  }
};

// Save theme preferences
export const saveThemePreferences = async (accessToken, theme, accentColor) => {
  try {
    const response = await axios.post(
      API.THEME_PREFS,
      { theme, accentColor },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    // Cache locally as well
    const prefs = await getPreferences(accessToken).catch(() => ({}));
    await SecureStore.setItemAsync(
      'user_preferences',
      JSON.stringify({ ...prefs, theme, accentColor })
    ).catch(() => {});
    return response.data.data;
  } catch (err) {
    throw err;
  }
};

// Save notification preferences
export const saveNotificationPreferences = async (accessToken, settings) => {
  try {
    // Filter to only include valid notification keys
    const validKeys = [
      'access_granted', 'access_denied', 'face_fail',
      'req_approved', 'req_rejected', 'new_request',
      'visitor_arrived', 'visitor_expired',
      'token_expiry', 'security_alert'
    ];
    
    const filtered = {};
    validKeys.forEach(key => {
      if (key in settings) {
        // Ensure strict boolean
        filtered[key] = settings[key] === true ? true : false;
      }
    });

    const response = await axios.post(
      API.NOTIF_PREFS,
      filtered,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    // Cache locally as well
    if (response.data?.data) {
      await SecureStore.setItemAsync(
        'notification_settings',
        JSON.stringify(response.data.data)
      ).catch(() => {});
    };
    
    return response.data.data;
  } catch (err) {
    throw err;
  }
};

// Get notification preferences specifically
export const getNotificationPreferences = async (accessToken) => {
  try {
    const prefs = await getPreferences(accessToken);
    const notifPrefs = prefs.notifications || getDefaultNotificationSettings();
    
    // Filter to only include valid notification keys
    const validKeys = [
      'access_granted', 'access_denied', 'face_fail',
      'req_approved', 'req_rejected', 'new_request',
      'visitor_arrived', 'visitor_expired',
      'token_expiry', 'security_alert'
    ];
    
    const filtered = {};
    validKeys.forEach(key => {
      const value = notifPrefs[key];
      // Ensure strict boolean - handle null/undefined/non-boolean values
      filtered[key] = value === true ? true : false;
    });
    
    return filtered;
  } catch (err) {
    // Fall back to local storage
    try {
      const cached = await SecureStore.getItemAsync('notification_settings');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Ignore
    }
    return getDefaultNotificationSettings();
  }
};

// Get theme preferences specifically
export const getThemePreferences = async (accessToken) => {
  try {
    const prefs = await getPreferences(accessToken);
    return {
      theme: prefs.theme || 'dark',
      accentColor: prefs.accentColor || 'blue',
    };
  } catch (err) {
    return { theme: 'dark', accentColor: 'blue' };
  }
};

export const getDefaultNotificationSettings = () => {
  return {
    access_granted: true,
    access_denied: true,
    face_fail: true,
    req_approved: true,
    req_rejected: true,
    new_request: false,
    visitor_arrived: true,
    visitor_expired: false,
    token_expiry: true,
    security_alert: true,
  };
};

const axios = require('axios');
const db = require('../config/db');

/**
 * Send a push notification to a user via Expo Push Service
 * @param {number} userId - The user ID to send notification to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to include (optional)
 * @returns {Promise<boolean>} - Returns true if sent successfully
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    // Get user's push token
    const [users] = await db.query(
      `SELECT push_token FROM users 
       WHERE user_id = ? AND push_token IS NOT NULL`,
      [userId]
    );

    if (!users || users.length === 0 || !users[0].push_token) {
      console.log(`No push token for user ${userId}`);
      return false;
    }

    const pushToken = users[0].push_token;

    if (!pushToken.startsWith('ExponentPushToken')) {
      console.log(`Invalid Expo push token for user ${userId}`);
      return false;
    }

    // Prepare message for Expo Push API
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: { ...data, userId },
      priority: 'high',
      channelId: 'default',
    };

    // Send to Expo Push Notification service
    const response = await axios.post(
      'https://exp.host/--/api/v2/push/send',
      message,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Push notification sent to user ${userId}:`, response.data);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Send push notifications to multiple users
 * @param {number[]} userIds - Array of user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data (optional)
 */
async function sendBulkPushNotifications(userIds, title, body, data = {}) {
  const promises = userIds.map(userId => sendPushNotification(userId, title, body, data));
  await Promise.all(promises);
}

/**
 * Check user's notification preferences before sending
 * @param {number} userId - User ID
 * @param {string} notificationType - Type of notification (e.g., 'access_granted', 'req_approved')
 * @returns {Promise<boolean>} - Returns true if user wants this notification type
 */
async function shouldSendNotification(userId, notificationType) {
  try {
    const [rows] = await db.query(
      'SELECT notification_preferences FROM user_preferences WHERE user_id = ?',
      [userId]
    );

    if (!rows || rows.length === 0) {
      // Default to true if no preferences set
      return true;
    }

    const prefs = JSON.parse(rows[0].notification_preferences || '{}');
    
    // Check if the specific notification type is enabled (default true if not set)
    return prefs[notificationType] !== false;
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    // Default to true on error
    return true;
  }
}

/**
 * Send a notification only if user has it enabled in preferences
 * @param {number} userId - User ID
 * @param {string} notificationType - Type of notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data (optional)
 */
async function sendConditionalNotification(userId, notificationType, title, body, data = {}) {
  const shouldSend = await shouldSendNotification(userId, notificationType);
  
  if (shouldSend) {
    return await sendPushNotification(userId, title, body, { ...data, type: notificationType });
  } else {
    console.log(`User ${userId} has disabled ${notificationType} notifications`);
    return false;
  }
}

module.exports = {
  sendPushNotification,
  sendBulkPushNotifications,
  shouldSendNotification,
  sendConditionalNotification,
};

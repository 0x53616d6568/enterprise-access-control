const db = require('../config/db');
const { success, error } = require('../utils/response');

// GET /api/preferences — Get user preferences (theme + notification settings)
const getUserPreferences = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Try to fetch theme preferences
    const [themeRows] = await db.query(
      `SELECT theme, accent_color FROM user_theme_preferences WHERE user_id = ?`,
      [userId]
    );

    // Try to fetch notification preferences
    const [notifRows] = await db.query(
      `SELECT access_granted, access_denied, face_fail, req_approved, req_rejected, new_request, visitor_arrived, visitor_expired, token_expiry, security_alert FROM user_notification_preferences WHERE user_id = ?`,
      [userId]
    );

    // Convert TINYINT(1) to proper booleans
    let notifications = getDefaultNotificationSettings();
    if (notifRows.length) {
      notifications = {
        access_granted: notifRows[0].access_granted === 1 || notifRows[0].access_granted === true,
        access_denied: notifRows[0].access_denied === 1 || notifRows[0].access_denied === true,
        face_fail: notifRows[0].face_fail === 1 || notifRows[0].face_fail === true,
        req_approved: notifRows[0].req_approved === 1 || notifRows[0].req_approved === true,
        req_rejected: notifRows[0].req_rejected === 1 || notifRows[0].req_rejected === true,
        new_request: notifRows[0].new_request === 1 || notifRows[0].new_request === true,
        visitor_arrived: notifRows[0].visitor_arrived === 1 || notifRows[0].visitor_arrived === true,
        visitor_expired: notifRows[0].visitor_expired === 1 || notifRows[0].visitor_expired === true,
        token_expiry: notifRows[0].token_expiry === 1 || notifRows[0].token_expiry === true,
        security_alert: notifRows[0].security_alert === 1 || notifRows[0].security_alert === true,
      };
    }

    const prefs = {
      theme: themeRows.length ? themeRows[0].theme : 'dark',
      accentColor: themeRows.length ? themeRows[0].accent_color : 'blue',
      notifications: notifications,
    };

    return success(res, prefs);
  } catch (err) {
    next(err);
  }
};

// POST /api/preferences/theme — Save theme preferences
const saveThemePreferences = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { theme, accentColor } = req.body;

    if (!theme || !accentColor) {
      return error(res, 'Theme and accent color are required', 400);
    }

    // Validate theme value
    if (!['dark', 'light', 'system'].includes(theme)) {
      return error(res, 'Invalid theme value', 400);
    }

    // Validate accent color value
    if (!['blue', 'green', 'purple', 'orange'].includes(accentColor)) {
      return error(res, 'Invalid accent color value', 400);
    }

    // Check if preference exists
    const [existing] = await db.query(
      `SELECT user_id FROM user_theme_preferences WHERE user_id = ?`,
      [userId]
    );

    if (existing.length) {
      // Update existing
      await db.query(
        `UPDATE user_theme_preferences SET theme = ?, accent_color = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [theme, accentColor, userId]
      );
    } else {
      // Insert new
      await db.query(
        `INSERT INTO user_theme_preferences (user_id, theme, accent_color, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())`,
        [userId, theme, accentColor]
      );
    }

    return success(res, { theme, accentColor }, 'Theme preferences saved');
  } catch (err) {
    next(err);
  }
};

// POST /api/preferences/notifications — Save notification preferences
const saveNotificationPreferences = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const settings = req.body;

    // Validate that it's an object with boolean values
    const validKeys = [
      'access_granted', 'access_denied', 'face_fail',
      'req_approved', 'req_rejected', 'new_request',
      'visitor_arrived', 'visitor_expired',
      'token_expiry', 'security_alert'
    ];

    for (const key of Object.keys(settings)) {
      if (!validKeys.includes(key)) {
        return error(res, `Invalid notification setting: ${key}`, 400);
      }
      if (typeof settings[key] !== 'boolean') {
        return error(res, `Setting ${key} must be boolean`, 400);
      }
    }

    // Check if preference exists
    const [existing] = await db.query(
      `SELECT user_id FROM user_notification_preferences WHERE user_id = ?`,
      [userId]
    );

    const defaults = getDefaultNotificationSettings();
    const merged = { ...defaults, ...settings };

    if (existing.length) {
      // Update existing
      await db.query(
        `UPDATE user_notification_preferences 
         SET access_granted = ?, access_denied = ?, face_fail = ?, 
             req_approved = ?, req_rejected = ?, new_request = ?,
             visitor_arrived = ?, visitor_expired = ?,
             token_expiry = ?, security_alert = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [
          merged.access_granted, merged.access_denied, merged.face_fail,
          merged.req_approved, merged.req_rejected, merged.new_request,
          merged.visitor_arrived, merged.visitor_expired,
          merged.token_expiry, merged.security_alert, userId
        ]
      );
    } else {
      // Insert new
      await db.query(
        `INSERT INTO user_notification_preferences 
         (user_id, access_granted, access_denied, face_fail, 
          req_approved, req_rejected, new_request,
          visitor_arrived, visitor_expired,
          token_expiry, security_alert, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          merged.access_granted, merged.access_denied, merged.face_fail,
          merged.req_approved, merged.req_rejected, merged.new_request,
          merged.visitor_arrived, merged.visitor_expired,
          merged.token_expiry, merged.security_alert
        ]
      );
    }
    
    // Ensure response has proper boolean values (not 0/1)
    const responseData = {
      access_granted: merged.access_granted === true || merged.access_granted === 1,
      access_denied: merged.access_denied === true || merged.access_denied === 1,
      face_fail: merged.face_fail === true || merged.face_fail === 1,
      req_approved: merged.req_approved === true || merged.req_approved === 1,
      req_rejected: merged.req_rejected === true || merged.req_rejected === 1,
      new_request: merged.new_request === true || merged.new_request === 1,
      visitor_arrived: merged.visitor_arrived === true || merged.visitor_arrived === 1,
      visitor_expired: merged.visitor_expired === true || merged.visitor_expired === 1,
      token_expiry: merged.token_expiry === true || merged.token_expiry === 1,
      security_alert: merged.security_alert === true || merged.security_alert === 1,
    };
    
    return success(res, responseData, 'Notification preferences saved');
  } catch (err) {
    next(err);
  }
};

// Helper function to get default notification settings
const getDefaultNotificationSettings = () => {
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

module.exports = {
  getUserPreferences,
  saveThemePreferences,
  saveNotificationPreferences,
};

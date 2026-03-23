const db = require('../config/db');
const { success } = require('../utils/response');

const getMyNotifications = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.user_id]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const markAsRead = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?`,
      [req.params.id, req.user.user_id]
    );
    return success(res, {}, 'Marked as read');
  } catch (err) { next(err); }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [req.user.user_id]
    );
    return success(res, {}, 'All marked as read');
  } catch (err) { next(err); }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead };

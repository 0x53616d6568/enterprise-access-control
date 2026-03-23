const db = require('../config/db');
const { success } = require('../utils/response');

const getAllLogs = async (req, res, next) => {
  try {
    const { from, to, result } = req.query;
    const [rows] = await db.query(
      `SELECT l.*, u.full_name, d.door_name
       FROM access_logs l
       LEFT JOIN users u ON l.user_id = u.user_id
       LEFT JOIN doors d ON l.door_id = d.door_id
       WHERE 1=1
       ${from   ? 'AND DATE(l.timestamp) >= ?' : ''}
       ${to     ? 'AND DATE(l.timestamp) <= ?' : ''}
       ${result ? 'AND l.result = ?'           : ''}
       ORDER BY l.timestamp DESC LIMIT 1000`,
      [...(from ? [from] : []), ...(to ? [to] : []), ...(result ? [result] : [])]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const getMyLogs = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, d.door_name FROM access_logs l
       LEFT JOIN doors d ON l.door_id = d.door_id
       WHERE l.user_id = ? ORDER BY l.timestamp DESC LIMIT 100`,
      [req.user.user_id]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const getLogsByDoor = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, u.full_name FROM access_logs l
       LEFT JOIN users u ON l.user_id = u.user_id
       WHERE l.door_id = ? ORDER BY l.timestamp DESC LIMIT 500`,
      [req.params.id]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

module.exports = { getAllLogs, getMyLogs, getLogsByDoor };

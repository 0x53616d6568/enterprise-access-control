const db = require('../config/db');
const { success } = require('../utils/response');

const getMyAttendance = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const [rows] = await db.query(
      `SELECT a.*, d.door_name FROM attendance a
       LEFT JOIN doors d ON a.door_id = d.door_id
       WHERE a.user_id = ?
       ${from ? 'AND DATE(a.check_in) >= ?' : ''}
       ${to   ? 'AND DATE(a.check_in) <= ?' : ''}
       ORDER BY a.check_in DESC`,
      [req.user.user_id, ...(from ? [from] : []), ...(to ? [to] : [])]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const getUserAttendance = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, d.door_name FROM attendance a
       LEFT JOIN doors d ON a.door_id = d.door_id
       WHERE a.user_id = ? ORDER BY a.check_in DESC`,
      [req.params.id]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const getAllAttendance = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.full_name, u.department, d.door_name
       FROM attendance a
       JOIN users u ON a.user_id = u.user_id
       LEFT JOIN doors d ON a.door_id = d.door_id
       ORDER BY a.check_in DESC
       LIMIT 500`
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

module.exports = { getMyAttendance, getUserAttendance, getAllAttendance };

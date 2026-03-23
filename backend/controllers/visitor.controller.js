const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { success, error } = require('../utils/response');

const getMyVisitors = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM visitors WHERE host_user_id = ? ORDER BY created_at DESC`,
      [req.user.user_id]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const getAllVisitors = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT v.*, u.full_name AS host_name, u.department
       FROM visitors v JOIN users u ON v.host_user_id = u.user_id
       ORDER BY v.created_at DESC`
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const createVisitor = async (req, res, next) => {
  try {
    const { full_name, valid_from, valid_until } = req.body;
    if (!full_name) return error(res, 'Visitor name is required', 400);
    const qr_token = uuidv4();
    const [result] = await db.query(
      `INSERT INTO visitors (full_name, host_user_id, valid_from, valid_until, qr_token)
       VALUES (?, ?, ?, ?, ?)`,
      [full_name, req.user.user_id, valid_from, valid_until, qr_token]
    );
    return success(res, { visitor_id: result.insertId, qr_token }, 'Visitor invited', 201);
  } catch (err) { next(err); }
};

const revokeVisitor = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE visitors SET status = 'EXPIRED' WHERE visitor_id = ? AND host_user_id = ?`,
      [req.params.id, req.user.user_id]
    );
    return success(res, {}, 'Visitor access revoked');
  } catch (err) { next(err); }
};

module.exports = { getMyVisitors, getAllVisitors, createVisitor, revokeVisitor };

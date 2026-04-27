const db = require('../config/db');
const { success, error } = require('../utils/response');

const getMyRequests = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.full_name AS reviewed_by_name
       FROM requests r
       LEFT JOIN users u ON r.reviewed_by = u.user_id
       WHERE r.user_id = ? ORDER BY r.created_at DESC`,
      [req.user.user_id]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const getAllRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const [rows] = await db.query(
      `SELECT r.*, u.full_name, u.department,
              rev.full_name AS reviewed_by_name
       FROM requests r
       JOIN users u ON r.user_id = u.user_id
       LEFT JOIN users rev ON r.reviewed_by = rev.user_id
       ${status ? 'WHERE r.status = ?' : ''}
       ORDER BY r.created_at DESC`,
      status ? [status] : []
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const createRequest = async (req, res, next) => {
  try {
    const { type, description } = req.body;
    if (!type) return error(res, 'Request type is required', 400);
    
    // Create request record
    const [result] = await db.query(
      `INSERT INTO requests (user_id, type, description) VALUES (?, ?, ?)`,
      [req.user.user_id, type, description || '']
    );
    
    return success(res, { request_id: result.insertId }, 'Request submitted', 201);
  } catch (err) { next(err); }
};

const reviewRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status))
      return error(res, 'Status must be APPROVED or REJECTED', 400);
    await db.query(
      `UPDATE requests SET status = ?, reviewed_by = ? WHERE request_id = ?`,
      [status, req.user.user_id, req.params.id]
    );

    // Fetch request to notify the user
    const [rows] = await db.query(`SELECT user_id, type FROM requests WHERE request_id = ?`, [req.params.id]);
    if (rows.length) {
      const notifType = status === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED';
      const title = `Request ${status}`;
      const message = `Your ${rows[0].type} request has been ${status.toLowerCase()}.`;
      
      // Save to database
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [rows[0].user_id, title, message, notifType]
      );
    }
    return success(res, {}, `Request ${status.toLowerCase()}`);
  } catch (err) { next(err); }
};

/**
 * POST /api/requests/door-access
 * Simple door access request - employee requests access without time/day validation
 * Manager reviews request and decides whether to grant access
 */
const requestDoorAccess = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { door_id, door_name } = req.body;
    
    if (!door_id) return error(res, 'door_id is required', 400);
    
    // Check door exists
    const [doors] = await db.query(
      `SELECT door_id, door_name FROM doors WHERE door_id = ?`,
      [door_id]
    );
    
    if (!doors.length) {
      return error(res, 'Door not found', 404);
    }
    
    // Create access request
    const description = `Access request for door: ${door_name || doors[0].door_name}`;
    const [result] = await db.query(
      `INSERT INTO requests (user_id, type, description) VALUES (?, ?, ?)`,
      [userId, 'ACCESS_REQUEST', description]
    );
    
    console.log(`[Door Access] Request created for user ${userId} requesting door ${door_id}`);
    
    return success(res, { request_id: result.insertId }, 'Access request submitted', 201);
  } catch (err) { next(err); }
};
};

module.exports = { getMyRequests, getAllRequests, createRequest, requestDoorAccess, reviewRequest };

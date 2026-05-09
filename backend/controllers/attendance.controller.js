/**
 * Attendance Controller
 * Handles check-in, check-out, and attendance tracking
 * Links access logs to attendance records
 */

const db = require('../config/db');
const { success, error } = require('../utils/response');

/**
 * GET /api/attendance/me - Get my attendance history
 */
const getMyAttendance = async (req, res, next) => {
  try {
    const { from, to, limit = 50 } = req.query;
    const params = [req.user.user_id];

    let query = `
      SELECT 
        a.attendance_id,
        a.user_id,
        a.door_id,
        a.check_in,
        a.check_out,
        a.total_hours,
        a.status,
        a.notes,
        d.door_name,
        d.location
      FROM attendance a
      LEFT JOIN doors d ON a.door_id = d.door_id
      WHERE a.user_id = ?
    `;

    if (from) {
      query += ` AND DATE(a.check_in) >= ?`;
      params.push(from);
    }
    if (to) {
      query += ` AND DATE(a.check_in) <= ?`;
      params.push(to);
    }

    query += ` ORDER BY a.check_in DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/attendance/user/:id - Get specific user's attendance (Manager/Admin only)
 */
const getUserAttendance = async (req, res, next) => {
  try {
    const { from, to, limit = 50 } = req.query;
    const userId = req.params.id;
    const params = [userId];

    let query = `
      SELECT 
        a.attendance_id,
        a.user_id,
        a.door_id,
        a.check_in,
        a.check_out,
        a.total_hours,
        a.status,
        a.notes,
        d.door_name,
        d.location
      FROM attendance a
      LEFT JOIN doors d ON a.door_id = d.door_id
      WHERE a.user_id = ?
    `;

    if (from) {
      query += ` AND DATE(a.check_in) >= ?`;
      params.push(from);
    }
    if (to) {
      query += ` AND DATE(a.check_in) <= ?`;
      params.push(to);
    }

    query += ` ORDER BY a.check_in DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/attendance - Get all attendance (Admin only)
 */
const getAllAttendance = async (req, res, next) => {
  try {
    const { from, to, limit = 100 } = req.query;
    const params = [];

    let query = `
      SELECT 
        a.attendance_id,
        a.user_id,
        a.door_id,
        a.check_in,
        a.check_out,
        a.total_hours,
        a.status,
        a.notes,
        u.full_name,
        u.email,
        u.department,
        d.door_name,
        d.location
      FROM attendance a
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN doors d ON a.door_id = d.door_id
      WHERE 1=1
    `;

    if (from) {
      query += ` AND DATE(a.check_in) >= ?`;
      params.push(from);
    }
    if (to) {
      query += ` AND DATE(a.check_in) <= ?`;
      params.push(to);
    }

    query += ` ORDER BY a.check_in DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/attendance/status/current - Get current check-in status
 * Returns active attendance record if user is currently checked in
 */
const getCurrentStatus = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        a.attendance_id,
        a.user_id,
        a.door_id,
        a.check_in,
        a.check_out,
        a.total_hours,
        a.status,
        d.door_name,
        d.location,
        ROUND((UNIX_TIMESTAMP(NOW()) - UNIX_TIMESTAMP(a.check_in)) / 3600, 2) as elapsed_hours
      FROM attendance a
      LEFT JOIN doors d ON a.door_id = d.door_id
      WHERE a.user_id = ? AND a.check_out IS NULL
      ORDER BY a.check_in DESC
      LIMIT 1`,
      [req.user.user_id]
    );

    if (!rows.length) {
      return success(res, null, 'User is not currently checked in');
    }

    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/attendance/check-in
 * Register user as checked in when accessing main entrance
 */
const checkIn = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { door_id, notes = '' } = req.body;
    const userId = req.user.user_id;

    if (!door_id) {
      return error(res, 'door_id is required', 400);
    }

    // Check if user already has active check-in
    const [activeCheckIn] = await connection.query(
      `SELECT attendance_id FROM attendance WHERE user_id = ? AND check_out IS NULL LIMIT 1`,
      [userId]
    );

    if (activeCheckIn.length > 0) {
      await connection.rollback();
      return error(res, 'User already checked in', 409);
    }

    // Create attendance record
    const [result] = await connection.query(
      `INSERT INTO attendance (user_id, door_id, check_in, status, notes)
       VALUES (?, ?, NOW(), 'present', ?)`,
      [userId, door_id, notes]
    );

    const attendanceId = result.insertId;

    // Log access event
    await connection.query(
      `INSERT INTO access_logs (user_id, door_id, method, result, device_info)
       VALUES (?, ?, 'api', 'granted', ?)`,
      [userId, door_id, 'Check-in via mobile app']
    );

    await connection.commit();

    console.log(`✅ [CHECK-IN] User ${userId} checked in (attendance_id: ${attendanceId})`);

    return success(res, {
      attendance_id: attendanceId,
      user_id: userId,
      door_id: door_id,
      check_in: new Date().toISOString(),
      status: 'present',
    }, 'Successfully checked in', 201);

  } catch (err) {
    await connection.rollback();
    console.error('❌ [CHECK-IN] Error:', err.message);
    next(err);
  } finally {
    connection.release();
  }
};

/**
 * POST /api/attendance/check-out
 * Mark user as checked out and calculate total hours
 */
const checkOut = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { attendance_id, notes = '' } = req.body;
    const userId = req.user.user_id;

    if (!attendance_id) {
      return error(res, 'attendance_id is required', 400);
    }

    // Get active attendance record
    const [records] = await connection.query(
      `SELECT a.attendance_id, a.door_id, a.check_in 
       FROM attendance a
       WHERE a.attendance_id = ? AND a.user_id = ? AND a.check_out IS NULL`,
      [attendance_id, userId]
    );

    if (!records.length) {
      await connection.rollback();
      return error(res, 'Attendance record not found or already checked out', 404);
    }

    const record = records[0];

    // Calculate total hours
    const checkInTime = new Date(record.check_in).getTime();
    const checkOutTime = new Date().getTime();
    const totalHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2);

    // Update attendance record
    const [updateResult] = await connection.query(
      `UPDATE attendance 
       SET check_out = NOW(), total_hours = ?, notes = CONCAT(COALESCE(notes, ''), ' | Checkout: ${notes}')
       WHERE attendance_id = ?`,
      [totalHours, attendance_id]
    );

    // Log check-out event
    await connection.query(
      `INSERT INTO access_logs (user_id, door_id, method, result, device_info)
       VALUES (?, ?, 'api', 'granted', ?)`,
      [userId, record.door_id, `Check-out via mobile app (${totalHours}h)`]
    );

    await connection.commit();

    console.log(`✅ [CHECK-OUT] User ${userId} checked out (Total: ${totalHours}h)`);

    return success(res, {
      attendance_id,
      user_id: userId,
      check_out: new Date().toISOString(),
      total_hours: parseFloat(totalHours),
    }, `Successfully checked out (${totalHours}h)`, 200);

  } catch (err) {
    await connection.rollback();
    console.error('❌ [CHECK-OUT] Error:', err.message);
    next(err);
  } finally {
    connection.release();
  }
};

/**
 * GET /api/attendance/logs/:attendance_id
 * Get access logs linked to specific attendance record
 */
const getAttendanceLogs = async (req, res, next) => {
  try {
    const { attendance_id } = req.params;

    // Get attendance record to find user and time range
    const [attendance] = await db.query(
      `SELECT user_id, check_in, check_out FROM attendance WHERE attendance_id = ?`,
      [attendance_id]
    );

    if (!attendance.length) {
      return error(res, 'Attendance record not found', 404);
    }

    const { user_id, check_in, check_out } = attendance[0];
    const checkOutTime = check_out || new Date();

    // Get access logs for this user during this time period
    const [logs] = await db.query(
      `SELECT 
        l.log_id,
        l.user_id,
        l.door_id,
        l.method,
        l.result,
        l.device_info,
        l.timestamp,
        d.door_name,
        d.location
      FROM access_logs l
      LEFT JOIN doors d ON l.door_id = d.door_id
      WHERE l.user_id = ? AND l.timestamp >= ? AND l.timestamp <= ?
      ORDER BY l.timestamp ASC`,
      [user_id, check_in, checkOutTime]
    );

    return success(res, logs);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyAttendance,
  getUserAttendance,
  getAllAttendance,
  getCurrentStatus,
  checkIn,
  checkOut,
  getAttendanceLogs,
};

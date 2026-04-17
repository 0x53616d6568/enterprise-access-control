const db = require('../config/db');
const { success, error } = require('../utils/response');

// Get all doors (admin view)
const getAllDoors = async (req, res, next) => {
  try {
    const [rows] = await db.query(`SELECT * FROM doors ORDER BY door_name`);
    return success(res, rows);
  } catch (err) { next(err); }
};

// Get user's accessible doors (role-based + individual assignments)
const getUserAccessibleDoors = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user's role
    const [userRows] = await db.query(`SELECT access_level FROM users WHERE user_id = ?`, [userId]);
    if (!userRows.length) return error(res, 'User not found', 404);
    
    const userRole = userRows[0].access_level;
    
    // Get doors accessible by role (where role_id is <= user's access level)
    const [roleDoors] = await db.query(`
      SELECT DISTINCT d.*, dar.rule_id, dar.allowed_from, dar.allowed_until, dar.days_of_week, 'role' as access_type
      FROM doors d
      INNER JOIN door_access_rules dar ON d.door_id = dar.door_id
      WHERE dar.role_id <= ?
      ORDER BY d.door_name
    `, [userRole]);
    
    // Get doors accessible by individual assignment
    const [userDoors] = await db.query(`
      SELECT DISTINCT d.*, uda.user_door_id as rule_id, uda.allowed_from, uda.allowed_until, uda.days_of_week, 'individual' as access_type
      FROM doors d
      INNER JOIN user_door_access uda ON d.door_id = uda.door_id
      WHERE uda.user_id = ?
      ORDER BY d.door_name
    `, [userId]);
    
    // Combine results, avoiding duplicates
    const doorMap = new Map();
    
    roleDoors.forEach(door => {
      if (!doorMap.has(door.door_id)) {
        doorMap.set(door.door_id, door);
      }
    });
    
    userDoors.forEach(door => {
      if (!doorMap.has(door.door_id)) {
        doorMap.set(door.door_id, door);
      }
    });
    
    const combinedDoors = Array.from(doorMap.values());
    return success(res, combinedDoors);
  } catch (err) { 
    console.log('getUserAccessibleDoors error:', err.message);
    next(err); 
  }
};

// Get users with door access for admin assignment
const getUsersForDoor = async (req, res, next) => {
  try {
    const doorId = req.params.id;
    
    // Get all users and their access status for this door
    const [users] = await db.query(`
      SELECT u.user_id, u.name, u.email, u.access_level,
             CASE WHEN uda.user_door_id IS NOT NULL THEN 1 ELSE 0 END as has_access,
             uda.user_door_id, uda.allowed_from, uda.allowed_until, uda.days_of_week
      FROM users u
      LEFT JOIN user_door_access uda ON u.user_id = uda.user_id AND uda.door_id = ?
      ORDER BY u.name
    `, [doorId]);
    
    return success(res, users);
  } catch (err) { next(err); }
};

// Assign door access to a user
const assignUserDoor = async (req, res, next) => {
  try {
    const { user_id, door_id, allowed_from, allowed_until, days_of_week } = req.body;
    
    // Check if already exists
    const [existing] = await db.query(
      `SELECT * FROM user_door_access WHERE user_id = ? AND door_id = ?`,
      [user_id, door_id]
    );
    
    if (existing.length) {
      // Update existing
      await db.query(
        `UPDATE user_door_access SET allowed_from = ?, allowed_until = ?, days_of_week = ? WHERE user_id = ? AND door_id = ?`,
        [allowed_from, allowed_until, days_of_week, user_id, door_id]
      );
    } else {
      // Insert new
      await db.query(
        `INSERT INTO user_door_access (user_id, door_id, allowed_from, allowed_until, days_of_week) VALUES (?, ?, ?, ?, ?)`,
        [user_id, door_id, allowed_from, allowed_until, days_of_week]
      );
    }
    
    return success(res, {}, 'User door access updated', 201);
  } catch (err) { next(err); }
};

// Remove door access from user
const removeUserDoor = async (req, res, next) => {
  try {
    const { user_id, door_id } = req.body;
    await db.query(`DELETE FROM user_door_access WHERE user_id = ? AND door_id = ?`, [user_id, door_id]);
    return success(res, {}, 'User door access removed');
  } catch (err) { next(err); }
};

const getDoorById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`SELECT * FROM doors WHERE door_id = ?`, [req.params.id]);
    if (!rows.length) return error(res, 'Door not found', 404);
    return success(res, rows[0]);
  } catch (err) { next(err); }
};

const createDoor = async (req, res, next) => {
  try {
    const { door_name, location, security_level, requires_face_auth, fallback_method, pi_device_id } = req.body;
    const [result] = await db.query(
      `INSERT INTO doors (door_name, location, security_level, requires_face_auth, fallback_method, pi_device_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [door_name, location, security_level, requires_face_auth || 0, fallback_method || 'NONE', pi_device_id]
    );
    return success(res, { door_id: result.insertId }, 'Door created', 201);
  } catch (err) { next(err); }
};

const updateDoor = async (req, res, next) => {
  try {
    const { door_name, location, security_level, requires_face_auth, fallback_method, pi_device_id } = req.body;
    await db.query(
      `UPDATE doors SET
        door_name          = COALESCE(?, door_name),
        location           = COALESCE(?, location),
        security_level     = COALESCE(?, security_level),
        requires_face_auth = COALESCE(?, requires_face_auth),
        fallback_method    = COALESCE(?, fallback_method),
        pi_device_id       = COALESCE(?, pi_device_id)
       WHERE door_id = ?`,
      [door_name, location, security_level, requires_face_auth, fallback_method, pi_device_id, req.params.id]
    );
    return success(res, {}, 'Door updated');
  } catch (err) { next(err); }
};

const deleteDoor = async (req, res, next) => {
  try {
    await db.query(`DELETE FROM doors WHERE door_id = ?`, [req.params.id]);
    return success(res, {}, 'Door deleted');
  } catch (err) { next(err); }
};

const getAccessRules = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT dar.*, r.role_name FROM door_access_rules dar
       JOIN roles r ON dar.role_id = r.role_id
       WHERE dar.door_id = ?`,
      [req.params.id]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const setAccessRule = async (req, res, next) => {
  try {
    const { role_id, allowed_from, allowed_until, days_of_week } = req.body;
    const [result] = await db.query(
      `INSERT INTO door_access_rules (role_id, door_id, allowed_from, allowed_until, days_of_week)
       VALUES (?, ?, ?, ?, ?)`,
      [role_id, req.params.id, allowed_from, allowed_until, days_of_week]
    );
    return success(res, { rule_id: result.insertId }, 'Access rule created', 201);
  } catch (err) { next(err); }
};

const deleteAccessRule = async (req, res, next) => {
  try {
    await db.query(`DELETE FROM door_access_rules WHERE rule_id = ?`, [req.params.ruleId]);
    return success(res, {}, 'Access rule deleted');
  } catch (err) { next(err); }
};

module.exports = { 
  getAllDoors, getDoorById, getUserAccessibleDoors, 
  getUsersForDoor, assignUserDoor, removeUserDoor,
  createDoor, updateDoor, deleteDoor, 
  getAccessRules, setAccessRule, deleteAccessRule 
};

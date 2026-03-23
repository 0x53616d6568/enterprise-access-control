const db = require('../config/db');
const { success, error } = require('../utils/response');

const getAllDoors = async (req, res, next) => {
  try {
    const [rows] = await db.query(`SELECT * FROM doors ORDER BY door_name`);
    return success(res, rows);
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

module.exports = { getAllDoors, getDoorById, createDoor, updateDoor, deleteDoor, getAccessRules, setAccessRule, deleteAccessRule };

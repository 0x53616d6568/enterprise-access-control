// MQTT Testing Render Deployment
// Deployed mqtt-testing branch with MQTT token system
const BASE_URL = 'https://enterprise-access-control-x.onrender.com/api';

// LOCAL DEV (COMMENTED OUT - for testing only):
// To use localhost, change your machine's IP:
// Run: ipconfig (PowerShell) and get IPv4 Address
//const BASE_URL = 'http://10.210.53.125:3000/api';

export const API = {
  BASE_URL,

  // Auth
  LOGIN:           `${BASE_URL}/auth/login`,
  REFRESH:         `${BASE_URL}/auth/refresh`,
  LOGOUT:          `${BASE_URL}/auth/logout`,
  ME:              `${BASE_URL}/auth/me`,
  CHANGE_PASSWORD: `${BASE_URL}/auth/change-password`,

  // Users
  USERS:           `${BASE_URL}/users`,
  USER:            (id) => `${BASE_URL}/users/${id}`,
  PUSH_TOKEN:      `${BASE_URL}/users/push-token`,

  // Doors
  DOORS:           `${BASE_URL}/doors`,
  DOOR:            (id) => `${BASE_URL}/doors/${id}`,
  MY_DOORS:        `${BASE_URL}/doors/access/my-doors`,
  DOOR_RULES:      (id) => `${BASE_URL}/doors/${id}/rules`,

  // Attendance
  MY_ATTENDANCE:   `${BASE_URL}/attendance/me`,
  USER_ATTENDANCE: (id) => `${BASE_URL}/attendance/user/${id}`,
  ALL_ATTENDANCE:  `${BASE_URL}/attendance`,
  ATTENDANCE_STATUS: `${BASE_URL}/attendance/status/current`,
  ATTENDANCE_CHECK_IN: `${BASE_URL}/attendance/check-in`,
  ATTENDANCE_CHECK_OUT: `${BASE_URL}/attendance/check-out`,
  ATTENDANCE:      `${BASE_URL}/attendance`,

  // Requests
  MY_REQUESTS:           `${BASE_URL}/requests/me`,
  ALL_REQUESTS:          `${BASE_URL}/requests`,
  DOOR_ACCESS_REQUEST:   `${BASE_URL}/mqtt/request-access`,
  REVIEW_REQUEST:        (id) => `${BASE_URL}/requests/${id}/review`,

  // Visitors
  MY_VISITORS:     `${BASE_URL}/visitors/me`,
  ALL_VISITORS:    `${BASE_URL}/visitors`,
  REVOKE_VISITOR:  (id) => `${BASE_URL}/visitors/${id}/revoke`,

  // Notifications
  NOTIFICATIONS:   `${BASE_URL}/notifications`,
  MARK_READ:       (id) => `${BASE_URL}/notifications/${id}/read`,
  MARK_ALL_READ:   `${BASE_URL}/notifications/read-all`,

  // Logs
  ALL_LOGS:        `${BASE_URL}/logs`,
  MY_LOGS:         `${BASE_URL}/logs/me`,
  DOOR_LOGS:       (id) => `${BASE_URL}/logs/door/${id}`,

  // Preferences
  PREFERENCES:     `${BASE_URL}/preferences`,
  THEME_PREFS:     `${BASE_URL}/preferences/theme`,
  NOTIF_PREFS:     `${BASE_URL}/preferences/notifications`,

  // BLE Token
  BLE_TOKEN:       `${BASE_URL}/auth/ble-token`,
  BLE_TOKEN_ROTATE: `${BASE_URL}/auth/ble-token/rotate`,

  // MQTT Token Management
  MQTT_TOKEN_GENERATE: `${BASE_URL}/mqtt/token/generate`,
  MQTT_TOKENS:     `${BASE_URL}/mqtt/tokens`,
  MQTT_TOKEN:      `${BASE_URL}/mqtt/token`,
  MQTT_TOKENS_REVOKE_ALL: `${BASE_URL}/mqtt/tokens/revoke-all`,

  // MQTT Door Access Requests (Prompted behavior)
  MQTT_REQUEST_ACCESS: `${BASE_URL}/mqtt/request-access`,
  MQTT_REQUEST:    `${BASE_URL}/mqtt/request`,
  MQTT_REQUEST_HISTORY: `${BASE_URL}/mqtt/request-history`,

  // Virtual Door (Testing)
  VIRTUAL_DOOR_STATUS: `${BASE_URL}/virtual-door/status`,
  VIRTUAL_DOOR_UNLOCK: `${BASE_URL}/virtual-door/unlock`,

  // Face Recognition (via Backend)
  FACE_ENROLL:     `${BASE_URL}/face/enroll`,
  FACE_RECOGNIZE:  `${BASE_URL}/face/recognize`,
  FACE_GET:        (id) => `${BASE_URL}/face/${id}`,
  FACE_STATUS:     (id) => `${BASE_URL}/face/status/${id}`,
  FACE_DELETE:     (id) => `${BASE_URL}/face/${id}`,
  FACE_BATCH:      `${BASE_URL}/face/batch`,

  // Face Recognition Microservice (HuggingFace Spaces - Production)
  FACE_MICROSERVICE_BASE: 'https://Soapppp11-enterprise-access-control-face.hf.space',
  FACE_MICROSERVICE_API_KEY: 'sk-face-xyz123',
  FACE_MICROSERVICE_ENROLL: 'https://Soapppp11-enterprise-access-control-face.hf.space/enroll',
  FACE_MICROSERVICE_RECOGNIZE: 'https://Soapppp11-enterprise-access-control-face.hf.space/recognize',
  FACE_MICROSERVICE_HEALTH: 'https://Soapppp11-enterprise-access-control-face.hf.space/health',

  // Face Recognition Microservice (Local Testing)
  // Uncomment to use localhost instead of HF Spaces
  // FACE_MICROSERVICE_BASE: 'http://localhost:5000',
  // FACE_MICROSERVICE_ENROLL: 'http://localhost:5000/enroll',
  // FACE_MICROSERVICE_RECOGNIZE: 'http://localhost:5000/recognize',
  // FACE_MICROSERVICE_HEALTH: 'http://localhost:5000/health',
};

export default API;

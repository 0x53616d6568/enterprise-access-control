// Change this to your machine's local IP when testing on a physical device
// To find it: run "ipconfig" in PowerShell and look for IPv4 Address
// e.g. 192.168.1.10
const BASE_URL = 'http://192.168.1.138:3000/api';

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
  DOOR_RULES:      (id) => `${BASE_URL}/doors/${id}/rules`,

  // Attendance
  MY_ATTENDANCE:   `${BASE_URL}/attendance/me`,
  USER_ATTENDANCE: (id) => `${BASE_URL}/attendance/user/${id}`,
  ALL_ATTENDANCE:  `${BASE_URL}/attendance`,

  // Requests
  MY_REQUESTS:     `${BASE_URL}/requests/me`,
  ALL_REQUESTS:    `${BASE_URL}/requests`,
  REVIEW_REQUEST:  (id) => `${BASE_URL}/requests/${id}/review`,

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
};

export default API;

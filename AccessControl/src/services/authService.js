import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API } from '../constants/api';

const ACCESS_TOKEN_KEY  = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY          = 'user';

// ── Token storage ─────────────────────────────────────────
export const saveTokens = async (accessToken, refreshToken) => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY,  accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = async () => {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async () => {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
};

export const saveUser = async (user) => {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

export const getStoredUser = async () => {
  const user = await SecureStore.getItemAsync(USER_KEY);
  return user ? JSON.parse(user) : null;
};

// ── Auth API calls ────────────────────────────────────────
export const login = async (email, password) => {
  const response = await axios.post(API.LOGIN, { email, password });
  return response.data;
};

export const refreshAccessToken = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');
  const response = await axios.post(API.REFRESH, { refreshToken });
  return response.data.data.accessToken;
};

export const logout = async (accessToken, refreshToken) => {
  await axios.post(
    API.LOGOUT,
    { refreshToken },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
};

export const changePassword = async (accessToken, tempPassword, newPassword) => {
  const response = await axios.post(
    API.CHANGE_PASSWORD,
    { temp_password: tempPassword, new_password: newPassword },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
};

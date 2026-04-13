import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  login as loginService,
  logout as logoutService,
  saveTokens,
  saveUser,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  refreshAccessToken,
  getCurrentUser,
} from '../services/authService';
import { getThemePreferences } from '../services/preferencesService';

const AuthContext = createContext(null);

// Helper function to decode JWT and get expiration time
const getTokenExpiration = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const decoded = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf8')
    );
    return decoded.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
  } catch (err) {
    return null;
  }
};

// Helper function to check if token is expired or about to expire (within 2 minutes)
const isTokenExpiringSoon = (token) => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return false;
  const now = Date.now();
  const timeUntilExpiry = expiration - now;
  return timeUntilExpiry < 2 * 60 * 1000; // Less than 2 minutes
};

export const AuthProvider = ({ children }) => {
  const [user,         setUser]         = useState(null);
  const [accessToken,  setAccessToken]  = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [theme,        setTheme]        = useState('dark');
  const [accentColor,  setAccentColor]  = useState('blue');
  const refreshTimerRef = useRef(null);
  const refreshAttemptsRef = useRef(0);
  const MAX_REFRESH_ATTEMPTS = 3;

  // Function to refresh token
  const performTokenRefresh = async () => {
    try {
      refreshAttemptsRef.current++;
      
      if (refreshAttemptsRef.current > MAX_REFRESH_ATTEMPTS) {
        console.log('❌ Max refresh attempts reached, logging out');
        await logout();
        return;
      }

      const newToken = await refreshAccessToken();
      const refreshToken = await getRefreshToken();
      await saveTokens(newToken, refreshToken);
      setAccessToken(newToken);
      refreshAttemptsRef.current = 0; // Reset on success
      console.log('✅ Token refreshed proactively');
      scheduleTokenRefresh(newToken);
    } catch (err) {
      console.log('Token refresh failed:', err.message);
      
      if (refreshAttemptsRef.current >= MAX_REFRESH_ATTEMPTS) {
        console.log('❌ Token refresh failed too many times, logging out');
        await logout();
      }
    }
  };

  // Function to schedule next refresh based on token expiration
  const scheduleTokenRefresh = (token) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const expiration = getTokenExpiration(token);
    if (!expiration) return;

    const now = Date.now();
    const timeUntilExpiry = expiration - now;
    const refreshTime = timeUntilExpiry - 3 * 60 * 1000; // Refresh 3 minutes before expiry

    // Safety check: don't schedule if refresh time is in the past or too soon
    if (refreshTime < 30 * 1000) { // Minimum 30 seconds buffer
      console.log('⚠️ Token expiry too close, deferring refresh scheduling');
      refreshTimerRef.current = setTimeout(() => {
        scheduleTokenRefresh(token);
      }, 10 * 1000); // Check again in 10 seconds
      return;
    }

    if (refreshTime > 0) {
      refreshTimerRef.current = setTimeout(() => {
        performTokenRefresh();
      }, refreshTime);
      console.log(`⏱️ Token refresh scheduled in ${Math.floor(refreshTime / 1000)}s`);
    }
  };

  // Restore session on app start
  useEffect(() => {
    const restoreSession = async () => {
      const sessionTimeout = setTimeout(() => {
        console.log('⏱️ Session restore timeout, proceeding without session');
        setIsLoading(false);
      }, 15000); // 15 second timeout

      try {
        const [token, storedUser] = await Promise.all([
          getAccessToken(),
          getStoredUser(),
        ]);
        clearTimeout(sessionTimeout);

        if (token && storedUser) {
          setAccessToken(token);
          setUser(storedUser);
          setIsFirstLogin(storedUser?.is_first_login === true);
          
          // Check if token is expiring soon and refresh if needed
          if (isTokenExpiringSoon(token)) {
            console.log('🔄 Token expiring soon, refreshing...');
            await performTokenRefresh();
          } else {
            // Schedule next refresh
            scheduleTokenRefresh(token);
          }
          
          // Load theme preferences with timeout (non-blocking)
          try {
            const themePrefsPromise = getThemePreferences(token);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Theme load timeout')), 5000)
            );
            
            const themePrefs = await Promise.race([themePrefsPromise, timeoutPromise]);
            setTheme(themePrefs.theme || 'dark');
            setAccentColor(themePrefs.accentColor || 'blue');
          } catch (err) {
            console.log('Failed to load theme preferences:', err.message);
            // Use defaults on failure
            setTheme('dark');
            setAccentColor('blue');
          }
        }
      } catch (err) {
        console.log('Session restore failed:', err.message);
        clearTimeout(sessionTimeout);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const login = async (email, password) => {
    refreshAttemptsRef.current = 0; // Reset refresh counter on new login
    const data = await loginService(email, password);
    const { accessToken, refreshToken, user, is_first_login } = data.data;

    await saveTokens(accessToken, refreshToken);
    await saveUser(user);

    setAccessToken(accessToken);
    setUser(user);
    setIsFirstLogin(is_first_login);

    // Schedule token refresh after login
    scheduleTokenRefresh(accessToken);

    return { is_first_login };
  };

  const logout = async () => {
    try {
      const refreshToken = await getRefreshToken();
      await logoutService(accessToken, refreshToken);
    } catch (err) {
      console.log('Logout error:', err.message);
    } finally {
      // Clear refresh timer and reset counter
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      refreshAttemptsRef.current = 0;

      await clearTokens();
      setUser(null);
      setAccessToken(null);
      setIsFirstLogin(false);
    }
  };

  const updateUser = async (updatedUser) => {
    await saveUser(updatedUser);
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      if (!accessToken) return;
      const updatedUser = await getCurrentUser(accessToken);
      await saveUser(updatedUser);
      setUser(updatedUser);
    } catch (err) {
      console.log('Failed to refresh user data:', err.message);
    }
  };

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const updateAccentColor = (newColor) => {
    setAccentColor(newColor);
  };

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      isLoading,
      isFirstLogin,
      setIsFirstLogin,
      theme,
      accentColor,
      updateTheme,
      updateAccentColor,
      login,
      logout,
      updateUser,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;

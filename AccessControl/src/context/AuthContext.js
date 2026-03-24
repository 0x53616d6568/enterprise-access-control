import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginService,
  logout as logoutService,
  saveTokens,
  saveUser,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
} from '../services/authService';
import { getThemePreferences } from '../services/preferencesService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,         setUser]         = useState(null);
  const [accessToken,  setAccessToken]  = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [theme,        setTheme]        = useState('dark');
  const [accentColor,  setAccentColor]  = useState('blue');

  // Restore session on app start
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [token, storedUser] = await Promise.all([
          getAccessToken(),
          getStoredUser(),
        ]);
        if (token && storedUser) {
          setAccessToken(token);
          setUser(storedUser);
          
          // Load theme preferences
          try {
            const themePrefs = await getThemePreferences(token);
            setTheme(themePrefs.theme || 'dark');
            setAccentColor(themePrefs.accentColor || 'blue');
          } catch (err) {
            console.log('Failed to load theme preferences:', err.message);
          }
        }
      } catch (err) {
        console.log('Session restore failed:', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const data = await loginService(email, password);
    const { accessToken, refreshToken, user, is_first_login } = data.data;

    await saveTokens(accessToken, refreshToken);
    await saveUser(user);

    setAccessToken(accessToken);
    setUser(user);
    setIsFirstLogin(is_first_login);

    return { is_first_login };
  };

  const logout = async () => {
    try {
      const refreshToken = await getRefreshToken();
      await logoutService(accessToken, refreshToken);
    } catch (err) {
      console.log('Logout error:', err.message);
    } finally {
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

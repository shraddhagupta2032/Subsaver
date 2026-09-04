import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { storage } from '../utils/storage';
import { authApi } from '../api/auth';
import { setUnauthorizedHandler, setApiBaseUrl } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await storage.clearAll();
      setToken(null);
      setUser(null);
    } catch (e) {
      console.warn('Logout error:', e);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const loadSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedUrl = await storage.getApiBaseUrl();
      if (savedUrl) {
        setApiBaseUrl(savedUrl);
      }

      const savedToken = await storage.getToken();
      if (savedToken) {
        setToken(savedToken);
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        await storage.saveUser(userData);
      }
    } catch (e) {
      console.warn('Session restore failed:', e.message);
      await logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    if (!res || !res.access_token) {
      throw new Error('Invalid login response from server.');
    }

    const accessToken = res.access_token;
    await storage.saveToken(accessToken);
    setToken(accessToken);

    const userData = await authApi.getCurrentUser();
    setUser(userData);
    await storage.saveUser(userData);

    return userData;
  };

  const registerUser = async (name, email, password) => {
    const res = await authApi.register(name, email, password);
    // After registration, automatically login
    return await login(email, password);
  };

  const refreshUser = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      await storage.saveUser(userData);
      return userData;
    } catch (e) {
      console.warn('Refresh user error:', e);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register: registerUser,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

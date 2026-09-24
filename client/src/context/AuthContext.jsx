import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('hh_user') || 'null');
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('hh_token'));
  const [user, setUser] = useState(readUser);
  const [booting, setBooting] = useState(false);

  const persist = (tok, usr) => {
    localStorage.setItem('hh_token', tok);
    localStorage.setItem('hh_user', JSON.stringify(usr));
    setToken(tok);
    setUser(usr);
  };

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    persist(data.token, data.user);
    return data.user;
  }, []);

  const adminLogin = useCallback(async (credentials) => {
    const { data } = await api.post('/admin/login', credentials);
    const user = data.data || data.user || { name: 'Super Admin', role: 'superadmin' };
    persist(data.token, user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hh_token');
    localStorage.removeItem('hh_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      login,
      adminLogin,
      logout,
      isSuperAdmin: user?.role === 'superadmin',
      isStudent: user?.role === 'student'
    }),
    [token, user, booting, login, adminLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setToken, getToken, apiError } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch (e) {
      setUser(null);
      setToken('');
    }
  };

  const refreshUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    (async () => {
      if (getToken()) {
        await fetchMe();
        await refreshUsers();
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setToken(data.token);
      setUser(data.user);
      await refreshUsers();
      return { ok: true };
    } catch (e) {
      return { ok: false, message: apiError(e) };
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post('/auth/register', payload);
      if (data && data.requires_approval) {
        // Do NOT login: driver needs approval first
        return { ok: true, requires_approval: true, user: data.user };
      }
      setToken(data.token);
      setUser(data.user);
      await refreshUsers();
      return { ok: true };
    } catch (e) {
      return { ok: false, message: apiError(e) };
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
  };

  const updateUserStatus = async (userId, status) => {
    try {
      await api.post(`/admin/users/${userId}/status`, { status });
      await refreshUsers();
    } catch (e) {
      console.error('Erro ao atualizar status:', apiError(e));
    }
  };

  const updateUserFields = async (userId, fields) => {
    // Only self update via PATCH /users/me
    if (!user || userId !== user.id) {
      await refreshUsers();
      return;
    }
    try {
      const { data } = await api.patch('/users/me', fields);
      setUser(data);
      await refreshUsers();
    } catch (e) {
      console.error('Erro ao atualizar perfil:', apiError(e));
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, users, loading, login, register, logout, updateUserStatus, updateUserFields, refreshUsers }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

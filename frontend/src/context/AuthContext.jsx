import React, { createContext, useContext, useEffect, useState } from 'react';
import { MOCK_USERS } from '../mock';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(MOCK_USERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('bj_user');
    const storedUsers = localStorage.getItem('bj_users');
    if (storedUsers) {
      try { setUsers(JSON.parse(storedUsers)); } catch (e) { /* ignore */ }
    }
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (e) { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const persistUsers = (list) => {
    setUsers(list);
    localStorage.setItem('bj_users', JSON.stringify(list));
  };

  const login = (email, password) => {
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return { ok: false, message: 'E-mail ou senha inválidos' };
    if (found.status === 'bloqueado') return { ok: false, message: 'Conta bloqueada. Contate o suporte.' };
    setUser(found);
    localStorage.setItem('bj_user', JSON.stringify(found));
    return { ok: true };
  };

  const register = (data) => {
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { ok: false, message: 'E-mail já cadastrado' };
    }
    const newUser = {
      id: 'u_' + Date.now(),
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      rating: 0.0,
      trips: 0,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}`,
      status: 'ativo',
      verified: false,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const updated = [...users, newUser];
    persistUsers(updated);
    setUser(newUser);
    localStorage.setItem('bj_user', JSON.stringify(newUser));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bj_user');
  };

  const updateUserStatus = (userId, status) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, status } : u));
    persistUsers(updated);
  };

  const updateUserFields = (userId, fields) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, ...fields } : u));
    persistUsers(updated);
    if (user && user.id === userId) {
      const merged = { ...user, ...fields };
      setUser(merged);
      localStorage.setItem('bj_user', JSON.stringify(merged));
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, users, loading, login, register, logout, updateUserStatus, updateUserFields }}
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

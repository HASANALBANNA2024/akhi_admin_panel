'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, readSession, setToken } from './api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking, null = signed out

  useEffect(() => { setSession(getToken() ? readSession() : null); }, []);

  /** POST /admin/login */
  const login = useCallback(async (username, password) => {
    const r = await api('/admin/login', { method: 'POST', body: { username, password }, auth: false });
    setToken(r.access_token);
    setSession(readSession());
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setSession(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthCtx.Provider value={{ session, login, logout, isOwner: session?.role === 'owner' }}>
      {children}
    </AuthCtx.Provider>
  );
}

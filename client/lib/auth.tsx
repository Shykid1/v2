'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, getToken, setToken } from './api';
import type { AuthResponse, AuthUser } from './types';

export interface RegisterHouseholdInput {
  name: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  password: string;
  district?: string;
  community?: string;
}

export interface RegisterProviderInput {
  businessName: string;
  name: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  password: string;
  coverageZones?: string[];
  region?: string;
  district?: string;
  vehicleCapacityLiters?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  registerHousehold: (input: RegisterHouseholdInput) => Promise<AuthUser>;
  registerProvider: (input: RegisterProviderInput) => Promise<AuthUser>;
  logout: () => void;
  setSession: (res: AuthResponse) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!getToken()) {
        if (active) setLoading(false);
        return;
      }
      try {
        const u = await api.get<AuthUser>('/users/me');
        if (active) setUser(u);
      } catch {
        setToken(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setSession = useCallback((res: AuthResponse) => {
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await api.post<AuthResponse>(
        '/auth/login',
        { identifier, password },
        false,
      );
      setSession(res);
      return res.user;
    },
    [setSession],
  );

  const registerHousehold = useCallback(
    async (input: RegisterHouseholdInput) => {
      const res = await api.post<AuthResponse>('/auth/register/household', input, false);
      setSession(res);
      return res.user;
    },
    [setSession],
  );

  const registerProvider = useCallback(
    async (input: RegisterProviderInput) => {
      const res = await api.post<AuthResponse>('/auth/register/provider', input, false);
      setSession(res);
      return res.user;
    },
    [setSession],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, registerHousehold, registerProvider, logout, setSession }),
    [user, loading, login, registerHousehold, registerProvider, logout, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

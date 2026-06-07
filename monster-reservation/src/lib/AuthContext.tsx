import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, tokenStore, setUnauthorizedHandler, type User } from './api';

type Mode = 'customer' | 'admin';

interface AuthState {
  loading: boolean;
  user: User | null;
  mode: Mode;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  adminLogin: (email: string, password: string) => Promise<User>;
  signup: (payload: {
    email: string;
    password: string;
    kindergarten_name: string;
    contact_name: string;
    contact_phone: string;
  }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  mode,
}: {
  children: ReactNode;
  mode: Mode;
}) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, mode });

  useEffect(() => {
    setState((s) => ({ ...s, mode }));
  }, [mode]);

  const refresh = useCallback(async () => {
    const tok = tokenStore.get();
    if (!tok) {
      setState((s) => ({ ...s, loading: false, user: null }));
      return;
    }
    try {
      const me = await api.me();
      setState((s) => ({ ...s, loading: false, user: me }));
    } catch {
      tokenStore.set(null);
      setState((s) => ({ ...s, loading: false, user: null }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 401 발생 시 자동 로그아웃
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setState((s) => ({ ...s, user: null }));
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.login(email, password);
    tokenStore.set(r.token);
    setState((s) => ({ ...s, user: r.user }));
    return r.user;
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    const r = await api.adminLogin(email, password);
    tokenStore.set(r.token);
    setState((s) => ({ ...s, user: r.user }));
    return r.user;
  }, []);

  const signup = useCallback(async (payload: {
    email: string;
    password: string;
    kindergarten_name: string;
    contact_name: string;
    contact_phone: string;
  }) => {
    return api.signup(payload);
  }, []);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setState((s) => ({ ...s, user: null }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, adminLogin, signup, logout, refresh }),
    [state, login, adminLogin, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authFetch, clearAuthToken, getAuthToken, setAuthToken } from '../lib/auth-token';

interface AuthState {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function readInitialAuth(): boolean {
  return !!getAuthToken();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(readInitialAuth);

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!resp.ok) return false;
      const data = await resp.json() as { token?: string };
      if (!data.token) return false;
      setAuthToken(data.token);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setIsAuthenticated(false);
  }, []);

  // Best-effort verification for restored sessions. Pages remain responsive on
  // transient network failures; protected APIs still enforce token validity.
  useEffect(() => {
    if (!getAuthToken()) return;
    authFetch('/api/auth/verify')
      .then((resp) => {
        if (!resp.ok) logout();
      })
      .catch(() => {});
  }, [logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

import { createContext, useCallback, useContext, useState } from 'react';

const SESSION_KEY = 'vodhub_auth';

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
  if (typeof window === 'undefined') return false;
  try {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (!session) return false;
    const data = JSON.parse(session);
    if (data.expires > Date.now()) return true;
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Read synchronously on first render so we don't briefly redirect to /login
  // on a fresh page load with a valid session.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(readInitialAuth);

  const login = useCallback(async (password: string): Promise<boolean> => {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
    if (!adminPassword || password !== adminPassword) return false;

    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ expires: Date.now() + 7 * 24 * 60 * 60 * 1000 }),
    );
    setIsAuthenticated(true);
    return true;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

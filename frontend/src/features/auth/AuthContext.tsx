import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../types';
import { authService, DemoUserItem } from '../../services/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickLogin: (demoUser: DemoUserItem) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (demoUser: DemoUserItem) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifySession() {
      const storedToken = authService.getStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authService.getMe();
        setUser(me);
      } catch (err) {
        console.warn('Session verification failed, using cached user if available:', err);
      } finally {
        setIsLoading(false);
      }
    }
    verifySession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      setUser(res.user);
      setToken(res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (demoUser: DemoUserItem) => {
    const password = demoUser.defaultPassword || 'Admin@1234';
    await login(demoUser.email, password);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchAccount = async (demoUser: DemoUserItem) => {
    await quickLogin(demoUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user || !!token,
        login,
        quickLogin,
        logout,
        switchAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

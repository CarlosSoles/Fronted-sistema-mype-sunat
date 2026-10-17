import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '@/modules/auth/services/authApi';
import {
  type AuthUser,
  type ChangePasswordPayload,
  type LoginPayload,
  type RegisterPayload,
} from '@/modules/auth/types/auth.types';
import { useAuthStore } from '@/stores/authStore';

export interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const storeUser = useAuthStore((s) => s.user);
  const storeToken = useAuthStore((s) => s.token);

  const [user, setUser] = useState<AuthUser | null>((storeUser as AuthUser) || null);
  const [accessToken, setAccessToken] = useState<string | null>(storeToken);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restauración de sesión silenciosa (Silent Refresh on mount - F5 resilience)
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const response = await authApi.refreshToken();
        const token = response.accessToken || response.token;
        if (token && isMounted) {
          setAccessToken(token);
          setUser(response.user);
          useAuthStore.getState().setSession(token, response.user);
          if (response.companies && response.companies.length > 0) {
            useAuthStore.getState().setActiveCompany(response.companies[0]);
          }
        }
      } catch {
        // Si no hay cookie válida o expiró, mantenemos el estado local limpio
        if (isMounted && !storeToken) {
          useAuthStore.getState().logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [storeToken]);

  const login = async (credentials: LoginPayload) => {
    const data = await authApi.login(credentials);
    const token = data.accessToken || data.token || '';
    setAccessToken(token);
    setUser(data.user);
    useAuthStore.getState().setSession(token, data.user);
    if (data.companies && data.companies.length > 0) {
      useAuthStore.getState().setActiveCompany(data.companies[0]);
    }
  };

  const register = async (payload: RegisterPayload) => {
    const data = await authApi.register(payload);
    const token = data.accessToken || data.token || '';
    setAccessToken(token);
    setUser(data.user);
    useAuthStore.getState().setSession(token, data.user);
    if (data.companies && data.companies.length > 0) {
      useAuthStore.getState().setActiveCompany(data.companies[0]);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignorar fallos de red en logout para garantizar la salida local
    } finally {
      setAccessToken(null);
      setUser(null);
      useAuthStore.getState().logout();
    }
  };

  const updateProfile = async (fullName: string) => {
    await authApi.updateProfile({ fullName });
    if (user) {
      const updatedUser: AuthUser = { ...user, fullName, name: fullName };
      setUser(updatedUser);
      useAuthStore.getState().updateUser(updatedUser);
    }
  };

  const changePassword = async (payload: ChangePasswordPayload) => {
    await authApi.changePassword(payload);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

  /**
   * Adopta la sesión del store en cuanto llega.
   *
   * POR QUÉ HACE FALTA
   *
   * Los `useState` de arriba se inicializan con el valor del store en el PRIMER
   * render. Cuando la sesión viene de `localStorage` —es decir, tras una
   * recarga—, `persist` de zustand todavía no ha hidratado en ese instante, así
   * que los dos arrancan en `null`. Nada volvía a leerlos: el `accessToken`
   * local se quedaba en `null` para siempre y `isAuthenticated: !!accessToken`
   * daba `false`, con lo que `ProtectedRoute` mandaba a /login teniendo una
   * sesión válida guardada.
   *
   * El síntoma era engañoso: entrar con el botón de login SÍ funcionaba (ahí
   * `login()` escribe el `useState` directamente) y recargar en una ruta
   * protegida NO. Y como el `localStorage` sí tenía la sesión, parecía que el
   * problema estaba en el almacenamiento y no aquí.
   */
  useEffect(() => {
    if (storeToken) setAccessToken(storeToken);
    if (storeUser) setUser(storeUser as AuthUser);

    // Y si el store se vacía (logout en otra pestaña o expiración), se refleja.
    if (!storeToken) setAccessToken((actual) => (actual && !storeToken ? null : actual));
  }, [storeToken, storeUser]);

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
        // Si no hay cookie válida o expiró, se limpia la sesión local.
        //
        // El token se lee del store EN ESTE MOMENTO y no de `storeToken`: esa
        // variable es la captura del primer render, cuando `persist` todavía no
        // había hidratado y valía `null`. Con la captura, este `logout()`
        // cerraba la sesión que acababa de restaurarse desde el almacenamiento,
        // y la app redirigía a /login teniendo una sesión válida guardada.
        if (isMounted && !useAuthStore.getState().token) {
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

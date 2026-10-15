import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'OPERATOR';
}

export interface ActiveCompany {
  tenantId: string;
  ruc: string;
  razonSocial: string;
  regimen: 'MYPE_TRIBUTARIO' | 'GENERAL' | 'ESPECIAL' | 'RUS';
}

interface AuthState {
  token: string | null;
  user: UserSession | null;
  activeCompany: ActiveCompany | null;
  isAuthenticated: boolean;
  
  // Acciones
  setSession: (token: string, user: UserSession) => void;
  setActiveCompany: (company: ActiveCompany) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      activeCompany: null,
      isAuthenticated: false,

      setSession: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),

      setActiveCompany: (activeCompany) =>
        set({
          activeCompany,
        }),

      logout: () =>
        set({
          token: null,
          user: null,
          activeCompany: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'sync-sunat-auth',
    }
  )
);

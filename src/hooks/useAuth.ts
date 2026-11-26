import { useAuthStore } from '@/stores/authStore';
import { normalizeRoleCode } from '@/modules/auth/lib/roleCode';

/**
 * Custom hook para acceder a la sesión, datos de empresa activa y permisos RBAC.
 */
export const useAuth = () => {
  const { user, token, activeCompany, isAuthenticated, setSession, setActiveCompany, logout } =
    useAuthStore();

  const role = user?.role ? normalizeRoleCode(user.role) : undefined;
  const isAdmin = role === 'ADMIN';
  return {
    user,
    token,
    accessToken: token,
    activeCompany,
    isAuthenticated,
    role,
    isAdmin,
    setSession,
    setActiveCompany,
    logout,
  };
};

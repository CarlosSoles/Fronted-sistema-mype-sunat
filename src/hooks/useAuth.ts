import { useAuthStore } from '@/stores/authStore';

/**
 * Custom hook para acceder a la sesión y permisos RBAC de manera simplificada.
 */
export const useAuth = () => {
  const { user, token, activeCompany, isAuthenticated, setSession, setActiveCompany, logout } =
    useAuthStore();

  const isAdmin = user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT' || isAdmin;
  const isOperator = user?.role === 'OPERATOR' || isAccountant;

  const hasRole = (role: 'ADMIN' | 'ACCOUNTANT' | 'OPERATOR'): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'ACCOUNTANT' && (role === 'ACCOUNTANT' || role === 'OPERATOR')) return true;
    return user.role === role;
  };

  return {
    user,
    token,
    activeCompany,
    isAuthenticated,
    isAdmin,
    isAccountant,
    isOperator,
    hasRole,
    setSession,
    setActiveCompany,
    logout,
  };
};

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { useAuthStore } from '@/stores/authStore';
import { type LoginCredentials } from '../types/auth.types';
import { getDefaultRouteForRole } from '@/routes/roleNavigation';

export const useLogin = () => {
  const navigate = useNavigate();
  const { setSession, setActiveCompany } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      const token = data.accessToken || data.token || '';
      setSession(token, data.user);
      if (data.companies && data.companies.length > 0) {
        setActiveCompany(data.companies[0]);
      }
      const defaultPath = getDefaultRouteForRole(data.user?.role);
      navigate(defaultPath);
    },
    onError: (error) => {
      console.error('Error al iniciar sesión:', error);
    },
  });
};

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { useAuthStore } from '@/stores/authStore';
import { type LoginCredentials } from '../types/auth.types';

export const useLogin = () => {
  const navigate = useNavigate();
  const { setSession, setActiveCompany } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setSession(data.token, data.user);
      if (data.companies && data.companies.length > 0) {
        setActiveCompany(data.companies[0]);
      }
      navigate('/invoices');
    },
    onError: (error) => {
      console.error('Error al iniciar sesión:', error);
    },
  });
};

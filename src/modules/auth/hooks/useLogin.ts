import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { cargarEmpresaActiva } from '../lib/empresaActiva';
import { useAuthStore } from '@/stores/authStore';
import { type LoginCredentials } from '../types/auth.types';
import { getDefaultRouteForRole } from '@/routes/roleNavigation';

export const useLogin = () => {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: async (data) => {
      const token = data.accessToken || data.token || '';
      setSession(token, data.user);

      // El login NO devuelve `companies`, así que la empresa se pide aparte.
      // Antes esta línea era `if (data.companies?.length) setActiveCompany(...)`
      // y la condición nunca se cumplía: la sesión quedaba sin empresa y con
      // ella vacíos el RUC del QR, el emisor del XML y las series de la pantalla
      // de Configuración. Se espera (await) para que la empresa esté cargada
      // antes de navegar y la primera pantalla ya salga completa.
      await cargarEmpresaActiva(true);

      const defaultPath = getDefaultRouteForRole(data.user?.role);
      navigate(defaultPath);
    },
    onError: (error) => {
      console.error('Error al iniciar sesión:', error);
    },
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { cargarEmpresaActiva } from '../lib/empresaActiva';
import { useAuthStore } from '@/stores/authStore';
import { type LoginCredentials } from '../types/auth.types';

/**
 * A dónde volver después de iniciar sesión.
 *
 * `ProtectedRoute` envía a /login con `state.from` para no perder la página que
 * el usuario intentaba abrir, pero hasta ahora nadie lo leía: siempre se
 * aterrizaba en el inicio. Solo se acepta una ruta interna para no permitir
 * redirecciones a otro dominio.
 */
export const destinoSeguro = (from: unknown): string => {
  const pathname = (from as { pathname?: unknown } | null)?.pathname;
  return typeof pathname === 'string' && pathname.startsWith('/') && !pathname.startsWith('//')
    ? pathname
    : '/';
};

export const useLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient=useQueryClient();
  const { setSession, setActiveCompany } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    // Un login fallido no debe reintentarse automáticamente: cada reintento
    // cuenta para el rate limit del servidor (429).
    retry: false,
    onSuccess: async (data) => {
      const token = data.accessToken || data.token || '';
      setSession(token, data.user);
      if (data.companies && data.companies.length > 0) {
        setActiveCompany(data.companies[0]);
      } else if (data.user.companyId) {
        setActiveCompany({
          tenantId: data.user.companyId,
          ruc: data.user.companyRuc || '',
          razonSocial: data.user.companyLegalName || data.user.fullName || 'Empresa',
        });
      }

      // Si ni `companies` ni el usuario traen empresa, se pide a /auth/profile.
      // Antes esto era la única vía y la condición `data.companies?.length`
      // nunca se cumplía, así que la sesión quedaba sin empresa y con ella
      // vacíos el RUC del QR, el emisor del XML y las series.
      if (!data.user.companyId) {
        await cargarEmpresaActiva(true);
      }
      queryClient.removeQueries({queryKey:['permissions-me']});
      // Vuelve a la página que el usuario intentaba abrir antes del login.
      navigate(destinoSeguro((location.state as { from?: unknown } | null)?.from), { replace: true });
    },
    onError: (error) => {
      console.error('Error al iniciar sesión:', error);
    },
  });
};

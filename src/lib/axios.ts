import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ENV } from '@/config/env.config';

/**
 * Instancia centralizada de Axios para la comunicación con la API del Backend.
 * Implementa interceptores para adjuntar automáticamente el JWT y el Tenant ID.
 */
export const apiClient = axios.create({
  baseURL: ENV.VITE_API_URL,
  timeout: 15000, // 15 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor de Petición (Request Interceptor)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Intentar leer token JWT de localStorage
    const authStorage = localStorage.getItem('sync-sunat-auth');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token;
        const tenantId = parsed?.state?.activeCompany?.tenantId;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (tenantId) {
          config.headers['X-Tenant-Id'] = tenantId;
        }
      } catch {
        // En caso de error de parseo, se ignora silenciosamente
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Interceptor de Respuesta (Response Interceptor)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Si el backend responde 401 Unauthorized, limpiar sesión
    if (error.response?.status === 401) {
      console.warn('⚠️ [AUTH] Sesión expirada o no autorizada. Redirigiendo a Login...');
      localStorage.removeItem('sync-sunat-auth');
      // Si no estamos en la página de login, redirigir
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

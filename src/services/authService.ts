/**
 * Re-exportación de servicios de autenticación (Fase 6)
 */
import { authApi } from '@/modules/auth/services/authApi';

export const authService = authApi;
export { authApi };
export default authService;

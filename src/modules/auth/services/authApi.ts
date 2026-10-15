import { apiClient } from '@/lib/axios';
import { type AuthResponse, type CompanyTenant, type LoginCredentials } from '../types/auth.types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  getCompanies: async (): Promise<CompanyTenant[]> => {
    const response = await apiClient.get<CompanyTenant[]>('/auth/companies');
    return response.data;
  },
};

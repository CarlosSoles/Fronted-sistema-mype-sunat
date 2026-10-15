import { apiClient } from '@/lib/axios';
import {
  type DuaCalculationResult,
  type DuaInput,
  type KardexMovement,
} from '../types/customs.types';

export const customsApi = {
  calculateDua: async (input: DuaInput): Promise<DuaCalculationResult> => {
    const response = await apiClient.post<DuaCalculationResult>('/customs/calculate', input);
    return response.data;
  },

  registerDua: async (input: DuaInput): Promise<{ id: string; success: boolean }> => {
    const response = await apiClient.post<{ id: string; success: boolean }>('/customs/register', input);
    return response.data;
  },

  getKardexMovements: async (codigoProducto?: string): Promise<KardexMovement[]> => {
    const response = await apiClient.get<KardexMovement[]>('/customs/kardex', {
      params: { codigoProducto },
    });
    return response.data;
  },
};

import { apiClient } from '@/lib/axios';
import {
  type KardexFilterParams,
  type KardexMovementEntry,
} from '../types';

export const kardexApi = {
  /**
   * Obtiene los movimientos valorizados de inventario permanente (Formatos PLE 12.1 y 13.1).
   */
  getKardexMovements: async (
    params?: KardexFilterParams
  ): Promise<KardexMovementEntry[]> => {
    try {
      const response = await apiClient.get<KardexMovementEntry[]>('/customs/kardex', {
        params,
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

};

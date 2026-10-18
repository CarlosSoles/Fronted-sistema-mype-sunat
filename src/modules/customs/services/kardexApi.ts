import { apiClient } from '@/lib/axios';
import {
  type KardexFilterParams,
  type KardexMovementEntry,
  type SireAnnex8_4Record,
} from '../types';

export const kardexApi = {
  /**
   * Obtiene los movimientos valorizados de inventario permanente (Formatos PLE 12.1 y 13.1).
   */
  getKardexMovements: async (
    params?: KardexFilterParams
  ): Promise<KardexMovementEntry[]> => {
    const response = await apiClient.get<KardexMovementEntry[]>('/customs/kardex', {
      params,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Obtiene los datos consolidados de importaciones para el Anexo 8.4 del SIRE RCE.
   */
  getSireAnnex8_4: async (period?: string): Promise<SireAnnex8_4Record[]> => {
    const response = await apiClient.get<SireAnnex8_4Record[]>('/customs/reports/sire-8-4', {
      params: { period },
    });
    return Array.isArray(response.data) ? response.data : [];
  },
};

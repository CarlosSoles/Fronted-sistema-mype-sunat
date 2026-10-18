import { apiClient } from '@/lib/axios';
import {
  type AddLocalExpensePayload,
  type ApplyKardexPayload,
  type CalculateLandedCostPayload,
  type LandedCostSheetRecord,
  type LocalExpenseInvoiceRecord,
} from '../types';

export const landedCostApi = {
  /**
   * Registra una factura local de desaduanaje aislando el crédito fiscal de IGV (NIC 2).
   */
  addLocalExpense: async (
    payload: AddLocalExpensePayload
  ): Promise<LocalExpenseInvoiceRecord> => {
    const response = await apiClient.post<LocalExpenseInvoiceRecord>(
      '/customs/landed-cost/expenses',
      payload
    );
    return response.data;
  },

  /**
   * Obtiene la lista de facturas locales de desaduanaje cargadas a un expediente.
   */
  getLocalExpenses: async (shipmentId: string): Promise<LocalExpenseInvoiceRecord[]> => {
    const response = await apiClient.get<LocalExpenseInvoiceRecord[]>(
      `/customs/landed-cost/expenses/${shipmentId}`
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Ejecuta el motor de prorrateo bivariado NIC 2 y emite la Hoja de Costeo.
   */
  calculateLandedCost: async (
    payload: CalculateLandedCostPayload
  ): Promise<LandedCostSheetRecord> => {
    const response = await apiClient.post<LandedCostSheetRecord>(
      '/customs/landed-cost/calculate',
      payload
    );
    return response.data;
  },

  /**
   * Asienta formalmente la entrada valorizada al inventario permanente (Tipo 50 DUA)
   * y transiciona el expediente al estado CERRADO.
   */
  applyKardex: async (
    payload: ApplyKardexPayload
  ): Promise<{ message: string; movements_count: number }> => {
    const response = await apiClient.post<{ message: string; movements_count: number }>(
      '/customs/landed-cost/apply-kardex',
      payload
    );
    return response.data;
  },

  /**
   * Consulta la hoja de costos oficial calculada para un expediente.
   */
  getLandedCostSheet: async (shipmentId: string): Promise<LandedCostSheetRecord | null> => {
    const response = await apiClient.get<LandedCostSheetRecord>(
      `/customs/landed-cost/sheet/${shipmentId}`
    );
    return response.data || null;
  },
};

import { apiClient } from '@/lib/axios';
import {
  type AddLocalExpensePayload,
  type AdjustLateImportCostPayload,
  type ApplyKardexPayload,
  type ApproveLandedCostPayload,
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
   * Aprueba formalmente la Hoja de Liquidación de Costos por parte del contador,
   * emitiendo el evento asíncrono para valorización en el módulo de Inventario.
   */
  approveLandedCost: async (
    payload: ApproveLandedCostPayload
  ): Promise<any> => {
    const response = await apiClient.post(
      '/customs/landed-cost/approve',
      payload
    );
    return response.data;
  },

  /**
   * Registra un gasto extemporáneo posterior al levante (demurrage, sobreestadía).
   */
  adjustLateCost: async (
    payload: AdjustLateImportCostPayload
  ): Promise<any> => {
    const response = await apiClient.post(
      '/customs/landed-cost/late-cost',
      payload
    );
    return response.data;
  },

  /**
   * @deprecated Usar approveLandedCost en el nuevo flujo desacoplado.
   * Asienta formalmente la entrada valorizada al inventario permanente.
   */
  applyKardex: async (
    payload: ApplyKardexPayload
  ): Promise<{ message: string; movements_count: number }> => {
    const response = await apiClient.post<{ message: string; movements_count: number }>(
      '/customs/landed-cost/approve',
      { shipmentId: payload.shipment_id }
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

  /**
   * Obtiene la lista de expedientes de importación elegibles para costeo Landed Cost.
   */
  getEligibleShipments: async (): Promise<Array<{
    id: string;
    shipment_number: string;
    incoterm: string;
    status: string;
    currency_code: string;
    supplier?: { business_name: string; country_code: string };
    declarations?: Array<{ id: string; dua_number: string; channel: string; status: string }>;
  }>> => {
    const response = await apiClient.get('/customs/landed-cost/eligible-shipments');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Obtiene las facturas de compras locales registradas en el ERP elegibles para gastos de desaduanaje.
   */
  getEligibleInvoices: async (): Promise<Array<{
    id: string;
    supplier_doc_number: string;
    supplier_name: string;
    document_serial: string;
    document_number: string;
    issue_date: string;
    net_amount: number | string;
    igv_amount: number | string;
    total_amount: number | string;
  }>> => {
    const response = await apiClient.get('/customs/landed-cost/eligible-invoices');
    return Array.isArray(response.data) ? response.data : [];
  },
};

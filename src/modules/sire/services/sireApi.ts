import { apiClient } from '@/lib/axios';
import axios from 'axios';
import {
  type SireReconciliationRequest,
  type SireReconciliationResult,
} from '../types/sire.types';

const createMockResult = (
  request: SireReconciliationRequest,
): SireReconciliationResult => ({
  source: 'mock',
  summary: {
    totalPropuestaSunat: 1180,
    totalRegistroLocal: 1160,
    comprobantesConciliados: 1,
    comprobantesConDiscrepancia: 1,
    diferenciaNeta: 20,
  },
  vouchers: [
    {
      id: `${request.period}-001`,
      periodo: request.period,
      tipoComprobante: '01',
      serie: request.bookType === 'RVIE_VENTAS' ? 'F001' : 'FC01',
      numero: '000001',
      emisorRuc: '20123456789',
      emisorRazonSocial: 'Comercial MYPE S.A.C.',
      fechaEmision: `${request.period.slice(0, 4)}-${request.period.slice(4)}-05`,
      montoSunat: 1180,
      montoLocal: 1180,
      matchStatus: 'CONCILIADO',
    },
    {
      id: `${request.period}-002`,
      periodo: request.period,
      tipoComprobante: '03',
      serie: request.bookType === 'RVIE_VENTAS' ? 'B001' : 'BC01',
      numero: '000024',
      emisorRuc: '20987654321',
      emisorRazonSocial: 'Distribuidora del Perú S.R.L.',
      fechaEmision: `${request.period.slice(0, 4)}-${request.period.slice(4)}-12`,
      montoSunat: 500,
      montoLocal: 480,
      diferencia: 20,
      matchStatus: 'DISCREPANCIA',
      motivoDiscrepancia: 'Diferencia en el total registrado localmente.',
    },
  ],
});

export const sireApi = {
  reconcile: async (
    request: SireReconciliationRequest,
  ): Promise<SireReconciliationResult> => {
    try {
      const response = await apiClient.post<
        Omit<SireReconciliationResult, 'source'>
      >('/sire/reconcile', request);
      return { ...response.data, source: 'api' };
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        console.warn('[SIRE] Backend unavailable; using clearly marked mock data.');
        return createMockResult(request);
      }
      throw error;
    }
  },

  acceptProposal: async (periodo: string): Promise<{ success: boolean; ticket: string }> => {
    const response = await apiClient.post<{ success: boolean; ticket: string }>(
      '/sire/accept-proposal',
      { periodo }
    );
    return response.data;
  },
};

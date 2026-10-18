import { apiClient } from '@/lib/axios';
import {
  type CustomsDeclarationRecord,
  type CustomsSettlementRecord,
  type PaySettlementPayload,
  type RegisterDuaWizardPayload,
} from '../types';

export const customsDeclarationsApi = {
  /**
   * Registra y numera la DAM oficial mediante el Asistente Wizard en 4 Pasos.
   */
  registerDuaWizard: async (
    payload: RegisterDuaWizardPayload
  ): Promise<CustomsDeclarationRecord> => {
    const response = await apiClient.post<CustomsDeclarationRecord>(
      '/customs/declarations/wizard',
      payload
    );
    return response.data;
  },

  /**
   * Consulta las declaraciones aduaneras registradas de la empresa activa.
   */
  getDeclarations: async (): Promise<CustomsDeclarationRecord[]> => {
    const response = await apiClient.get<CustomsDeclarationRecord[]>('/customs/declarations');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Consulta el detalle completo de una DAM con sus series y liquidaciones con CDA.
   */
  getDeclarationById: async (id: string): Promise<CustomsDeclarationRecord> => {
    const response = await apiClient.get<CustomsDeclarationRecord>(`/customs/declarations/${id}`);
    return response.data;
  },

  /**
   * Obtiene la lista de liquidaciones de cobranza tributaria pendientes de pago.
   */
  getPendingSettlements: async (): Promise<CustomsSettlementRecord[]> => {
    const response = await apiClient.get<CustomsSettlementRecord[]>('/customs/settlements/pending');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Obtiene las liquidaciones asociadas a una DAM específica.
   */
  getSettlementsByDeclaration: async (
    declarationId: string
  ): Promise<CustomsSettlementRecord[]> => {
    const response = await apiClient.get<CustomsSettlementRecord[]>(
      `/customs/settlements/declaration/${declarationId}`
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Asienta el pago bancario Teledespacho de una liquidación aduanera.
   */
  paySettlement: async (
    settlementId: string,
    payload: PaySettlementPayload
  ): Promise<{ message: string; levante_granted: boolean }> => {
    const response = await apiClient.post<{ message: string; levante_granted: boolean }>(
      `/customs/settlements/${settlementId}/pay`,
      payload
    );
    return response.data;
  },

  /**
   * Simulación matemática pura de tributos sin persistencia en base de datos.
   */
  simulateTaxes: async (payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await apiClient.post<Record<string, unknown>>('/customs/calculate', payload);
    return response.data;
  },
};

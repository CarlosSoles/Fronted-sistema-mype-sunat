import { apiClient } from '@/lib/axios';
import {
  type AddDocumentPayload,
  type AddEventPayload,
  type CreateShipmentPayload,
  type CustomsDocumentRecord,
  type CustomsEventRecord,
  type CustomsShipmentDetail,
  type CustomsShipmentSummary,
  type ShipmentFilters,
} from '../types';

export const customsShipmentsApi = {
  /**
   * Obtiene la lista de expedientes de importación con filtros y paginación.
   */
  getShipments: async (filters?: ShipmentFilters): Promise<CustomsShipmentSummary[]> => {
    const response = await apiClient.get<any>('/customs/shipments', {
      params: filters,
    });
    if (Array.isArray(response.data)) return response.data;
    if (response.data && Array.isArray(response.data.data)) return response.data.data;
    return [];
  },

  /**
   * Obtiene la vista 360° del expediente de importación y sus relaciones.
   */
  getShipmentById: async (id: string): Promise<CustomsShipmentDetail> => {
    const response = await apiClient.get<CustomsShipmentDetail>(`/customs/shipments/${id}`);
    return response.data;
  },

  /**
   * Apertura un nuevo expediente comercial de importación.
   */
  createShipment: async (payload: CreateShipmentPayload): Promise<CustomsShipmentSummary> => {
    const response = await apiClient.post<CustomsShipmentSummary>('/customs/shipments', payload);
    return response.data;
  },

  /**
   * Adjunta un comprobante aduanero o documento resolutivo VUCE al expediente.
   */
  addDocument: async (
    shipmentId: string,
    payload: AddDocumentPayload
  ): Promise<CustomsDocumentRecord> => {
    const response = await apiClient.post<CustomsDocumentRecord>(
      `/customs/shipments/${shipmentId}/documents`,
      payload
    );
    return response.data;
  },

  /**
   * Asienta un hito aduanero oficial en la bitácora de auditoría del embarque.
   */
  addEvent: async (
    shipmentId: string,
    payload: AddEventPayload
  ): Promise<CustomsEventRecord> => {
    const response = await apiClient.post<CustomsEventRecord>(
      `/customs/shipments/${shipmentId}/events`,
      payload
    );
    return response.data;
  },
};

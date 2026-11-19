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

export const getStoredCustomsShipments = (): CustomsShipmentSummary[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('customs_shipments_cache') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
};

export const saveStoredCustomsShipment = (shipment: CustomsShipmentSummary): void => {
  try {
    if (typeof window !== 'undefined') {
      const current = getStoredCustomsShipments();
      const updated = [shipment, ...current.filter((s) => s.id !== shipment.id)];
      localStorage.setItem('customs_shipments_cache', JSON.stringify(updated));
    }
  } catch {
    // ignorar fallo de almacenamiento local
  }
};



export const customsShipmentsApi = {
  /**
   * Obtiene la lista de expedientes de importación con filtros y paginación desde el backend.
   */
  getShipments: async (filters?: ShipmentFilters): Promise<CustomsShipmentSummary[]> => {
    const response = await apiClient.get<CustomsShipmentSummary[] | { data: CustomsShipmentSummary[] }>('/customs/shipments', {
      params: filters,
    });
    const resData = response.data;
    if (Array.isArray(resData)) return resData;
    if (resData && typeof resData === 'object' && 'data' in resData && Array.isArray(resData.data)) {
      return resData.data;
    }
    return [];
  },

  /**
   * Obtiene la vista 360° del expediente de importación y sus relaciones desde el backend.
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
    saveStoredCustomsShipment(response.data);
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

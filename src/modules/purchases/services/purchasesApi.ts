import { apiClient } from '@/lib/axios';
import type {
  CreatePurchasePayload,
  PayPurchasePayload,
  PurchasePaymentRecord,
  PurchaseRecord,
} from '../types/purchases.types';

export const purchasesApi = {
  createPurchase: async (payload: CreatePurchasePayload): Promise<PurchaseRecord> => {
    try {
      const response = await apiClient.post<PurchaseRecord>('/purchases', payload);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        const fallback = await apiClient.post<PurchaseRecord>('/inventory/purchases', payload);
        return fallback.data;
      }
      throw error;
    }
  },

  listPurchases: async (): Promise<{ total: number; items: PurchaseRecord[] }> => {
    try {
      const response = await apiClient.get<{ total: number; items: PurchaseRecord[] }>('/purchases');
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        const fallback = await apiClient.get<{ total: number; items: any[] }>('/inventory/purchases');
        return {
          total: fallback.data.total,
          items: fallback.data.items.map((item: any) => ({
            ...item,
            paidAmount: Number(item.paidAmount ?? 0),
            pendingAmount: Math.max(0, Number(item.totalAmount) - Number(item.paidAmount ?? 0)),
          })),
        };
      }
      throw error;
    }
  },

  getPurchaseById: async (id: string): Promise<PurchaseRecord> => {
    try {
      const response = await apiClient.get<PurchaseRecord>(`/purchases/${id}`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        const fallback = await apiClient.get<any>(`/inventory/purchases/${id}`);
        return {
          ...fallback.data,
          paidAmount: Number(fallback.data.paidAmount ?? 0),
          pendingAmount: Math.max(0, Number(fallback.data.totalAmount) - Number(fallback.data.paidAmount ?? 0)),
        };
      }
      throw error;
    }
  },

  listPayments: async (id: string): Promise<PurchasePaymentRecord[]> => {
    try {
      const response = await apiClient.get<PurchasePaymentRecord[]>(`/purchases/${id}/payments`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        const fallback = await apiClient.get<PurchasePaymentRecord[]>(`/inventory/purchases/${id}/payments`);
        return fallback.data;
      }
      throw error;
    }
  },

  receivePurchase: async (id: string, payload: { items?: { itemId: string; quantity: number }[]; receivedAt?: string }): Promise<PurchaseRecord> => {
    const { data } = await apiClient.post<PurchaseRecord>(`/purchases/${id}/receive`, payload);
    return data;
  },

  /** Reintenta el asiento de una compra que quedó sin contabilizar. */
  postAccounting: async (
    id: string,
  ): Promise<{ compra: string; asientoGenerado: boolean; motivo?: string; yaExistia: boolean }> => {
    const { data } = await apiClient.post(`/purchases/${id}/post-accounting`);
    return data;
  },

  payPurchase: async (
    id: string,
    payload: PayPurchasePayload,
  ): Promise<{ id: string; status: string; amount: number; paymentMethod: string; balance?: number }> => {
    try {
      const response = await apiClient.post(`/purchases/${id}/pay`, payload);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        const fallback = await apiClient.post(`/inventory/purchases/${id}/pay`, payload);
        return fallback.data;
      }
      throw error;
    }
  },
};


import { apiClient } from '@/lib/axios';
import {
  type CreateInvoicePayload,
  type Invoice,
  type PaginaComprobantes,
} from '../types/invoice.types';

export const invoicesApi = {
  getInvoices: async (page = 1): Promise<PaginaComprobantes> => {
    const response = await apiClient.get<PaginaComprobantes>('/invoices', {
      params: { page },
    });
    return response.data;
  },

  getInvoiceById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (
    payload: CreateInvoicePayload,
  ): Promise<{ id: string; estado: string; message?: string }> => {
    const response = await apiClient.post<{
      id: string;
      estado: string;
      message?: string;
    }>('/invoices', payload);
    return response.data;
  },

  retryCdr: async (
    id: string,
  ): Promise<{ id: string; estado: string; encolado: boolean; mensaje: string }> => {
    const response = await apiClient.post<{
      id: string;
      estado: string;
      encolado: boolean;
      mensaje: string;
    }>(`/invoices/${id}/retry-cdr`);
    return response.data;
  },
};

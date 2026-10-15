import { apiClient } from '@/lib/axios';
import { type CreateInvoiceDto, type Invoice } from '../types/invoice.types';

export const invoicesApi = {
  getInvoices: async (page = 1): Promise<{ data: Invoice[]; total: number }> => {
    const response = await apiClient.get<{ data: Invoice[]; total: number }>('/invoices', {
      params: { page },
    });
    return response.data;
  },

  getInvoiceById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (dto: CreateInvoiceDto): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>('/invoices', dto);
    return response.data;
  },

  retryCdr: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/retry-cdr`);
    return response.data;
  },
};

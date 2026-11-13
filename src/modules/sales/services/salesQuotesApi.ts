import { apiClient } from '@/lib/axios';

export type QuoteStatus = 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'CONVERTIDA' | 'ANULADA';
export interface QuoteItem { id?: string; sku?: string | null; description: string; unitCode?: string; quantity: number; unitPrice: number; subtotal?: number; igvAmount?: number; totalAmount?: number }
export interface SalesQuote { id: string; quoteNumber: string; customerDocType: string; customerDocNumber?: string | null; customerName: string; issueDate: string; validUntil?: string | null; subtotal: number; igvAmount: number; totalAmount: number; status: QuoteStatus; notes?: string | null; items: QuoteItem[] }

export const salesQuotesApi = {
  list: async (): Promise<SalesQuote[]> => (await apiClient.get<SalesQuote[]>('/sales/quotes')).data,
  get: async (id: string): Promise<SalesQuote> => (await apiClient.get<SalesQuote>(`/sales/quotes/${id}`)).data,
  create: async (payload: { customerDocType?: string; customerDocNumber?: string; customerName: string; validUntil?: string; notes?: string; items: Array<{ sku?: string; description: string; unitCode?: string; quantity: number; unitPrice: number }> }): Promise<SalesQuote> => (await apiClient.post<SalesQuote>('/sales/quotes', payload)).data,
  status: async (id: string, status: QuoteStatus): Promise<SalesQuote> => (await apiClient.patch<SalesQuote>(`/sales/quotes/${id}/status`, { status })).data,
};

import { apiClient } from '@/lib/axios';
export interface CollectionRecord { id: string; collection_date: string; customer_name: string; customer_doc?: string | null; invoice_number?: string | null; description: string; amount: string | number; payment_method: string; bank_name?: string | null; status: string; }
export const collectionsApi = {
  list: async (): Promise<CollectionRecord[]> => (await apiClient.get('/collections')).data,
  create: async (payload: { customerName: string; customerDoc?: string; invoiceNumber?: string; description?: string; collectionDate?: string; paymentMethod?: string; bankName?: string; amount: number }) => (await apiClient.post('/collections', payload)).data,
};

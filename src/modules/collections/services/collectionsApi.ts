import { apiClient } from '@/lib/axios';
export interface CollectionRecord { id: string; collection_date: string; customer_name: string; customer_doc?: string | null; invoice_number?: string | null; description: string; amount: string | number; payment_method: string; bank_name?: string | null; status: string; }
export interface ReceivableRecord { id: string; numero: string; customerName: string; customerDoc: string; total: number; credited: number; paid: number; balance: number; date: string; }
export interface CustomerStatement { customerDoc: string; totals: { total: number; credited: number; paid: number; balance: number }; aging: { d0_30: number; d31_60: number; d61_90: number; d90_plus: number }; invoices: Array<{ id: string; numero: string; date: string; total: number; credited: number; paid: number; balance: number }>; collections: Array<{ id: string; date: string; invoiceNumber: string | null; amount: number; paymentMethod: string }>; }
export interface PortfolioAging { total: number; invoiceCount: number; overdue: { count: number; total: number }; aging: { d0_30: number; d31_60: number; d61_90: number; d90_plus: number }; debtors: Array<{ doc: string; name: string; balance: number }>; }
export interface InvoiceCollections { invoice: { id: string; numero: string; customerName: string; total: number; date: string }; collections: Array<{ id: string; date: string; amount: number; paymentMethod: string; bankName?: string | null; status: string }>; paid: number; }
export interface Reconciliation { receivable: number; accounting: number; difference: number; reconciled: boolean; invoiceCount: number; }
export const collectionsApi = {
  reconciliation: async (): Promise<Reconciliation> => (await apiClient.get('/collections/reconciliation')).data,
  invoiceCollections: async (id: string): Promise<InvoiceCollections> => (await apiClient.get(`/collections/invoice/${id}`)).data,
  portfolio: async (): Promise<PortfolioAging> => (await apiClient.get('/collections/portfolio')).data,
  statement: async (doc: string): Promise<CustomerStatement> => (await apiClient.get('/collections/statement', { params: { doc } })).data,
  receivables: async (): Promise<ReceivableRecord[]> => (await apiClient.get('/collections/receivables')).data,
  list: async (): Promise<CollectionRecord[]> => (await apiClient.get('/collections')).data,
  annul: async (id: string) => (await apiClient.post(`/collections/${id}/annul`)).data,
  create: async (payload: { customerName: string; customerDoc?: string; invoiceNumber?: string; description?: string; collectionDate?: string; paymentMethod?: string; bankName?: string; amount: number }) => (await apiClient.post('/collections', payload)).data,
};

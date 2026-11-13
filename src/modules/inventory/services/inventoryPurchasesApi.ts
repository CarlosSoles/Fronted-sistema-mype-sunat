import { apiClient } from '@/lib/axios';

export interface NationalPurchaseItemPayload {
  sku: string;
  quantity: number;
  unitCost: number;
  description?: string;
}

export interface CreateNationalPurchasePayload {
  supplierDocNumber: string;
  supplierName: string;
  supplierId?: string;
  documentTypeCode: string;
  documentSerial: string;
  documentNumber: string;
  issueDate: string;
  warehouseCode?: string;
  currencyCode?: string;
  responsible?: string;
  notes?: string;
  items: NationalPurchaseItemPayload[];
}

export interface NationalPurchaseRecord {
  id: string;
  purchaseNumber: string;
  supplierDocNumber: string;
  supplierName: string;
  documentTypeCode: string;
  documentSerial: string;
  documentNumber: string;
  issueDate: string;
  warehouseCode: string;
  netAmount: number;
  igvAmount: number;
  totalAmount: number;
  status: string;
  paidAmount?: number;
  balance?: number;
  notes?: string | null;
  responsible?: string | null;
  itemsCount: number;
  items: Array<{
    id: string;
    sku: string;
    description: string;
    quantity: number;
    unitCost: number;
    subtotal: number;
    igvAmount: number;
    totalAmount: number;
  }>;
}

export const inventoryPurchasesApi = {
  createPurchase: async (payload: CreateNationalPurchasePayload): Promise<NationalPurchaseRecord> => {
    const response = await apiClient.post<NationalPurchaseRecord>('/inventory/purchases', payload);
    return response.data;
  },

  createManualPayable: async (payload: { supplierName: string; supplierDocNumber: string; description: string; amount: number; issueDate?: string; currencyCode?: string; exchangeRate?: number }): Promise<{ id: string }> => {
    const { data } = await apiClient.post('/purchases/payables', payload);
    return data;
  },

  supplierStatement: async (doc: string): Promise<{ supplierDoc: string; purchases: Array<{ id: string; number: string; document: string; date: string; total: number; paid: number; balance: number; status: string }>; payments: Array<{ id: string; date: string; amount: number; method: string; reference: string; concept: string }>; totals: { total: number; paid: number; balance: number } }> => {
    const { data } = await apiClient.get(`/purchases/suppliers/${encodeURIComponent(doc)}/statement`);
    return data;
  },

  listPayables: async (): Promise<Array<{ supplierDocNumber: string; supplierName: string; total: number; paid: number; balance: number; count: number; overdue: number; oldestDays: number; aging: { d0_30: number; d31_60: number; d61_90: number; d90_plus: number } }>> => {
    const response = await apiClient.get('/purchases/payables');
    return response.data;
  },

  listPurchases: async (): Promise<{ total: number; items: NationalPurchaseRecord[] }> => {
    const response = await apiClient.get<{ total: number; items: NationalPurchaseRecord[] }>('/inventory/purchases');
    return response.data;
  },

  getPurchaseById: async (id: string): Promise<NationalPurchaseRecord> => {
    const response = await apiClient.get<NationalPurchaseRecord>(`/inventory/purchases/${id}`);
    return response.data;
  },

  listPayments: async (id: string): Promise<Array<{ id: string; date: string; amount: number; paymentMethod: string; bankName?: string | null; concept: string }>> => {
    const response = await apiClient.get(`/inventory/purchases/${id}/payments`);
    return response.data;
  },

  payPurchase: async (
    id: string,
    payload: { amount?: number; paymentDate?: string; paymentMethod?: string; bankName?: string },
  ): Promise<{ id: string; status: string; amount: number; paymentMethod: string }> => {
    const response = await apiClient.post(`/inventory/purchases/${id}/pay`, payload);
    return response.data;
  },
};


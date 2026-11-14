import { apiClient } from '@/lib/axios';

export interface ExpenseRecord {
  id: string; expense_date: string; supplier_name: string; supplier_doc?: string | null;
  document_type: string; document_number?: string | null; description: string;
  base_amount: string | number; igv_amount: string | number; total_amount: string | number;
  paid_amount?: string | number; status: string;
}

export interface DistributionInputPayload {
  accountCode: string;
  amount?: number;
  percentage?: number;
}

export const expensesApi = {
  list: async (): Promise<ExpenseRecord[]> => (await apiClient.get<ExpenseRecord[]>('/expenses')).data,
  listPayments: async (id: string): Promise<Array<{ id: string; date: string; amount: number; paymentMethod: string; bankName?: string | null; concept: string }>> =>
    (await apiClient.get(`/expenses/${id}/payments`)).data,
  annul: async (id: string): Promise<{ status: string }> =>
    (await apiClient.post(`/expenses/${id}/annul`)).data,
  pay: async (id: string, amount?: number, treasuryAccountId?: string): Promise<{ status: string; paidAmount: number; balance: number }> =>
    (await apiClient.post(`/expenses/${id}/pay`, { amount, treasuryAccountId })).data,
  distributions: async (id: string): Promise<Array<{ accountCode: string; amount: number; percentage: number }>> =>
    (await apiClient.get<Array<{ accountCode: string; amount: number; percentage: number }>>(`/expenses/${id}/distributions`)).data,
  setDistributions: async (id: string, items: DistributionInputPayload[]) =>
    (await apiClient.put(`/expenses/${id}/distributions`, { items })).data,
  post: async (id: string) => (await apiClient.post(`/expenses/${id}/post`)).data,
  create: async (payload: {
    description: string;
    supplierName: string;
    supplierDoc?: string;
    documentType?: string;
    documentNumber?: string;
    expenseDate?: string;
    baseAmount: number;
    igvAmount: number;
    totalAmount: number;
    distributions?: DistributionInputPayload[];
  }) => (await apiClient.post('/expenses', payload)).data,
};

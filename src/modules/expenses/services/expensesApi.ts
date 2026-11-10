import { apiClient } from '@/lib/axios';

export interface ExpenseRecord {
  id: string; expense_date: string; supplier_name: string; supplier_doc?: string | null;
  document_type: string; document_number?: string | null; description: string;
  base_amount: string | number; igv_amount: string | number; total_amount: string | number; status: string;
}

export const expensesApi = {
  list: async (): Promise<ExpenseRecord[]> => (await apiClient.get<ExpenseRecord[]>('/expenses')).data,
  create: async (payload: { description: string; supplierName: string; supplierDoc?: string; documentType?: string; documentNumber?: string; expenseDate?: string; baseAmount: number; igvAmount: number; totalAmount: number }) =>
    (await apiClient.post('/expenses', payload)).data,
};

import { apiClient } from '@/lib/axios';
export interface CashSummary { date: string; salesTotal: number; collectionsTotal: number; cashCollections: number; cashExpenses: number; expectedCash: number; collectionsByMethod: Array<{ method: string; amount: number }>; expensesByMethod: Array<{ method: string; amount: number }> }
export interface CashClosure { id: string; date: string; salesTotal: number; collectionsTotal: number; cashCollections: number; cashExpenses: number; expectedCash: number; countedCash: number; difference: number; status: string; notes?: string | null; createdAt: string }
export const cashClosuresApi = {
  summary: async (date: string): Promise<CashSummary> => (await apiClient.get<CashSummary>('/sales/cash-closures/summary', { params: { date } })).data,
  list: async (): Promise<CashClosure[]> => (await apiClient.get<CashClosure[]>('/sales/cash-closures')).data,
  close: async (payload: { date: string; countedCash: number; notes?: string }): Promise<CashClosure> => (await apiClient.post<CashClosure>('/sales/cash-closures', payload)).data,
};

import { apiClient } from '@/lib/axios';
import {
  type AccountingEntry,
  type PleExportConfig,
} from '../types/accounting.types';

export const accountingApi = {
  getEntries: async (periodo?: string): Promise<AccountingEntry[]> => {
    const response = await apiClient.get<AccountingEntry[]>('/accounting/entries', {
      params: { periodo },
    });
    return response.data;
  },

  createEntry: async (entry: Omit<AccountingEntry, 'id' | 'numeroAsiento' | 'estaCuadrado'>): Promise<AccountingEntry> => {
    const response = await apiClient.post<AccountingEntry>('/accounting/entries', entry);
    return response.data;
  },

  exportPleBook: async (config: PleExportConfig): Promise<Blob> => {
    const response = await apiClient.post('/accounting/ple/export', config, {
      responseType: 'blob',
    });
    return response.data;
  },
};

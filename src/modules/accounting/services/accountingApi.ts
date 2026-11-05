import { apiClient } from '@/lib/axios';
import {
  type AccountingAccount,
  type AccountingEntry,
  type AccountingPeriod,
  type CreateAccountingEntryInput,
  type LedgerResponse,
  type TrialBalanceResponse,
  type IncomeStatementResponse,
  type PleExportConfig,
} from '../types/accounting.types';

export const accountingApi = {
  getEntries: async (period?: string): Promise<AccountingEntry[]> => {
    const response = await apiClient.get<AccountingEntry[]>('/accounting/entries', {
      params: { period },
    });
    return response.data;
  },

  createEntry: async (entry: CreateAccountingEntryInput): Promise<AccountingEntry> => {
    const response = await apiClient.post<AccountingEntry>('/accounting/entries', entry);
    return response.data;
  },

  getAccounts: async (): Promise<AccountingAccount[]> => {
    const response = await apiClient.get<AccountingAccount[]>('/accounting/accounts');
    return response.data;
  },

  getPeriods: async (): Promise<AccountingPeriod[]> => {
    const response = await apiClient.get<AccountingPeriod[]>('/accounting/periods');
    return response.data;
  },

  openPeriod: async (year: number, month: number): Promise<AccountingPeriod> => {
    const response = await apiClient.post<AccountingPeriod>('/accounting/periods', { year, month });
    return response.data;
  },

  closePeriod: async (period: string): Promise<AccountingPeriod> => {
    const response = await apiClient.post<AccountingPeriod>(`/accounting/periods/${period}/close`);
    return response.data;
  },

  getLedger: async (period: string, accountCode: string): Promise<LedgerResponse> => {
    const response = await apiClient.get<LedgerResponse>('/accounting/ledger', {
      params: { period, accountCode },
    });
    return response.data;
  },

  getTrialBalance: async (period: string): Promise<TrialBalanceResponse> => {
    const response = await apiClient.get<TrialBalanceResponse>('/accounting/trial-balance', {
      params: { period },
    });
    return response.data;
  },

  getIncomeStatement: async (period: string): Promise<IncomeStatementResponse> => {
    const response = await apiClient.get<IncomeStatementResponse>('/accounting/income-statement', {
      params: { period },
    });
    return response.data;
  },

  exportPleBook: async (config: PleExportConfig): Promise<Blob> => {
    const response = await apiClient.post('/accounting/ple/export', config, {
      responseType: 'blob',
    });
    return response.data;
  },
};

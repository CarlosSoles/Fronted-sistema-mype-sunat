import { apiClient } from '@/lib/axios';
import { cachedGet } from '@/lib/offlineCache';
import {
  type AccountingAccount,
  type AccountingEntry,
  type AccountingPeriod,
  type CreateAccountingEntryInput,
  type LedgerResponse,
  type TrialBalanceResponse,
  type IncomeStatementResponse,
  type BalanceSheetResponse,
  type PleExportConfig,
} from '../types/accounting.types';

export interface TreasuryAccount {
  id: string;
  code: string;
  name: string;
  kind: 'CAJA' | 'BANCO';
  currency: string;
  isActive: boolean;
}

export const accountingApi = {
  getEntries: async (period?: string): Promise<AccountingEntry[]> => {
    return cachedGet(`accounting-entries:${period ?? 'actual'}`, async () => {
      const response = await apiClient.get<AccountingEntry[]>('/accounting/entries', {
        params: { period },
      });
      return response.data;
    });
  },

  createEntry: async (entry: CreateAccountingEntryInput): Promise<AccountingEntry> => {
    const response = await apiClient.post<AccountingEntry>('/accounting/entries', entry);
    return response.data;
  },

  createAccount: async (payload: { code: string; name: string; parentCode?: string }): Promise<AccountingAccount> => {
    const response = await apiClient.post<AccountingAccount>('/accounting/accounts', payload);
    return response.data;
  },

  getRules: async (): Promise<AccountingRule[]> => {
    const response = await apiClient.get<AccountingRule[]>('/accounting/rules');
    return response.data;
  },

  upsertRule: async (payload: AccountingRuleInput): Promise<AccountingRule> => {
    const response = await apiClient.put<AccountingRule>('/accounting/rules', payload);
    return response.data;
  },

  getAccounts: async (): Promise<AccountingAccount[]> => {
    return cachedGet('accounting-accounts', async () => {
      const response = await apiClient.get<AccountingAccount[]>('/accounting/accounts');
      return response.data;
    });
  },

  getPeriods: async (): Promise<AccountingPeriod[]> => {
    return cachedGet('accounting-periods', async () => {
      const response = await apiClient.get<AccountingPeriod[]>('/accounting/periods');
      return response.data;
    });
  },

  openPeriod: async (year: number, month: number): Promise<AccountingPeriod> => {
    const response = await apiClient.post<AccountingPeriod>('/accounting/periods', { year, month });
    return response.data;
  },

  generateClosingEntry: async (year: number): Promise<{ resultado: number; totalIngresos: number; totalGastos: number }> => {
    const response = await apiClient.post(`/accounting/closing-entry/${year}`);
    return response.data;
  },

  openFiscalYear: async (year: number): Promise<AccountingPeriod[]> => {
    const response = await apiClient.post<AccountingPeriod[]>(`/accounting/periods/year/${year}/open`);
    return response.data;
  },

  closeAnnual: async (year: number): Promise<{ closingEntryCreated: boolean; periods: AccountingPeriod[] }> => {
    const { data } = await apiClient.post(`/accounting/periods/year/${year}/close-annual`);
    return data;
  },

  closeFiscalYear: async (year: number): Promise<AccountingPeriod[]> => {
    const response = await apiClient.post<AccountingPeriod[]>(`/accounting/periods/year/${year}/close`);
    return response.data;
  },

  closePeriod: async (period: string): Promise<AccountingPeriod> => {
    const response = await apiClient.post<AccountingPeriod>(`/accounting/periods/${period}/close`);
    return response.data;
  },

  getLedger: async (period: string, accountCode: string): Promise<LedgerResponse> => {
    return cachedGet(`accounting-ledger:${period}:${accountCode}`, async () => {
      const response = await apiClient.get<LedgerResponse>('/accounting/ledger', {
        params: { period, accountCode },
      });
      return response.data;
    });
  },

  getIgvReconciliation: async (period: string) => {
    const { data } = await apiClient.get('/accounting/reconciliation/igv', { params: { period } });
    return data as { period: string; sales: { igv: number }; purchases: { igv: number }; expenses: { igv: number }; expected: number; accounting: number; difference: number; reconciled: boolean };
  },

  getTrialBalance: async (period: string): Promise<TrialBalanceResponse> => {
    return cachedGet(`accounting-trial-balance:${period}`, async () => {
      const response = await apiClient.get<TrialBalanceResponse>('/accounting/trial-balance', {
        params: { period },
      });
      return response.data;
    });
  },

  getIncomeStatement: async (period: string): Promise<IncomeStatementResponse> => {
    return cachedGet(`accounting-income-statement:${period}`, async () => {
      const response = await apiClient.get<IncomeStatementResponse>('/accounting/income-statement', {
        params: { period },
      });
      return response.data;
    });
  },

  getBalanceSheet: async (period: string): Promise<BalanceSheetResponse> => {
    return cachedGet(`accounting-balance-sheet:${period}`, async () => {
      const response = await apiClient.get<BalanceSheetResponse>('/accounting/balance-sheet', {
        params: { period },
      });
      return response.data;
    });
  },

/** Subcuentas de caja/banco configuradas por la empresa. */
  getTreasuryAccounts: async (): Promise<TreasuryAccount[]> => {
    const { data } = await apiClient.get<TreasuryAccount[]>('/accounting/treasury-accounts');
    return data;
  },

  createTreasuryAccount: async (payload: {
    code: string;
    name: string;
    kind?: 'CAJA' | 'BANCO';
  }): Promise<TreasuryAccount> => {
    const { data } = await apiClient.post<TreasuryAccount>('/accounting/treasury-accounts', payload);
    return data;
  },

  updateTreasuryAccount: async (
    id: string,
    payload: { name?: string; kind?: 'CAJA' | 'BANCO'; isActive?: boolean },
  ): Promise<TreasuryAccount> => {
    const { data } = await apiClient.put<TreasuryAccount>(`/accounting/treasury-accounts/${id}`, payload);
    return data;
  },
  exportPleBook: async (config: PleExportConfig): Promise<Blob> => {
    const response = await apiClient.post('/accounting/ple/export', config, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export interface AccountingRule {
  id: string;
  process_code: string;
  document_type: string;
  line_order: number;
  account_code: string;
  side: 'DEBE' | 'HABER';
  base_calculation: string;
  description?: string | null;
  is_active: boolean;
}

export interface AccountingRuleInput {
  processCode: string;
  documentType?: string;
  lineOrder: number;
  accountCode: string;
  side: 'DEBE' | 'HABER';
  baseCalculation: string;
  description?: string;
}

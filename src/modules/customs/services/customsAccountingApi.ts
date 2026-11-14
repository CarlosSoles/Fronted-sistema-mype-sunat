import { apiClient } from '@/lib/axios';

export interface CustomsAccountingLine {
  lineOrder: number;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
}

export interface CustomsJournalEntry {
  entryCode: string;
  entryName: string;
  concept: string;
  glosa: string;
  date: string;
  lines: CustomsAccountingLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface CustomsAccountingSummary {
  shipmentId: string;
  shipmentNumber: string;
  supplierName: string;
  duaNumber: string;
  cdaNumber?: string;
  currencyCode: string;
  exchangeRate: number;
  fobUsd: number;
  fobPen: number;
  freightPen: number;
  insurancePen: number;
  cifPen: number;
  adValoremPen: number;
  tdaPen: number;
  localExpensesPen: number;
  capitalizableTotalPen: number;
  igvPen: number;
  perceptionPen: number;
  totalFiscalCreditPen: number;
  isAuditBalanced: boolean;
  auditDifferencePen: number;
  isSynchronized: boolean;
  synchronizedAt?: string;
  entriesCount: number;
  entries: CustomsJournalEntry[];
}

export interface AccountingMappingRuleDto {
  roleCode: string;
  roleName: string;
  accountCode: string;
  accountName: string;
  defaultCode: string;
  side: 'DEBE' | 'HABER' | 'AMBOS';
  description: string;
}

export const customsAccountingApi = {
  getRules: async (): Promise<AccountingMappingRuleDto[]> => {
    const { data } = await apiClient.get<AccountingMappingRuleDto[]>('/customs/accounting/rules');
    return data || [];
  },

  updateRules: async (
    rules: Array<{ roleCode: string; accountCode: string }>,
  ): Promise<AccountingMappingRuleDto[]> => {
    const { data } = await apiClient.put<AccountingMappingRuleDto[]>('/customs/accounting/rules', { rules });
    return data || [];
  },

  getSummary: async (shipmentId: string): Promise<CustomsAccountingSummary> => {
    const { data } = await apiClient.get<CustomsAccountingSummary>(
      `/customs/accounting/summary/${encodeURIComponent(shipmentId)}`,
    );
    return data;
  },

  syncToGeneralLedger: async (
    shipmentId: string,
    payload?: { responsible?: string },
  ): Promise<{
    message: string;
    shipmentId: string;
    duaNumber: string;
    capitalizableTotalPen: number;
    createdCount: number;
    period: string;
  }> => {
    const { data } = await apiClient.post(
      `/customs/accounting/sync/${encodeURIComponent(shipmentId)}`,
      payload || {},
    );
    return data;
  },
};

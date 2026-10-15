import { apiClient } from '@/lib/axios';
import { type SireReconciliationSummary, type SireVoucher } from '../types/sire.types';

export const sireApi = {
  getProposals: async (periodo: string): Promise<{ vouchers: SireVoucher[]; summary: SireReconciliationSummary }> => {
    const response = await apiClient.get<{ vouchers: SireVoucher[]; summary: SireReconciliationSummary }>(
      '/sire/reconcile',
      { params: { periodo } }
    );
    return response.data;
  },

  acceptProposal: async (periodo: string): Promise<{ success: boolean; ticket: string }> => {
    const response = await apiClient.post<{ success: boolean; ticket: string }>(
      '/sire/accept-proposal',
      { periodo }
    );
    return response.data;
  },
};

import { create } from 'zustand';
import type { ReconcileSummary } from '../types/sire.types';

interface SireReconciliationState {
  period: string | null;
  summary: ReconcileSummary | null;
  setSummary: (period: string, summary: ReconcileSummary) => void;
  clearSummary: () => void;
}

export const useSireReconciliationStore = create<SireReconciliationState>((set) => ({
  period: null,
  summary: null,
  setSummary: (period, summary) => set({ period, summary }),
  clearSummary: () => set({ period: null, summary: null }),
}));

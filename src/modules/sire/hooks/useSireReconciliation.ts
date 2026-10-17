import { useQuery } from '@tanstack/react-query';
import { sireApi } from '../services/sireApi';
import {
  type SireBookType,
  type SireLocalRecord,
} from '../types/sire.types';

export const useSireReconciliation = (
  period = '202610',
  bookType: SireBookType = 'RVIE_VENTAS',
  localRecords: SireLocalRecord[] = [],
) => {
  return useQuery({
    queryKey: ['sire-reconciliation', period, bookType, localRecords],
    queryFn: () => sireApi.reconcile({ period, bookType, localRecords }),
    staleTime: 1000 * 60 * 5,
  });
};

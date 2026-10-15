import { useQuery } from '@tanstack/react-query';
import { sireApi } from '../services/sireApi';

export const useSireReconciliation = (periodo = '202610') => {
  return useQuery({
    queryKey: ['sire-reconciliation', periodo],
    queryFn: () => sireApi.getProposals(periodo),
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  });
};

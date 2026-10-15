import { useQuery } from '@tanstack/react-query';
import { accountingApi } from '../services/accountingApi';

export const useAccountingEntries = (periodo?: string) => {
  return useQuery({
    queryKey: ['accounting-entries', periodo],
    queryFn: () => accountingApi.getEntries(periodo),
    staleTime: 1000 * 60 * 5,
  });
};

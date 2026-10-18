import { useQuery } from '@tanstack/react-query';
import { kardexApi } from '../services/kardexApi';
import { type KardexFilterParams, type KardexMovementEntry } from '../types';

export const useKardexPermanent = (filters?: KardexFilterParams) => {
  const kardexQuery = useQuery<KardexMovementEntry[]>({
    queryKey: ['customs-kardex', filters],
    queryFn: () => kardexApi.getKardexMovements(filters),
  });

  return {
    movements: kardexQuery.data ?? [],
    isLoading: kardexQuery.isLoading,
    isError: kardexQuery.isError,
    error: kardexQuery.error,
    refetch: kardexQuery.refetch,
  };
};

import { useQuery } from '@tanstack/react-query';
import { masterDataApi } from '../services/masterDataApi';

/** Último tipo de cambio registrado para USD → PEN. */
export function useExchangeRate(base = 'USD', quote = 'PEN') {
  const query = useQuery({
    queryKey: ['exchange-rate', base, quote],
    queryFn: () => masterDataApi.getExchangeRates(),
    staleTime: 5 * 60 * 1000,
  });
  const fila = (query.data ?? [])
    .filter((r) => r.base_currency === base && r.quote_currency === quote)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  return {
    rate: fila ? Number(fila.rate) : null,
    date: fila?.date ?? null,
    source: fila?.source ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

import { useCallback, useState } from 'react';
import { sireApi } from '../services/sireApi';
import type { ReconcileRequest, ReconcileResponse } from '../types/sire.types';

export const useSireReconciliation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReconcileResponse | null>(null);

  const clear = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  const reconcile = useCallback(async (payload: ReconcileRequest) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await sireApi.reconcile(payload);
      setData(result);
      return result;
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : 'Ocurrió un error inesperado al conciliar los comprobantes.';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  return { reconcile, loading, error, data, clear };
};

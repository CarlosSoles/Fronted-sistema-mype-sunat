import { useCallback, useEffect, useRef, useState } from 'react';
import { sireApi } from '../services/sireApi';
import type {
  SireJobStatus,
  SirePeriodo,
  SirePeriodosRequest,
} from '../types/sire.types';

/** Frecuencia del sondeo del estado del trabajo encolado en SUNAT. */
export const SIRE_POLL_INTERVAL_MS = 3000;

/**
 * Tope de sondeos (120 x 3s = 6 min).
 *
 * El backend reintenta el trabajo 3 veces con backoff (30 s, 60 s, 120 s) antes
 * de mandarlo a la cola de muertos: por debajo de ese horizonte el frontend
 * cortaría la consulta mientras el worker todavía está trabajando.
 */
export const SIRE_POLL_MAX_ATTEMPTS = 120;

export interface UseSireConsultation {
  isLoading: boolean;
  statusMessage: string | null;
  error: string | null;
  jobStatus: SireJobStatus | null;
  messageId: string | null;
  periods: SirePeriodo[];
  consultar: (payload: SirePeriodosRequest) => Promise<void>;
  limpiar: () => void;
}

/**
 * Orquesta el flujo asíncrono de consulta a SUNAT:
 * POST /sire/periodos -> messageId -> sondeo GET /sire/periodos/status/:messageId.
 *
 * El `setInterval` vive en un ref y se cancela con `clearInterval` al terminar
 * el trabajo (COMPLETED/FAILED), al iniciar una consulta nueva, al desmontar el
 * componente y cuando vence el tope de sondeos.
 */
export const useSireConsultation = (): UseSireConsultation => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<SireJobStatus | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<SirePeriodo[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runRef = useRef(0);
  const attemptsRef = useRef(0);
  // Un sondeo en vuelo por ejecución: evita GET solapados si el servidor
  // tarda más que el intervalo. Se indexa por ejecución para que el `finally`
  // de una ejecución vieja no libere el FLAG de la nueva.
  const pendingRunsRef = useRef<Set<number>>(new Set());

  const stopPolling = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      // Invalida respuestas en vuelo y cancela el sondeo con clearInterval al desmontar.
      runRef.current += 1;
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const poll = useCallback(
    async (id: string, run: number) => {
      if (run !== runRef.current) return;
      if (pendingRunsRef.current.has(run)) return;

      attemptsRef.current += 1;
      if (attemptsRef.current > SIRE_POLL_MAX_ATTEMPTS) {
        stopPolling();
        setIsLoading(false);
        setStatusMessage(null);
        setError('La consulta a SUNAT superó el tiempo de espera esperado. Inténtalo nuevamente.');
        return;
      }

      pendingRunsRef.current.add(run);
      try {
        const response = await sireApi.getPeriodosStatus(id);
        if (run !== runRef.current) return;

        if (response.status === 'COMPLETED') {
          stopPolling();
          setPeriods(response.periods);
          setJobStatus('COMPLETED');
          setIsLoading(false);
          if (response.periods.length === 0) {
            // El backend completó el trabajo pero el resultado no se pudo leer.
            setStatusMessage(
              response.message?.trim() ||
                'La consulta se completó, pero SUNAT no devolvió periodos.',
            );
          } else {
            setStatusMessage('Consulta a SUNAT completada.');
          }
          return;
        }

        if (response.status === 'FAILED') {
          stopPolling();
          setPeriods([]);
          setJobStatus('FAILED');
          setStatusMessage(null);
          setError(
            response.error?.trim() ||
              response.message?.trim() ||
              'La consulta de periodos falló en el backend.',
          );
          setIsLoading(false);
          return;
        }

        // PENDING o PROCESSING: el worker todavía está trabajando.
        setJobStatus(response.status);
        setStatusMessage('Consultando a SUNAT...');
      } catch (cause) {
        if (run !== runRef.current) return;
        stopPolling();
        const message = cause instanceof Error
          ? cause.message
          : 'No se pudo consultar el estado de la consulta de periodos SIRE.';
        setPeriods([]);
        setStatusMessage(null);
        setError(message);
        setIsLoading(false);
      } finally {
        pendingRunsRef.current.delete(run);
      }
    },
    [stopPolling],
  );

  const consultar = useCallback(
    async (payload: SirePeriodosRequest) => {
      stopPolling();
      const run = runRef.current + 1;
      runRef.current = run;
      attemptsRef.current = 0;

      setIsLoading(true);
      setError(null);
      setPeriods([]);
      setJobStatus(null);
      setMessageId(null);
      setStatusMessage('Consultando a SUNAT...');

      try {
        const accepted = await sireApi.requestPeriodos(payload);
        if (run !== runRef.current) return;

        setMessageId(accepted.messageId);
        setJobStatus('PENDING');
        setStatusMessage('Consultando a SUNAT...');

        timerRef.current = setInterval(() => {
          void poll(accepted.messageId, run);
        }, SIRE_POLL_INTERVAL_MS);
        void poll(accepted.messageId, run);
      } catch (cause) {
        if (run !== runRef.current) return;
        const message = cause instanceof Error
          ? cause.message
          : 'No se pudo iniciar la consulta de periodos SIRE.';
        setIsLoading(false);
        setStatusMessage(null);
        setError(message);
      }
    },
    [poll, stopPolling],
  );

  const limpiar = useCallback(() => {
    stopPolling();
    runRef.current += 1;
    setIsLoading(false);
    setStatusMessage(null);
    setError(null);
    setJobStatus(null);
    setMessageId(null);
    setPeriods([]);
  }, [stopPolling]);

  return { isLoading, statusMessage, error, jobStatus, messageId, periods, consultar, limpiar };
};

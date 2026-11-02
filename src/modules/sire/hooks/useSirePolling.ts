import { useEffect, useState } from 'react';
import { sireApi } from '../services/sireApi';
import type { SireWorkflowRequest, SireWorkflowResponse } from '../types/sire.types';

const terminalStatuses = new Set(['TERMINADO', 'ERROR']);
const activeStates = new Set(['PROCESANDO_PRELIMINAR', 'PROCESANDO_REEMPLAZO']);

export const useSirePolling = (
  request: (SireWorkflowRequest & { ticket?: string }) | null,
  initial: SireWorkflowResponse | null,
  onComplete: (response: SireWorkflowResponse) => void,
) => {
  const [polled, setPolled] = useState<SireWorkflowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !request ||
      !initial?.ticket ||
      (initial.status !== 'PENDIENTE' && !activeStates.has(initial.state))
    ) return;

    const interval = window.setInterval(() => {
      void sireApi.getStatus(request).then((response) => {
        setPolled(response);
        if (terminalStatuses.has(response.status ?? '') || !activeStates.has(response.state)) {
          window.clearInterval(interval);
          onComplete(response);
        }
      }).catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'No se pudo consultar el estado del ticket.');
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [initial, onComplete, request]);

  return { current: polled ?? initial, error };
};

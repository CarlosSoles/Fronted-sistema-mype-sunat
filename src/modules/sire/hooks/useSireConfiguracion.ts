import { useCallback, useEffect, useRef, useState } from 'react';
import { sireApi } from '../services/sireApi';
import type { SireConfiguracionPayload, SireConfiguracionStatus } from '../types/sire.types';

export interface UseSireConfiguracion {
  /** Está consultando el estado de la configuración (`GET .../status`). */
  isLoading: boolean;
  /** Está guardando las credenciales (`POST .../configuracion`). */
  isSaving: boolean;
  /** La empresa ya tiene las cuatro credenciales guardadas. */
  configured: boolean;
  /** Error al consultar el estado de la configuración. */
  error: string | null;
  /** Error al guardar las credenciales. */
  saveError: string | null;
  /** Confirmación de un guardado correcto. */
  successMessage: string | null;
  /** Guarda las credenciales enviadas y devuelve si quedaron completas. */
  save: (payload: SireConfiguracionPayload) => Promise<boolean>;
  /** Vuelve a consultar el estado de la configuración. */
  reload: () => Promise<void>;
  /** Limpia los mensajes de resultado (sin tocar el estado consultado). */
  resetMessages: () => void;
}

/**
 * Estado de la configuración SIRE de la empresa.
 *
 * Al montar la pantalla consulta `GET /sire/configuracion/status`; el backend
 * solo devuelve `{ configured }`, nunca las credenciales. El guardado va a
 * `POST /sire/configuracion` y devuelve el mismo indicador.
 */
export const useSireConfiguracion = (): UseSireConfiguracion => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const runRef = useRef(0);

  const reload = useCallback(async () => {
    const run = runRef.current + 1;
    runRef.current = run;
    setIsLoading(true);
    setError(null);
    try {
      const status: SireConfiguracionStatus = await sireApi.getConfiguracionStatus();
      if (run !== runRef.current) return;
      setConfigured(status.configured);
    } catch (cause) {
      if (run !== runRef.current) return;
      setConfigured(false);
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo consultar el estado de la configuración SIRE.',
      );
    } finally {
      if (run === runRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const status = await sireApi.getConfiguracionStatus();
        if (active) {
          setConfigured(status.configured);
        }
      } catch (cause) {
        if (active) {
          setConfigured(false);
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo consultar el estado de la configuración SIRE.',
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      active = false;
      runRef.current += 1;
    };
  }, []);

  const save = useCallback(async (payload: SireConfiguracionPayload) => {
    const run = runRef.current + 1;
    runRef.current = run;
    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      const status = await sireApi.saveConfiguracion(payload);
      if (run !== runRef.current) return false;
      setConfigured(status.configured);
      setSuccessMessage('Credenciales guardadas exitosamente.');
      return status.configured;
    } catch (cause) {
      if (run !== runRef.current) return false;
      setSaveError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo guardar la configuración SIRE de la empresa.',
      );
      return false;
    } finally {
      if (run === runRef.current) setIsSaving(false);
    }
  }, []);

  const resetMessages = useCallback(() => {
    setSaveError(null);
    setSuccessMessage(null);
  }, []);

  return {
    isLoading,
    isSaving,
    configured,
    error,
    saveError,
    successMessage,
    save,
    reload,
    resetMessages,
  };
};

import { useCallback, useEffect, useState } from 'react';
import { sireApi } from '../services/sireApi';
import type { SireConfiguracionPayload } from '../types/sire.types';

export interface UseSireCredentials {
  /** Está consultando si la empresa ya tiene credenciales guardadas. */
  isLoading: boolean;
  /** Está guardando las credenciales (`POST /sire/configuracion`). */
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
  /** Limpia los mensajes de resultado. */
  resetMessages: () => void;
}

/**
 * Estado de las credenciales SIRE de la empresa.
 *
 * Al montar consulta `GET /sire/configuracion/status` para saber si la empresa
 * ya está configurada; el backend nunca devuelve las credenciales. El formulario
 * permanece editable en todo momento y el guardado va a `POST /sire/configuracion`.
 */
export const useSireCredentials = (): UseSireCredentials => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    sireApi
      .getConfiguracionStatus()
      .then((status) => {
        if (active) setConfigured(status.configured);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo consultar el estado de la configuración SIRE.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(async (payload: SireConfiguracionPayload) => {
    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      const status = await sireApi.saveConfiguracion(payload);
      setConfigured(status.configured);
      setSuccessMessage('Credenciales guardadas exitosamente.');
      return status.configured;
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo guardar la configuración SIRE de la empresa.',
      );
      return false;
    } finally {
      setIsSaving(false);
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
    resetMessages,
  };
};

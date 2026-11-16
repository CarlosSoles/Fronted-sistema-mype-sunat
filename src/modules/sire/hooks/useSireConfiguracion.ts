import { useCallback, useEffect, useRef, useState } from 'react';
import { empresaApi } from '../services/empresaApi';
import { sireApi } from '../services/sireApi';
import type {
  EmpresaConfiguracionPayload,
  SireConfiguracionPayload,
  SireConfiguracionStatus,
} from '../types/sire.types';

export interface UseSireConfiguracion {
  /** Está consultando el estado de la configuración (`GET .../status`). */
  isLoading: boolean;
  /** Está guardando las credenciales (`POST .../configuracion`). */
  isSaving: boolean;
  /** Está guardando los datos globales de la empresa (`PUT /empresa/configuracion`). */
  isSavingCompany: boolean;
  /** La empresa ya tiene las cuatro credenciales guardadas. */
  configured: boolean;
  /** Error al consultar el estado de la configuración. */
  error: string | null;
  /** Error al guardar las credenciales. */
  saveError: string | null;
  /** Error al guardar los datos globales de la empresa. */
  companyError: string | null;
  /** Confirmación de un guardado correcto. */
  successMessage: string | null;
  /** Confirmación del guardado de los datos de la empresa. */
  companySuccessMessage: string | null;
  /** Guarda las credenciales enviadas y devuelve si quedaron completas. */
  save: (payload: SireConfiguracionPayload) => Promise<boolean>;
  /** Guarda los datos globales de la empresa. */
  saveCompany: (payload: EmpresaConfiguracionPayload) => Promise<boolean>;
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
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [companySuccessMessage, setCompanySuccessMessage] = useState<string | null>(null);

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

  const saveCompany = useCallback(async (payload: EmpresaConfiguracionPayload) => {
    setIsSavingCompany(true);
    setCompanyError(null);
    setCompanySuccessMessage(null);
    try {
      await empresaApi.saveConfiguracion(payload);
      setCompanySuccessMessage('Datos de la empresa guardados exitosamente.');
      return true;
    } catch (cause) {
      setCompanyError(
        cause instanceof Error
          ? cause.message
          : 'No se pudieron guardar los datos de la empresa.',
      );
      return false;
    } finally {
      setIsSavingCompany(false);
    }
  }, []);

  const resetMessages = useCallback(() => {
    setSaveError(null);
    setSuccessMessage(null);
    setCompanyError(null);
    setCompanySuccessMessage(null);
  }, []);

  return {
    isLoading,
    isSaving,
    isSavingCompany,
    configured,
    error,
    saveError,
    companyError,
    successMessage,
    companySuccessMessage,
    save,
    saveCompany,
    reload,
    resetMessages,
  };
};

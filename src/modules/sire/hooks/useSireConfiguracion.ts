import { useCallback, useState } from 'react';
import { empresaApi } from '../services/empresaApi';
import { SireApiError } from '../services/sireApiHttp';
import type {
  EmpresaConfiguracionActual,
  EmpresaConfiguracionPayload,
  EmpresaRucValidacion,
} from '../types/sire.types';

export interface UseSireConfiguracion {
  /** Está cargando los datos actuales de la empresa (`GET /empresa/configuracion`). */
  isLoadingCompany: boolean;
  /** Está guardando los datos globales de la empresa (`PUT /empresa/configuracion`). */
  isSavingCompany: boolean;
  /** Está validando el RUC contra Decolecta (`GET /empresa/validar-ruc/:ruc`). */
  isValidatingRuc: boolean;
  /** Error al cargar los datos de la empresa. */
  companyLoadError: string | null;
  /** Error al guardar los datos globales de la empresa. */
  companyError: string | null;
  /** Error al validar el RUC de la empresa. */
  rucError: string | null;
  /** Confirmación del guardado de los datos de la empresa. */
  companySuccessMessage: string | null;
  /** Carga la configuración actual de la empresa. */
  loadCompany: (companyId?: string) => Promise<EmpresaConfiguracionActual | null>;
  /** Guarda los datos globales de la empresa. */
  saveCompany: (payload: EmpresaConfiguracionPayload, companyId?: string) => Promise<boolean>;
  /** Valida el RUC y devuelve la razón social, o `null` si falla. */
  validateRuc: (ruc: string) => Promise<EmpresaRucValidacion | null>;
  /** Limpia los mensajes de resultado. */
  resetMessages: () => void;
}

/**
 * Estado de los datos globales de la empresa para la configuración SIRE.
 *
 * El guardado va a `PUT /empresa/configuracion` y la validación del RUC a
 * `GET /empresa/validar-ruc/:ruc`. Las credenciales SIRE/SUNAT se administran
 * en su propia pantalla.
 */
export const useSireConfiguracion = (): UseSireConfiguracion => {
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isValidatingRuc, setIsValidatingRuc] = useState(false);
  const [companyLoadError, setCompanyLoadError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [rucError, setRucError] = useState<string | null>(null);
  const [companySuccessMessage, setCompanySuccessMessage] = useState<string | null>(null);

  const loadCompany = useCallback(async (companyId?: string): Promise<EmpresaConfiguracionActual | null> => {
    setIsLoadingCompany(true);
    setCompanyLoadError(null);
    try {
      return await empresaApi.getConfiguracion(companyId);
    } catch (cause) {
      setCompanyLoadError(
        cause instanceof Error
          ? cause.message
          : 'No se pudieron cargar los datos de la empresa.',
      );
      return null;
    } finally {
      setIsLoadingCompany(false);
    }
  }, []);

  const saveCompany = useCallback(async (payload: EmpresaConfiguracionPayload, companyId?: string) => {
    setIsSavingCompany(true);
    setCompanyError(null);
    setCompanySuccessMessage(null);
    try {
      await empresaApi.saveConfiguracion(payload, companyId);
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

  const validateRuc = useCallback(async (ruc: string): Promise<EmpresaRucValidacion | null> => {
    setIsValidatingRuc(true);
    setRucError(null);
    try {
      return await empresaApi.validateRuc(ruc);
    } catch (cause) {
      const status = cause instanceof SireApiError ? cause.status : null;
      const message = cause instanceof Error ? cause.message : '';
      setRucError(
        status !== null && [400, 404, 422].includes(status)
          ? 'RUC no válido o no encontrado.'
          : message || 'RUC no válido o no encontrado.',
      );
      return null;
    } finally {
      setIsValidatingRuc(false);
    }
  }, []);

  const resetMessages = useCallback(() => {
    setCompanyError(null);
    setCompanySuccessMessage(null);
    setRucError(null);
  }, []);

  return {
    isLoadingCompany,
    isSavingCompany,
    isValidatingRuc,
    companyLoadError,
    companyError,
    rucError,
    companySuccessMessage,
    loadCompany,
    saveCompany,
    validateRuc,
    resetMessages,
  };
};

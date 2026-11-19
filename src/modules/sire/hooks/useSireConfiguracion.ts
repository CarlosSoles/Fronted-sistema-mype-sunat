import { useCallback, useState } from 'react';
import { empresaApi } from '../services/empresaApi';
import { SireApiError } from '../services/sireApiHttp';
import type {
  EmpresaConfiguracionActual,
  EmpresaConfiguracionPayload,
  EmpresaRucValidacion,
} from '../types/sire.types';

export interface UseSireConfiguracion {
  /** EstÃ¡ cargando los datos actuales de la empresa (`GET /empresa/configuracion`). */
  isLoadingCompany: boolean;
  /** EstÃ¡ guardando los datos globales de la empresa (`PUT /empresa/configuracion`). */
  isSavingCompany: boolean;
  /** EstÃ¡ validando el RUC contra Decolecta (`GET /empresa/validar-ruc/:ruc`). */
  isValidatingRuc: boolean;
  /** Error al cargar los datos de la empresa. */
  companyLoadError: string | null;
  /** Error al guardar los datos globales de la empresa. */
  companyError: string | null;
  /** Error al validar el RUC de la empresa. */
  rucError: string | null;
  /** ConfirmaciÃ³n del guardado de los datos de la empresa. */
  companySuccessMessage: string | null;
  /** Carga la configuraciÃ³n actual de la empresa. */
  loadCompany: () => Promise<EmpresaConfiguracionActual | null>;
  /** Guarda los datos globales de la empresa. */
  saveCompany: (payload: EmpresaConfiguracionPayload) => Promise<boolean>;
  /** Valida el RUC y devuelve la razÃ³n social, o `null` si falla. */
  validateRuc: (ruc: string) => Promise<EmpresaRucValidacion | null>;
  /** Limpia los mensajes de resultado. */
  resetMessages: () => void;
}

/**
 * Estado de los datos globales de la empresa para la configuraciÃ³n SIRE.
 *
 * El guardado va a `PUT /empresa/configuracion` y la validaciÃ³n del RUC a
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

  const loadCompany = useCallback(async (): Promise<EmpresaConfiguracionActual | null> => {
    setIsLoadingCompany(true);
    setCompanyLoadError(null);
    try {
      return await empresaApi.getConfiguracion();
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
          ? 'RUC no vÃ¡lido o no encontrado.'
          : message || 'RUC no vÃ¡lido o no encontrado.',
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

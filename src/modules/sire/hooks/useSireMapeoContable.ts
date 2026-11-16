import { useCallback, useEffect, useState } from 'react';
import { sireApi } from '../services/sireApi';
import {
  SIRE_MAPEO_TIPOS,
  type SireMapeoContable,
  type SireMapeoTipoOperacion,
} from '../types/sire.types';

/** Valores del formulario: una cuenta contable por tipo de operación. */
export type SireMapeoForm = Record<SireMapeoTipoOperacion, string>;

const emptyForm = (): SireMapeoForm => ({
  VENTAS: '',
  COMPRAS: '',
  IGV: '',
  BASE: '',
});

const fromMapeos = (mapeos: SireMapeoContable[]): SireMapeoForm => {
  const form = emptyForm();
  for (const mapeo of mapeos) {
    form[mapeo.tipoOperacion] = mapeo.cuentaContable;
  }
  return form;
};

export interface UseSireMapeoContable {
  /** Está cargando los mapeos guardados (`GET /sire/mapeo-contable`). */
  isLoading: boolean;
  /** Está guardando los mapeos (`POST /sire/mapeo-contable`). */
  isSaving: boolean;
  /** Cuenta contable escrita por tipo de operación. */
  values: SireMapeoForm;
  /** Error al cargar los mapeos existentes. */
  error: string | null;
  /** Error al guardar los mapeos. */
  saveError: string | null;
  /** Confirmación de un guardado correcto. */
  successMessage: string | null;
  /** Actualiza la cuenta contable de un tipo de operación. */
  setCuenta: (tipo: SireMapeoTipoOperacion, value: string) => void;
  /** Guarda las cuatro cuentas contables. */
  save: () => Promise<boolean>;
  /** Limpia los mensajes de resultado. */
  resetMessages: () => void;
}

/**
 * Estado del mapeo contable SIRE de la empresa.
 *
 * Al montar consulta `GET /sire/mapeo-contable` y llena la tabla con lo que ya
 * esté guardado. `POST /sire/mapeo-contable` reemplaza el mapeo completo con el
 * arreglo de las cuatro operaciones.
 */
export const useSireMapeoContable = (): UseSireMapeoContable => {
  const [values, setValues] = useState<SireMapeoForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    sireApi
      .getMapeoContable()
      .then((mapeos) => {
        if (active) setValues(fromMapeos(mapeos));
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar el mapeo contable SIRE.',
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

  const setCuenta = useCallback((tipo: SireMapeoTipoOperacion, value: string) => {
    setValues((current) => ({ ...current, [tipo]: value }));
    setSaveError(null);
    setSuccessMessage(null);
  }, []);

  const save = useCallback(async () => {
    const faltante = SIRE_MAPEO_TIPOS.find((tipo) => !values[tipo].trim());
    if (faltante) {
      setSaveError(`Completa la cuenta contable de ${faltante}.`);
      setSuccessMessage(null);
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      await sireApi.saveMapeoContable(
        SIRE_MAPEO_TIPOS.map((tipo) => ({
          tipoOperacion: tipo,
          cuentaContable: values[tipo].trim(),
        })),
      );
      setSuccessMessage('Mapeo contable guardado exitosamente.');
      return true;
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo guardar el mapeo contable SIRE.',
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [values]);

  const resetMessages = useCallback(() => {
    setSaveError(null);
    setSuccessMessage(null);
  }, []);

  return {
    isLoading,
    isSaving,
    values,
    error,
    saveError,
    successMessage,
    setCuenta,
    save,
    resetMessages,
  };
};

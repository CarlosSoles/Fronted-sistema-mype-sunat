import { useCallback, useEffect, useState } from 'react';
import { accountingApi } from '@/modules/accounting/services/accountingApi';
import type {
  AccountingAccount,
  AccountingGlobalMapping,
} from '@/modules/accounting/types/accounting.types';
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
  IGV_VENTAS: '',
  IGV_COMPRAS: '',
  BASE: '',
});

const fromMapeos = (mapeos: SireMapeoContable[]): SireMapeoForm => {
  const form = emptyForm();
  for (const mapeo of mapeos) {
    form[mapeo.tipoOperacion] = mapeo.cuentaContable;
  }
  return form;
};

/** Cuenta global heredada, ya resuelta con su nombre PCGE. */
export interface SireCuentaHeredada {
  code: string;
  name: string;
  description: string;
  isCustom: boolean;
}

export type SireMapeoHeredado = Record<SireMapeoTipoOperacion, SireCuentaHeredada[]>;

/**
 * Equivalencia entre cada operación SIRE y el proceso/rol del mapeo global.
 *
 * El mapeo global es la fuente por defecto; SIRE solo guarda sus propias
 * sobrescrituras. BASE admite las dos cuentas globales de base (venta/compra).
 */
const GLOBAL_KEYS: Record<
  SireMapeoTipoOperacion,
  ReadonlyArray<{ processCode: string; roleCode: string }>
> = {
  VENTAS: [{ processCode: 'VENTA', roleCode: 'CXC' }],
  COMPRAS: [{ processCode: 'COMPRA', roleCode: 'CXP' }],
  IGV_VENTAS: [{ processCode: 'VENTA', roleCode: 'IGV' }],
  IGV_COMPRAS: [{ processCode: 'COMPRA', roleCode: 'IGV_CREDITO' }],
  BASE: [
    { processCode: 'VENTA', roleCode: 'INGRESO' },
    { processCode: 'COMPRA', roleCode: 'GASTO_COMPRA' },
  ],
};

export interface UseSireMapeoContable {
  /** Está cargando los mapeos guardados (`GET /sire/mapeo-contable`). */
  isLoading: boolean;
  /** Está guardando los mapeos (`POST /sire/mapeo-contable`). */
  isSaving: boolean;
  /** Cuenta contable escrita por tipo de operación. */
  values: SireMapeoForm;
  /** Cuentas reales del Plan de Cuentas (PCGE) habilitadas para asignar. */
  accounts: AccountingAccount[];
  /** Está cargando las cuentas del PCGE. */
  isLoadingAccounts: boolean;
  /** Error al cargar las cuentas del PCGE. */
  accountsError: string | null;
  /** Mapeo contable global de la empresa (incluye defaults del backend). */
  globalMappings: AccountingGlobalMapping[];
  /** Está cargando el mapeo global. */
  isLoadingGlobalMappings: boolean;
  /** Error al cargar el mapeo global. */
  globalMappingsError: string | null;
  /** Cuentas globales heredadas por operación SIRE. */
  inheritedAccounts: SireMapeoHeredado;
  /** Error al cargar los mapeos existentes. */
  error: string | null;
  /** Error al guardar los mapeos. */
  saveError: string | null;
  /** Confirmación de un guardado correcto. */
  successMessage: string | null;
  /** Actualiza la cuenta contable de un tipo de operación. */
  setCuenta: (tipo: SireMapeoTipoOperacion, value: string) => void;
  /** Guarda las sobrescrituras SIRE (las cuentas vacías heredan la global). */
  save: () => Promise<boolean>;
  /** Limpia los mensajes de resultado. */
  resetMessages: () => void;
}

/**
 * Estado del mapeo contable SIRE de la empresa.
 *
 * Al montar consulta `GET /sire/mapeo-contable` y el mapeo global. Las cuentas
 * globales se muestran como herencia; si el usuario selecciona una cuenta
 * distinta, `POST /sire/mapeo-contable` guarda solo esa sobrescritura SIRE.
 */
export const useSireMapeoContable = (companyId?: string): UseSireMapeoContable => {
  const [values, setValues] = useState<SireMapeoForm>(emptyForm);
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [globalMappings, setGlobalMappings] = useState<AccountingGlobalMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingGlobalMappings, setIsLoadingGlobalMappings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [globalMappingsError, setGlobalMappingsError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    accountingApi
      .getPlanCuentas()
      .then((result) => {
        if (!active) return;
        setAccounts(
          [...result]
            .filter((account) => account.isActive)
            .sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true })),
        );
      })
      .catch((cause: unknown) => {
        if (active) {
          setAccountsError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar el Plan de Cuentas (PCGE).',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingAccounts(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    accountingApi
      .getAccountingMappings()
      .then((result) => {
        if (active) setGlobalMappings(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setGlobalMappingsError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar el mapeo contable global.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingGlobalMappings(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    sireApi
      .getMapeoContable(companyId)
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
  }, [companyId]);

  const accountNames = new Map(accounts.map((account) => [account.code, account.name]));
  const inheritedAccounts = SIRE_MAPEO_TIPOS.reduce<SireMapeoHeredado>(
    (result, tipo) => {
      result[tipo] = GLOBAL_KEYS[tipo]
        .map((key) => {
          const mapping = globalMappings.find(
            (item) =>
              item.processCode.toUpperCase() === key.processCode &&
              item.roleCode.toUpperCase() === key.roleCode,
          );
          if (!mapping?.accountCode) return null;
          return {
            code: mapping.accountCode,
            name: accountNames.get(mapping.accountCode) ?? mapping.description,
            description: mapping.description,
            isCustom: mapping.isCustom,
          };
        })
        .filter((item): item is SireCuentaHeredada => item !== null);
      return result;
    },
    {} as SireMapeoHeredado,
  );

  const setCuenta = useCallback((tipo: SireMapeoTipoOperacion, value: string) => {
    setValues((current) => ({ ...current, [tipo]: value }));
    setSaveError(null);
    setSuccessMessage(null);
  }, []);

  const save = useCallback(async () => {
    const overrides = SIRE_MAPEO_TIPOS
      .map((tipo) => ({
        tipoOperacion: tipo,
        cuentaContable: values[tipo].trim(),
      }))
      .filter((item) => item.cuentaContable);

    if (overrides.length === 0) {
      setSaveError(null);
      setSuccessMessage(
        'No hay sobrescrituras SIRE; se usarán las cuentas globales.',
      );
      return true;
    }

    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      await sireApi.saveMapeoContable(overrides, companyId);
      setSuccessMessage('Mapeo contable SIRE guardado exitosamente.');
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
  }, [companyId, values]);

  const resetMessages = useCallback(() => {
    setSaveError(null);
    setSuccessMessage(null);
  }, []);

  return {
    isLoading,
    isSaving,
    values,
    accounts,
    isLoadingAccounts,
    accountsError,
    globalMappings,
    isLoadingGlobalMappings,
    globalMappingsError,
    inheritedAccounts,
    error,
    saveError,
    successMessage,
    setCuenta,
    save,
    resetMessages,
  };
};

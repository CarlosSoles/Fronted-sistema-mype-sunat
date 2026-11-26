import { useEffect, useState } from 'react';
import { normalizeRoleCode } from '@/modules/auth/lib/roleCode';
import { empresaApi } from '@/modules/sire/services/empresaApi';
import type { EmpresaResumen } from '@/modules/sire/types/sire.types';
import { useAuthStore } from '@/stores/authStore';

export interface UseEmpresasAdmin {
  isAdmin: boolean;
  empresas: EmpresaResumen[];
  isLoading: boolean;
  error: string | null;
  selectedCompanyId: string;
  selectedCompany: EmpresaResumen | null;
  setSelectedCompanyId: (companyId: string) => void;
}

/**
 * Listado Multi-RUC para el ADMIN.
 *
 * El backend solo expone `/empresa/listar` al rol ADMIN. Para los demás roles
 * el selector no se muestra y se conserva la empresa de la sesión.
 */
export const useEmpresasAdmin = (): UseEmpresasAdmin => {
  const role = useAuthStore((state) => state.user?.role);
  const activeCompany = useAuthStore((state) => state.activeCompany);
  const isAdmin = normalizeRoleCode(role ?? '') === 'ADMIN';

  const [empresas, setEmpresas] = useState<EmpresaResumen[]>([]);
  const [isLoading, setIsLoading] = useState(isAdmin);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    activeCompany?.tenantId ?? '',
  );

  useEffect(() => {
    if (!isAdmin) return;

    let active = true;
    empresaApi
      .listarEmpresas()
      .then((list) => {
        if (!active) return;
        setEmpresas(list);
        setSelectedCompanyId((current) => {
          if (current && list.some((empresa) => empresa.id === current)) {
            return current;
          }
          const deSesion = activeCompany?.tenantId;
          if (deSesion && list.some((empresa) => empresa.id === deSesion)) {
            return deSesion;
          }
          return list[0]?.id ?? '';
        });
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudieron cargar las empresas.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeCompany?.tenantId, isAdmin]);

  const selectedCompany =
    empresas.find((empresa) => empresa.id === selectedCompanyId) ?? null;

  return {
    isAdmin,
    empresas,
    isLoading,
    error,
    selectedCompanyId,
    selectedCompany,
    setSelectedCompanyId,
  };
};

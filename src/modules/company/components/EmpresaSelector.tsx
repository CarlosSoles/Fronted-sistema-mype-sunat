import { LoaderCircle } from 'lucide-react';
import { PageText } from '@/components/ui';
import type { EmpresaResumen } from '@/modules/sire/types/sire.types';

interface Props {
  empresas: EmpresaResumen[];
  value: string;
  isLoading: boolean;
  error: string | null;
  onChange: (companyId: string) => void;
}

/**
 * Selector Multi-RUC para ADMIN.
 *
 * Muestra RUC y razón social para evitar elegir una empresa por un UUID.
 */
export const EmpresaSelector = ({
  empresas,
  value,
  isLoading,
  error,
  onChange,
}: Props) => (
  <div className="max-w-md space-y-1.5">
    <label htmlFor="empresa-selector" className="block text-xs font-semibold text-foreground">
      Empresa
    </label>
    <div className="relative">
      <select
        id="empresa-selector"
        aria-label="Empresa"
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs"
        value={value}
        disabled={isLoading || empresas.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        {empresas.length === 0 && <option value="">Sin empresas disponibles</option>}
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.ruc} - {empresa.razonSocial}
          </option>
        ))}
      </select>
      {isLoading && (
        <LoaderCircle
          className="absolute right-8 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary"
          aria-hidden="true"
        />
      )}
    </div>
    {error && <PageText variant="error">{error}</PageText>}
  </div>
);

import { useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Page,
  PageHeader,
} from '@/components/ui';
import { SireMetricsCards } from '../components/SireMetricsCards';
import { SirePeriodFilter } from '../components/SirePeriodFilter';
import { SireVouchersTable } from '../components/SireVouchersTable';
import { useSireReconciliation } from '../hooks/useSireReconciliation';
import {
  type SireBookType,
  type SireLocalRecord,
  type SireReconciliationSummary,
} from '../types/sire.types';

import { extractApiErrorMessage } from '@/lib/apiErrors';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Badge } from '@/components/ui';

const EMPTY_LOCAL_RECORDS: SireLocalRecord[] = [];
const EMPTY_SUMMARY: SireReconciliationSummary = {
  totalPropuestaSunat: 0,
  totalRegistroLocal: 0,
  comprobantesConciliados: 0,
  comprobantesConDiscrepancia: 0,
  diferenciaNeta: 0,
};

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function SireReconciliationPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [bookType, setBookType] = useState<SireBookType>('RVIE_VENTAS');
  const [appliedPeriod, setAppliedPeriod] = useState(period);
  const [appliedBookType, setAppliedBookType] = useState(bookType);
  const { isAuditor } = useRolePermissions();
  const { data, error, isFetching, isLoading } = useSireReconciliation(
    appliedPeriod,
    appliedBookType,
    EMPTY_LOCAL_RECORDS,
  );

  return (
    <Page>
      <PageHeader
        title="Conciliación Fiscal SIRE (RVIE / RCE)"
        description="Cruce entre la propuesta de SUNAT y los registros locales."
      >
        {isAuditor && (
          <Badge variant="outline" className="h-8 px-3 text-xs bg-muted/60 text-muted-foreground border-dashed">
            👁️ Auditoría Tributaria (Solo Lectura)
          </Badge>
        )}
      </PageHeader>
      <SirePeriodFilter
        period={period}
        bookType={bookType}
        isFetching={isFetching}
        onPeriodChange={setPeriod}
        onBookTypeChange={setBookType}
        onApply={() => {
          setAppliedPeriod(period);
          setAppliedBookType(bookType);
        }}
      />
      {data?.source === 'mock' && (
        <Alert variant="info">
          <AlertTitle>Datos de demostración</AlertTitle>
          <AlertDescription>
            El backend SIRE no está disponible. Se muestran datos simulados; no son registros fiscales reales.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo consultar SIRE</AlertTitle>
          <AlertDescription>{extractApiErrorMessage(error)}</AlertDescription>
        </Alert>
      )}
      <SireMetricsCards summary={data?.summary ?? EMPTY_SUMMARY} />
      <SireVouchersTable vouchers={data?.vouchers ?? []} isLoading={isLoading} />
    </Page>
  );
}

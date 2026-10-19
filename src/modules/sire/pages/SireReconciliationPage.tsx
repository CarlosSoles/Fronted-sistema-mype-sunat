import { useState, type FormEvent } from 'react';
import { Alert, AlertDescription, AlertTitle, Button, Page, PageHeader } from '@/components/ui';
import { LoaderCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { SireComprobantesTable } from '../components/SireComprobantesTable';
import { SireMetricsCards } from '../components/SireMetricsCards';
import { SirePeriodFilter } from '../components/SirePeriodFilter';
import { SireVouchersTable } from '../components/SireVouchersTable';
import { useSireReconciliation } from '../hooks/useSireReconciliation';
import type { ComprobanteDraft } from '../types/sire.types';

const emptyVoucher = (): ComprobanteDraft => ({
  tipoComprobante: '01', serie: '', correlativo: '', baseImponible: '', igv: '', total: '',
});

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function SireReconciliationPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [ruc, setRuc] = useState(() => useAuthStore.getState().activeCompany?.ruc ?? '');
  const [comprobantes, setComprobantes] = useState<ComprobanteDraft[]>([emptyVoucher()]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const { reconcile, loading, error, data } = useSireReconciliation();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowFeedback(true);
    const mapped = comprobantes.map((row) => ({
      tipoComprobante: row.tipoComprobante,
      serie: row.serie,
      correlativo: row.correlativo,
      baseImponible: row.baseImponible.trim() ? Number(row.baseImponible) : Number.NaN,
      igv: row.igv.trim() ? Number(row.igv) : Number.NaN,
      total: row.total.trim() ? Number(row.total) : Number.NaN,
    }));
    if (mapped.some((row) => ![row.baseImponible, row.igv, row.total].every(Number.isFinite))) {
      setInputError('Completa cada importe con un número finito para enviar los comprobantes.');
      return;
    }
    setInputError(null);
    void reconcile({ period, ruc, comprobantes: mapped }).catch(() => undefined);
  };

  return (
    <Page>
      <PageHeader
        title="Conciliación fiscal SIRE"
        description="Compara los comprobantes del ERP con la información fiscal de SUNAT."
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <SirePeriodFilter
          period={period}
          ruc={ruc}
          disabled={loading}
          showFeedback={showFeedback}
          onPeriodChange={setPeriod}
          onRucChange={setRuc}
        />
        <SireComprobantesTable
          comprobantes={comprobantes}
          showFeedback={showFeedback}
          onChange={setComprobantes}
        />
        <Button type="submit" disabled={loading}>
          {loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {loading ? 'Conciliando…' : 'Conciliar'}
        </Button>
      </form>

      {(inputError || error) && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>No se pudo completar la conciliación</AlertTitle>
          <AlertDescription>{inputError ?? error}</AlertDescription>
        </Alert>
      )}
      {data && (
        <div className="mt-6 space-y-6">
          <SireMetricsCards summary={data.summary} />
          <SireVouchersTable results={data.results} />
          {data.results.some((result) => result.escenario === 'DUPLICADO_LLAVE') && (
            <Alert variant="warning">
              <AlertTitle>Se requiere resolución manual</AlertTitle>
              <AlertDescription>
                Las llaves duplicadas no tienen un registro elegido automáticamente. Revisa el origen indicado en cada fila.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </Page>
  );
}

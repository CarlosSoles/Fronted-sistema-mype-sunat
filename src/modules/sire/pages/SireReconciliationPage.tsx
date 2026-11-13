import { useEffect, useState, type FormEvent } from 'react';
import { Alert, AlertDescription, AlertTitle, Button, Page, PageHeader } from '@/components/ui';
import { LoaderCircle, ArrowRightLeft, PenTool } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { SireComprobantesTable } from '../components/SireComprobantesTable';
import { SireMetricsCards } from '../components/SireMetricsCards';
import { SirePeriodFilter } from '../components/SirePeriodFilter';
import { SireVouchersTable } from '../components/SireVouchersTable';
import { SireProposalPanel } from '../components/SireProposalPanel';
import { SireRceKardexReconciliation } from '../components/SireRceKardexReconciliation';
import { SireHealthDashboard } from '../components/SireHealthDashboard';
import { useSireReconciliation } from '../hooks/useSireReconciliation';
import { useSireReconciliationStore } from '../stores/sireReconciliationStore';
import type { ComprobanteDraft, SireBookType } from '../types/sire.types';
import { getPeriodFeedback, getRucFeedback } from '../validators/sireSchema';

const emptyVoucher = (): ComprobanteDraft => ({
  tipoComprobante: '01', serie: '', correlativo: '', baseImponible: '', igv: '', total: '',
});

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function SireReconciliationPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [bookType, setBookType] = useState<SireBookType>('RCE_COMPRAS');
  const [rceMode, setRceMode] = useState<'kardex' | 'manual'>('kardex');
  const [comprobantes, setComprobantes] = useState<ComprobanteDraft[]>([emptyVoucher()]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const companyRuc = useAuthStore((state) => state.activeCompany?.ruc ?? '');
  const { reconcile, loading, error, data, clear } = useSireReconciliation();
  const setSummary = useSireReconciliationStore((state) => state.setSummary);
  const clearSummary = useSireReconciliationStore((state) => state.clearSummary);

  useEffect(() => {
    clear();
    clearSummary();
  }, [clear, clearSummary, companyRuc]);

  const changePeriod = (value: string) => {
    setPeriod(value);
    setInputError(null);
    clear();
    clearSummary();
  };

  const changeBookType = (value: SireBookType) => {
    setBookType(value);
    setInputError(null);
    clear();
    clearSummary();
  };

  const changeComprobantes = (value: ComprobanteDraft[]) => {
    setComprobantes(value);
    setInputError(null);
    clear();
    clearSummary();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowFeedback(true);
    if (getPeriodFeedback(period)) {
      setInputError(getPeriodFeedback(period));
      return;
    }
    if (getRucFeedback(companyRuc)) {
      setInputError(getRucFeedback(companyRuc));
      return;
    }
    if (comprobantes.some((row) => !row.serie.trim() || !row.correlativo.trim())) {
      setInputError('Completa la serie y el correlativo de cada comprobante.');
      return;
    }
    const mapped = comprobantes.map((row) => ({
      tipoComprobante: row.tipoComprobante,
      serie: row.serie,
      correlativo: row.correlativo,
      baseImponible: row.baseImponible.trim() ? Number(row.baseImponible) : Number.NaN,
      igv: row.igv.trim() ? Number(row.igv) : Number.NaN,
      total: row.total.trim() ? Number(row.total) : Number.NaN,
    }));
    if (mapped.some((row) =>
      ![row.baseImponible, row.igv, row.total].every((amount) => Number.isFinite(amount) && amount >= 0),
    )) {
      setInputError('Completa cada importe con un número válido y no negativo.');
      return;
    }
    setInputError(null);
    clearSummary();
    void reconcile({ period, bookType, comprobantes: mapped })
      .then((result) => setSummary(result.period, result.bookType, result.summary))
      .catch((cause: unknown) => {
        setInputError(cause instanceof Error ? cause.message : 'No se pudo completar la conciliación.');
      });
  };

  return (
    <Page>
      <PageHeader
        title="Conciliación fiscal SIRE vs. Kardex"
        description="Cruce y conciliación de propuestas RCE y RVIE de SUNAT contra las compras, ventas y existencias físicas del ERP."
      />
      <SireHealthDashboard />
      <p className="text-xs text-muted-foreground">RUC de sesión: <span>{companyRuc}</span></p>

      {/* Selector de Libro y Modo de Conciliación */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6 pb-4 border-b border-border/50">
        <label className="block w-full max-w-xs space-y-1.5 text-xs font-semibold text-foreground">
          Libro Tributario SIRE
          <select
            aria-label="Libro a conciliar"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-normal"
            value={bookType}
            disabled={loading}
            onChange={(event) => {
              if (event.target.value === 'RVIE_VENTAS' || event.target.value === 'RCE_COMPRAS') {
                changeBookType(event.target.value);
              }
            }}
          >
            <option value="RCE_COMPRAS">RCE · Registro de Compras e Importaciones (Fase 4)</option>
            <option value="RVIE_VENTAS">RVIE · Registro de Ventas e Ingresos</option>
          </select>
        </label>

        {bookType === 'RCE_COMPRAS' && (
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 text-xs self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setRceMode('kardex')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                rceMode === 'kardex'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Cruce RCE vs. Kardex e Importaciones
            </button>
            <button
              type="button"
              onClick={() => setRceMode('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                rceMode === 'manual'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PenTool className="h-3.5 w-3.5" />
              Borrador Manual
            </button>
          </div>
        )}
      </div>

      {/* Renderizado condicional según modo */}
      {bookType === 'RCE_COMPRAS' && rceMode === 'kardex' ? (
        <SireRceKardexReconciliation period={period} />
      ) : (
        <>
          <SireProposalPanel
            period={period}
            bookType={bookType}
          />
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <SirePeriodFilter
              period={period}
              companyRuc={companyRuc}
              disabled={loading}
              showFeedback={showFeedback}
              onPeriodChange={changePeriod}
            />
            <SireComprobantesTable
              comprobantes={comprobantes}
              showFeedback={showFeedback}
              disabled={loading}
              onChange={changeComprobantes}
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
        </>
      )}
    </Page>
  );
}

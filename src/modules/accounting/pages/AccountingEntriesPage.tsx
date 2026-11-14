/**
 * Libro Diario (PCGE).
 *
 * La pantalla trabaja contra el backend real: no guarda asientos en
 * `localStorage` ni inventa una trama PLE cuando la API falla. El período es
 * seleccionable y los asientos muestran su origen (factura, importación o
 * manual), para que contabilidad pueda auditar de dónde salió cada línea.
 */
import { PeriodInput } from '@/components/common/PeriodInput';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { cachedGet } from '@/lib/offlineCache';
import { DoubleEntryBalanceCard } from '../components/DoubleEntryBalanceCard';
import { Toolbar } from '../components/AccountingUI';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Page,
  PageHeader,
  PageText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import {
  BookOpen,
  CheckCircle2,
  PlusCircle,
  TriangleAlert,
} from 'lucide-react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import ManualEntryModal from '../components/ManualEntryModal';
import { useAuthStore } from '@/stores/authStore';

interface AccountingLine {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
}

interface Entry {
  id: string;
  numeroAsiento: string;
  fechaContable: string;
  glosa: string;
  totalDebe: number;
  totalHaber: number;
  estaCuadrado: boolean;
  sourceModule: string;
  journalCode?: string;
  sourceReferenceId?: string;
  lines: AccountingLine[];
}

interface LineaAsientoBackend {
  accountCode?: string;
  account_code?: string;
  accountName?: string;
  account_name?: string;
  debitAmount?: number | string;
  debit?: number | string;
  creditAmount?: number | string;
  credit?: number | string;
}

interface AsientoBackend {
  id?: string;
  numeroAsiento?: string;
  entryNumber?: number;
  entry_number?: number;
  entryDate?: string;
  entry_date?: string;
  fechaContable?: string;
  glosa?: string;
  concept?: string;
  totalDebit?: number | string;
  total_debit?: number | string;
  totalDebe?: number | string;
  totalCredit?: number | string;
  total_credit?: number | string;
  totalHaber?: number | string;
  sourceModule?: string;
  source_module?: string;
  journalCode?: string;
  journal_code?: string;
  sourceReferenceId?: string;
  source_reference_id?: string;
  lines?: LineaAsientoBackend[];
  accounting_lines?: LineaAsientoBackend[];
}

const periodoActual = (): string => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

const numeroVisible = (
  entryNumber: number | undefined,
  period: string,
  index: number,
): string => {
  const correlativo = String(entryNumber ?? index + 1).padStart(3, '0');
  return `001-${period.replace('-', '')}-${correlativo}`;
};

const mapearAsiento = (
  item: AsientoBackend,
  period: string,
  index: number,
): Entry => {
  const lines = (item.lines ?? item.accounting_lines ?? []).map((linea) => ({
    accountCode: linea.accountCode ?? linea.account_code ?? '',
    accountName: linea.accountName ?? linea.account_name ?? '',
    debitAmount: Number(linea.debitAmount ?? linea.debit ?? 0),
    creditAmount: Number(linea.creditAmount ?? linea.credit ?? 0),
  }));

  const totalDebe =
    lines.length > 0
      ? lines.reduce((acc, linea) => acc + linea.debitAmount, 0)
      : Number(item.totalDebit ?? item.total_debit ?? item.totalDebe ?? 0);
  const totalHaber =
    lines.length > 0
      ? lines.reduce((acc, linea) => acc + linea.creditAmount, 0)
      : Number(item.totalCredit ?? item.total_credit ?? item.totalHaber ?? 0);

  return {
    id: String(item.id ?? `${period}-${index}`),
    numeroAsiento: numeroVisible(
      item.entryNumber ?? item.entry_number,
      period,
      index,
    ),
    fechaContable:
      item.entryDate ??
      item.entry_date ??
      item.fechaContable ??
      new Date().toISOString().slice(0, 10),
    glosa: item.glosa ?? item.concept ?? 'Asiento contable',
    totalDebe,
    totalHaber,
    estaCuadrado: Math.abs(totalDebe - totalHaber) <= 0.01,
    sourceModule: item.sourceModule ?? item.source_module ?? 'MANUAL',
    journalCode: item.journalCode ?? item.journal_code,
    sourceReferenceId: item.sourceReferenceId ?? item.source_reference_id,
    lines,
  };
};

const etiquetaOrigen = (source: string): string => {
  const etiquetas: Record<string, string> = {
    INVOICES: 'Facturación',
    M1_INVOICES: 'Facturación',
    CUSTOMS: 'Importaciones',
    M1_CUSTOMS: 'Importaciones',
    MANUAL: 'Manual',
  };
  return etiquetas[source] ?? source;
};

/** Tono del distintivo de origen: ayuda a separar visualmente los diarios. */
const tonoOrigen = (source: string): string => {
  if (source.includes('INVOICE')) return 'border-sky-600/30 bg-sky-500/5 text-sky-700 dark:text-sky-400';
  if (source.includes('CUSTOMS')) return 'border-violet-600/30 bg-violet-500/5 text-violet-700 dark:text-violet-400';
  return 'border-border text-muted-foreground';
};

type Diario = 'TODOS' | 'VEN' | 'COM' | 'CAJ' | 'OPV';

const diarioDe = (entry: Entry): Exclude<Diario, 'TODOS'> => {
  if (entry.journalCode && ['VEN', 'COM', 'CAJ', 'OPV', 'GAS'].includes(entry.journalCode)) {
    return entry.journalCode === 'GAS' ? 'OPV' : entry.journalCode as Exclude<Diario, 'TODOS'>;
  }
  const codigos = entry.lines.map((l) => l.accountCode);
  if (codigos.some((c) => c.startsWith('70'))) return 'VEN';
  if (codigos.some((c) => c.startsWith('10')) && codigos.some((c) => c.startsWith('12'))) return 'CAJ';
  if (codigos.some((c) => c.startsWith('60'))) return 'COM';
  return 'OPV';
};

const DIARIOS: Array<{ key: Diario; label: string }> = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'CAJ', label: 'Caja y bancos' },
  { key: 'COM', label: 'Compras' },
  { key: 'VEN', label: 'Ventas' },
  { key: 'OPV', label: 'Operaciones varias' },
];

export default function AccountingEntriesPage() {
  const { canCreateAccountingEntry } = useRolePermissions();
  const { activeCompany, user } = useAuthStore();
  const companyId = activeCompany?.tenantId ?? user?.companyId ?? '';

  const [period, setPeriod] = useState(periodoActual);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [diario, setDiario] = useState<Diario>('TODOS');
  const [detalle, setDetalle] = useState<Entry | null>(null);

  const {
    data: asientosBackend,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['accounting-entries', period],
    queryFn: () =>
      cachedGet(`accounting-entries-page:${period}`, async () => {
        const { data } = await apiClient.get<AsientoBackend[]>(
          '/accounting/entries',
          { params: { period } },
        );
        return data;
      }),
    enabled: Boolean(companyId),
  });

  const entries = useMemo(
    () =>
      (Array.isArray(asientosBackend) ? asientosBackend : []).map(
        (item, index) => mapearAsiento(item, period, index),
      ),
    [asientosBackend, period],
  );

  const filtrados = useMemo(
    () => diario === 'TODOS' ? entries : entries.filter((e) => diarioDe(e) === diario),
    [entries, diario],
  );
  const totalDebe = useMemo(
    () => entries.reduce((acc, entry) => acc + entry.totalDebe, 0),
    [entries],
  );
  const totalHaber = useMemo(
    () => entries.reduce((acc, entry) => acc + entry.totalHaber, 0),
    [entries],
  );

  const loadError = queryError
    ? 'No se pudieron cargar los asientos del período. Revisa la sesión y la conexión con el backend.'
    : null;

  return (
    <Page>
      <PageHeader
        title="Libro Diario (PCGE)"
        description="Asientos del período, origen del movimiento y validación de partida doble"
      >
        {canCreateAccountingEntry ? (
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusCircle aria-hidden="true" />
            Nuevo asiento
          </Button>
        ) : null}
      </PageHeader>

      <Toolbar>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="periodo-contable">
            Período contable
          </label>
          <PeriodInput id="periodo-contable" value={period} onChange={setPeriod} className="w-44" />
        </div>
        <p className="pb-2 text-xs text-muted-foreground">Se consultan solo los asientos de este período.</p>
      </Toolbar>

      {loadError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-lg border p-1 mb-4" role="tablist">
        {DIARIOS.map((d) => (
          <Button key={d.key} type="button" size="sm" role="tab" aria-selected={diario === d.key} variant={diario === d.key ? 'default' : 'ghost'} onClick={() => setDiario(d.key)}>
            {d.label}
            <Badge variant="outline" className="ml-1">{d.key === 'TODOS' ? entries.length : entries.filter((e) => diarioDe(e) === d.key).length}</Badge>
          </Button>
        ))}
      </div>

      <DoubleEntryBalanceCard totalDebe={totalDebe} totalHaber={totalHaber} />

      <Card flush>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">N° Asiento</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Fecha</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Glosa / Concepto</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Origen</TableHead>
              <TableHead align="right" className="text-[11px] font-semibold uppercase tracking-wider">Total Debe</TableHead>
              <TableHead align="right" className="text-[11px] font-semibold uppercase tracking-wider">Total Haber</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <PageText variant="muted">Cargando asientos...</PageText>
                </TableCell>
              </TableRow>
            ) : filtrados.length > 0 ? (
              filtrados.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => setDetalle(entry)}
                >
                  <TableCell className="whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-muted-foreground">{entry.numeroAsiento}</span>
                      {/* El estado va como icono para no robar ancho a la tabla. */}
                      {entry.estaCuadrado ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Cuadrado" />
                      ) : (
                        <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-destructive" aria-label="Descuadrado" />
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDateToPeru(entry.fechaContable)}</TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <span className="font-medium leading-snug">{entry.glosa}</span>
                      <div className="flex flex-wrap gap-1">
                        {entry.lines.slice(0, 3).map((linea, index) => (
                          <Badge key={`${entry.id}-${index}`} variant="outline" className="font-mono text-[10px] text-muted-foreground">
                            {linea.accountCode}
                          </Badge>
                        ))}
                        {entry.lines.length > 3 ? (
                          <span className="text-[10px] text-muted-foreground">+{entry.lines.length - 3}</span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={tonoOrigen(entry.sourceModule)}>
                      {etiquetaOrigen(entry.sourceModule)}
                    </Badge>
                  </TableCell>
                  <TableCell align="right" className="whitespace-nowrap font-medium tabular-nums">
                    {formatCurrency(entry.totalDebe, 'PEN')}
                  </TableCell>
                  <TableCell align="right" className="whitespace-nowrap font-medium tabular-nums">
                    {formatCurrency(entry.totalHaber, 'PEN')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <div className="flex flex-col items-center gap-2 py-8">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                      <BookOpen aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <PageText variant="muted">
                      {loadError
                        ? 'No se pudo cargar el período. Usa Refrescar para reintentar.'
                        : `No hay asientos contables en ${period}. Las facturas aceptadas por SUNAT aparecerán aquí automáticamente.`}
                    </PageText>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={Boolean(detalle)} onOpenChange={(open) => { if (!open) setDetalle(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Asiento {detalle?.numeroAsiento}</DialogTitle><DialogDescription>{detalle?.glosa} · {detalle ? formatDateToPeru(detalle.fechaContable) : ''}</DialogDescription></DialogHeader>
          {detalle ? <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Origen: {etiquetaOrigen(detalle.sourceModule)} {detalle.sourceReferenceId ? `· ${detalle.sourceReferenceId}` : ''}</p>
            <Table><TableHeader><TableRow><TableHead>Cuenta</TableHead><TableHead>Nombre</TableHead><TableHead align="right">Debe</TableHead><TableHead align="right">Haber</TableHead></TableRow></TableHeader><TableBody>{detalle.lines.map((l, i) => <TableRow key={i}><TableCell className="font-mono">{l.accountCode}</TableCell><TableCell>{l.accountName}</TableCell><TableCell align="right">{formatCurrency(l.debitAmount, 'PEN')}</TableCell><TableCell align="right">{formatCurrency(l.creditAmount, 'PEN')}</TableCell></TableRow>)}</TableBody></Table>
          </div> : null}
        </DialogContent>
      </Dialog>

      <ManualEntryModal
        open={isModalOpen}
        period={period}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => void refetch()}
      />
    </Page>
  );
}

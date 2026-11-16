/**
 * Libro Diario (PCGE).
 *
 * La pantalla trabaja contra el backend real: no guarda asientos en
 * `localStorage` ni inventa una trama PLE cuando la API falla. La lista se filtra
 * por rango de fechas y diario, y el detalle de cada asiento se abre desde su
 * icono para no cargar la tabla.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { cachedGet } from '@/lib/offlineCache';
import { EntryDetailDialog, type EntryDetail } from '../components/EntryDetailDialog';
import {
  Badge,
  Button,
  Card,
  Input,
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
  PlusCircle,
  SquareArrowOutUpRight,
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
  createdAt?: string;
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
  createdAt?: string;
  created_at?: string;
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
    createdAt: item.createdAt ?? item.created_at,
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

const dosDigitos = (valor: number) => String(valor).padStart(2, '0');

/** Primer día del mes en curso, en formato yyyy-mm-dd. */
const primerDiaDelMes = (): string => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-01`;
};

/** Último día del mes en curso. */
const ultimoDiaDelMes = (): string => {
  const hoy = new Date();
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return `${fin.getFullYear()}-${dosDigitos(fin.getMonth() + 1)}-${dosDigitos(fin.getDate())}`;
};

/** El backend consulta por período: se deduce del rango de fechas elegido. */
const periodoDeRango = (desde: string, hasta: string): string => {
  const referencia = desde || hasta;
  if (!/^\d{4}-\d{2}/.test(referencia)) return periodoActual();
  return referencia.slice(0, 7);
};

/**
 * Número de asiento legible: AS/2026/10/0001.
 *
 * El backend numera 001-202611-001; aquí se presenta en el formato de la lista
 * para que año, mes y correlativo se lean de un vistazo.
 */
const numeroFormateado = (entry: Entry): string => {
  const fecha = entry.fechaContable.slice(0, 10);
  const [anio, mes] = fecha.split('-');
  const correlativo = (entry.numeroAsiento.match(/(\d+)$/)?.[1] ?? '').padStart(4, '0');
  return `AS/${anio}/${mes}/${correlativo}`;
};

export default function AccountingEntriesPage() {
  const { canCreateAccountingEntry } = useRolePermissions();
  const { activeCompany, user } = useAuthStore();
  const companyId = activeCompany?.tenantId ?? user?.companyId ?? '';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [diario, setDiario] = useState<Diario>('TODOS');
  const [detalle, setDetalle] = useState<Entry | null>(null);
  const [desde, setDesde] = useState(() => primerDiaDelMes());
  const [hasta, setHasta] = useState(() => ultimoDiaDelMes());
  const [busqueda, setBusqueda] = useState('');

  // El periodo que se pide al backend se deduce del rango elegido: el diario ya
  // no tiene selector de periodo, ese se maneja en Períodos contables.
  const period = useMemo(() => periodoDeRango(desde, hasta), [desde, hasta]);

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

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return entries.filter((entry) => {
      if (diario !== 'TODOS' && diarioDe(entry) !== diario) return false;
      const fecha = entry.fechaContable.slice(0, 10);
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      if (texto) {
        const numero = numeroFormateado(entry).toLowerCase();
        if (!numero.includes(texto) && !entry.glosa.toLowerCase().includes(texto)) return false;
      }
      return true;
    });
  }, [entries, diario, desde, hasta, busqueda]);

  // El diario solo se muestra como columna cuando la pestaña es "Todos"; en las
  // demás ya se sabe qué diario se está mirando.
  const verColumnaDiario = diario === 'TODOS';
  const columnas = verColumnaDiario ? 7 : 6;

  const loadError = queryError
    ? 'No se pudieron cargar los asientos del período. Revisa la sesión y la conexión con el backend.'
    : null;

  return (
    <Page>
      <PageHeader
        title="Libro Diario (PCGE)"
        description="Registro y consulta de asientos del período"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Buscar asiento"
            placeholder="Buscar número o concepto…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-9 w-64"
          />
          {canCreateAccountingEntry ? (
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
              <PlusCircle aria-hidden="true" />
              Nuevo asiento
            </Button>
          ) : null}
        </div>
      </PageHeader>

      {loadError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1" role="tablist">
            {DIARIOS.map((d) => (
              <Button
                key={d.key}
                type="button"
                size="sm"
                role="tab"
                aria-selected={diario === d.key}
                variant={diario === d.key ? 'default' : 'ghost'}
                onClick={() => setDiario(d.key)}
              >
                {d.label}
                <Badge variant="outline" className="ml-1">
                  {d.key === 'TODOS' ? entries.length : entries.filter((e) => diarioDe(e) === d.key).length}
                </Badge>
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="diario-desde"
              aria-label="Desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="h-9 w-36"
            />
            <span className="text-xs text-muted-foreground">a</span>
            <Input
              id="diario-hasta"
              aria-label="Hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="h-9 w-36"
            />
            <span className="text-xs tabular-nums text-muted-foreground">{filtrados.length} asiento(s)</span>
          </div>
        </div>
      </Card>

      <Card flush>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Fecha contable</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">N° Asiento</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Concepto</TableHead>
              {verColumnaDiario ? (
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Diario</TableHead>
              ) : null}
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Responsable</TableHead>
              <TableHead align="right" className="text-[11px] font-semibold uppercase tracking-wider">Total</TableHead>
              <TableHead align="center" className="text-[11px] font-semibold uppercase tracking-wider">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columnas} align="center">
                  <PageText variant="muted">Cargando asientos...</PageText>
                </TableCell>
              </TableRow>
            ) : filtrados.length > 0 ? (
              filtrados.map((entry) => (
                <TableRow key={entry.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDateToPeru(entry.fechaContable)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-medium">{numeroFormateado(entry)}</span>
                      <button
                        type="button"
                        aria-label={`Ver detalle del asiento ${numeroFormateado(entry)}`}
                        onClick={() => setDetalle(entry)}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-[440px] truncate" title={entry.glosa}>{entry.glosa}</span>
                  </TableCell>
                  {verColumnaDiario ? (
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {DIARIOS.find((d) => d.key === diarioDe(entry))?.label ?? '—'}
                    </TableCell>
                  ) : null}
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {etiquetaOrigen(entry.sourceModule)}
                  </TableCell>
                  <TableCell align="right" className="whitespace-nowrap font-medium tabular-nums">
                    {formatCurrency(entry.totalDebe, 'PEN')}
                  </TableCell>
                  <TableCell align="center">
                    <Badge
                      variant="outline"
                      className={
                        entry.estaCuadrado
                          ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                          : 'border-destructive/30 bg-destructive/5 text-destructive'
                      }
                    >
                      {entry.estaCuadrado ? 'Registrado' : 'Descuadrado'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <div className="flex flex-col items-center gap-2 py-8">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                      <BookOpen aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <PageText variant="muted">
                      {loadError
                        ? 'No se pudo cargar el período. Usa Refrescar para reintentar.'
                        : 'No hay asientos en el rango de fechas elegido.'}
                    </PageText>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <EntryDetailDialog
        entry={
          detalle
            ? ({
                id: detalle.id,
                numero: numeroFormateado(detalle),
                fecha: detalle.fechaContable,
                glosa: detalle.glosa,
                origen: etiquetaOrigen(detalle.sourceModule),
                diario: DIARIOS.find((d) => d.key === diarioDe(detalle))?.label ?? null,
                referencia: detalle.sourceReferenceId,
                createdAt: detalle.createdAt,
                lineas: detalle.lines.map((linea) => ({
                  code: linea.accountCode,
                  name: linea.accountName,
                  debit: linea.debitAmount,
                  credit: linea.creditAmount,
                })),
              } satisfies EntryDetail)
            : null
        }
        open={Boolean(detalle)}
        onOpenChange={(open) => { if (!open) setDetalle(null); }}
      />

      <ManualEntryModal
        open={isModalOpen}
        period={period}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => void refetch()}
      />
    </Page>
  );
}

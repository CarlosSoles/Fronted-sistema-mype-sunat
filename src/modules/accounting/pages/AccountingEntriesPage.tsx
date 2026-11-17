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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/lib/axios';
import { cachedGet } from '@/lib/offlineCache';
import { EntryDetailDialog, type EntryDetail } from '../components/EntryDetailDialog';
import { RangoFechas } from '../components/AccountingUI';
import { etiquetaOrigen } from '../lib/origenLabels';
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
  Plus,
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
  /** Período contable del asiento; numera el correlativo. */
  period?: string;
  fechaContable: string;
  glosa: string;
  totalDebe: number;
  totalHaber: number;
  estaCuadrado: boolean;
  sourceModule: string;
  journalCode?: string;
  sourceReferenceId?: string;
  createdAt?: string;
  observation?: string;
  responsible?: string;
  status?: 'BORRADOR' | 'ASENTADO' | 'ANULADO';
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
  period?: string;
  journalCode?: string;
  journal_code?: string;
  sourceReferenceId?: string;
  source_reference_id?: string;
  createdAt?: string;
  created_at?: string;
  observation?: string;
  responsible?: string;
  status?: 'BORRADOR' | 'ASENTADO' | 'ANULADO';
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
    period: item.period,
    journalCode: item.journalCode ?? item.journal_code,
    sourceReferenceId: item.sourceReferenceId ?? item.source_reference_id,
    createdAt: item.createdAt ?? item.created_at,
    observation: item.observation,
    responsible: item.responsible,
    status: item.status,
    lines,
  };
};

type Diario = 'TODOS' | 'VEN' | 'COM' | 'CAJ' | 'OPV';

/**
 * Diario al que pertenece el asiento.
 *
 * `OPV` es el valor por defecto de la base, así que muchos asientos históricos
 * de ventas quedaron ahí aunque su diario real sea Ventas. Por eso, cuando el
 * código es genérico (OPV/GAS) o falta, se deduce por las cuentas: 70 ingresos,
 * 60 compras, 10 con 12 cobros. `IMP` son las importaciones y van a Compras.
 */
const diarioDe = (entry: Entry): Exclude<Diario, 'TODOS'> => {
  const codigo = entry.journalCode;
  if (codigo === 'VEN') return 'VEN';
  if (codigo === 'COM' || codigo === 'IMP') return 'COM';
  if (codigo === 'CAJ') return 'CAJ';

  const cuentas = entry.lines.map((l) => l.accountCode);
  if (cuentas.some((c) => c.startsWith('70'))) return 'VEN';
  if (cuentas.some((c) => c.startsWith('60'))) return 'COM';
  if (cuentas.some((c) => c.startsWith('10')) && cuentas.some((c) => c.startsWith('12'))) return 'CAJ';
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
/**
 * Origen visible: si el contador escribió un área en el alta manual ("Caja /
 * Ventas"), manda ese texto; si no, el módulo que generó el asiento.
 */
const etiquetaOrigenDe = (entry: Entry): string =>
  entry.responsible?.trim() || etiquetaOrigen(entry.sourceModule);

const numeroFormateado = (entry: Entry): string => {  // El correlativo se numera por período contable, no por la fecha: si se usa
  // la fecha y no coinciden, el número mostrado no existe en la base.
  const periodo = entry.period && /^\d{4}-\d{2}$/.test(entry.period)
    ? entry.period
    : entry.fechaContable.slice(0, 7);
  const [anio, mes] = periodo.split('-');
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
  const [busqueda, setBusqueda] = useState('');

  // Desde Períodos contables, "Ver asientos" llega con ?period=YYYY-MM.
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const periodoDeUrl = parametros.get('period');
  const [desde, setDesde] = useState(() =>
    periodoDeUrl && /^\d{4}-\d{2}$/.test(periodoDeUrl) ? `${periodoDeUrl}-01` : primerDiaDelMes(),
  );
  const [hasta, setHasta] = useState(() => {
    if (periodoDeUrl && /^\d{4}-\d{2}$/.test(periodoDeUrl)) {
      const [anio, mes] = periodoDeUrl.split('-').map(Number);
      const fin = new Date(anio, mes, 0);
      return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;
    }
    return ultimoDiaDelMes();
  });

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
    // El rango es inclusivo en ambos extremos y se compara como fecha
    // calendario (YYYY-MM-DD), sin pasar por zonas horarias.
    const rangoInvalido = Boolean(desde && hasta && desde > hasta);
    return entries.filter((entry) => {
      if (diario !== 'TODOS' && diarioDe(entry) !== diario) return false;
      if (!rangoInvalido) {
        const fecha = entry.fechaContable.slice(0, 10);
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
      }
      if (texto) {
        const numero = numeroFormateado(entry).toLowerCase();
        if (!numero.includes(texto) && !entry.glosa.toLowerCase().includes(texto)) return false;
      }
      return true;
    });
  }, [entries, diario, desde, hasta, busqueda]);

  const rangoInvalido = Boolean(desde && hasta && desde > hasta);

  // Siguiente correlativo por período, para mostrar la referencia completa en
  // el alta manual sin inventar el número.
  const proximoNumero = useMemo(() => {
    const ultimo = new Map<string, number>();
    for (const entry of entries) {
      const periodo = entry.period ?? entry.fechaContable.slice(0, 7);
      const correlativo = Number(entry.numeroAsiento.match(/(\d+)$/)?.[1] ?? 0);
      ultimo.set(periodo, Math.max(ultimo.get(periodo) ?? 0, correlativo));
    }
    return (fecha: string): string => {
      const periodo = fecha.slice(0, 7);
      const siguiente = (ultimo.get(periodo) ?? 0) + 1;
      return `AS/${periodo.replace('-', '/')}/${String(siguiente).padStart(4, '0')}`;
    };
  }, [entries]);

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
        title="Libro Diario"
        description="Registro y consulta de asientos del período"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Buscar asiento"
            placeholder="Buscar número o concepto…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-8 w-full sm:w-80"
          />
          {canCreateAccountingEntry ? (
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-foreground text-background hover:bg-foreground/90">
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
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

          <RangoFechas
            idPrefijo="diario"
            desde={desde}
            hasta={hasta}
            onDesde={setDesde}
            onHasta={setHasta}
          />
        </div>
        {rangoInvalido ? (
          <p className="mt-2 text-xs text-destructive">
            La fecha «Desde» no puede ser mayor que «Hasta»; el rango no se está aplicando.
          </p>
        ) : null}
      </Card>

      <Card flush className="overflow-hidden">
        {/* table-fixed + truncado: la tabla se ajusta al ancho disponible y el
            detalle largo se corta con puntos suspensivos en vez de desbordar. */}
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[9%] text-[11px] font-semibold uppercase tracking-wider">Fecha contable</TableHead>
              <TableHead className="w-[15%] text-[11px] font-semibold uppercase tracking-wider">N° Asiento</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Concepto</TableHead>
              {verColumnaDiario ? (
                <TableHead className="w-[11%] text-[11px] font-semibold uppercase tracking-wider">Diario</TableHead>
              ) : null}
              <TableHead className="w-[14%] text-[11px] font-semibold uppercase tracking-wider">Origen</TableHead>
              <TableHead align="right" className="w-[10%] text-[11px] font-semibold uppercase tracking-wider">Total</TableHead>
              <TableHead align="center" className="w-[9%] text-[11px] font-semibold uppercase tracking-wider">Estado</TableHead>
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
                <TableRow
                  key={entry.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir el detalle del asiento ${numeroFormateado(entry)}`}
                  onClick={(evento) => {
                    // No abrir mientras el usuario selecciona texto de la fila.
                    if (window.getSelection()?.toString()) return;
                    // Los controles internos tienen su propia acción.
                    if ((evento.target as HTMLElement).closest('button, a, input')) return;
                    setDetalle(entry);
                  }}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter') {
                      evento.preventDefault();
                      setDetalle(entry);
                    }
                  }}
                >
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDateToPeru(entry.fechaContable)}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 truncate">
                      <span className="truncate font-mono text-xs font-medium">{numeroFormateado(entry)}</span>
                      <button
                        type="button"
                        aria-label={`Ver detalle del asiento ${numeroFormateado(entry)}`}
                        onClick={() => setDetalle(entry)}
                        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block truncate" title={entry.glosa}>{entry.glosa}</span>
                  </TableCell>
                  {verColumnaDiario ? (
                    <TableCell className="truncate text-muted-foreground">
                      {DIARIOS.find((d) => d.key === diarioDe(entry))?.label ?? '—'}
                    </TableCell>
                  ) : null}
                  <TableCell className="truncate text-muted-foreground" title={etiquetaOrigenDe(entry)}>
                    {etiquetaOrigenDe(entry)}
                  </TableCell>
                  <TableCell align="right" className="whitespace-nowrap font-medium tabular-nums">
                    {formatCurrency(entry.totalDebe, 'PEN')}
                  </TableCell>
                  <TableCell align="center" className="whitespace-nowrap pr-4">
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
                origen: etiquetaOrigenDe(detalle),
                diario: DIARIOS.find((d) => d.key === diarioDe(detalle))?.label ?? null,
                referencia: detalle.sourceReferenceId,
                observacion: detalle.observation ?? null,
                creado: detalle.createdAt ?? null,
                responsable: detalle.responsible ?? null,
                anulado: detalle.status === 'ANULADO',
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
        onVerCuenta={(code) => navegar(`/accounting/mayor?cuenta=${encodeURIComponent(code)}`)}
      />

      <ManualEntryModal
        open={isModalOpen}
        period={period}
        proximoNumero={proximoNumero}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => void refetch()}
      />
    </Page>
  );
}

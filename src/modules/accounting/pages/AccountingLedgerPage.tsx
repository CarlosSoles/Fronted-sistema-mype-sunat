import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Download, Printer, SquareArrowOutUpRight } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Input,
  Page,
  PageHeader,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { Toolbar, RangoFechas } from '../components/AccountingUI';
import { EntryDetailDialog, type EntryDetail } from '../components/EntryDetailDialog';
import { accountingApi } from '../services/accountingApi';
import { AccountCombobox } from '../components/AccountCombobox';
import { formatearNumeroAsiento } from '../lib/numeroAsiento';
import { descargarCsv, descargarPdf, monto } from '../lib/exportReport';
import { etiquetaOrigen } from '../lib/origenLabels';
import type { LedgerMovement } from '../types/accounting.types';

const periodoActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

const money = (value: number) => `S/ ${value.toFixed(2)}`;

/**
 * Referencia del documento que originó el asiento.
 *
 * Se muestra solo si es legible: algunos asientos guardan un identificador
 * interno (`PAGO-GASTO-5fac8124-ed44-…`) que no aporta nada y ensancha la fila.
 */
const referenciaVisible = (referencia?: string | null): boolean => {
  if (!referencia) return false;
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(referencia)) return false;
  return referencia.length <= 32;
};



export default function AccountingLedgerPage() {
  const [period] = useState(periodoActual);
  // La guía contable enlaza aquí con ?cuenta=, así el código abre su mayor.
  const [parametros] = useSearchParams();
  const [accountCode, setAccountCode] = useState(() => parametros.get('cuenta') ?? '');
  /** Por defecto una cuenta de mayor muestra el consolidado de sus subcuentas. */
  const [soloDirectos, setSoloDirectos] = useState(false);
  // Rango visible del mayor. El período sigue siendo el que se pide al backend;
  // estas fechas solo recortan lo que ya llegó.
  const [desde, setDesde] = useState(() => `${periodoActual()}-01`);
  const [hasta, setHasta] = useState(() => {
    const hoy = new Date();
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;
  });

  /** Rango de cuentas opcional: consolida todo lo que cae entre dos códigos. */
  const [cuentaDesde, setCuentaDesde] = useState('');
  const [cuentaHasta, setCuentaHasta] = useState('');
  const [soloConMovimientos, setSoloConMovimientos] = useState(false);

  const { data: accounts = [] } = useQuery({
    // El mayor debe poder consultar cualquier cuenta, incluso una ya inactiva:
    // sus movimientos históricos siguen existiendo.
    queryKey: ['accounting-accounts', 'todas-mayor'],
    queryFn: () => accountingApi.getAccounts({ includeInactive: true }),
  });

  const { data: conMovimientos = [] } = useQuery({
    queryKey: ['accounting-accounts', 'con-movimientos', period],
    queryFn: () => accountingApi.getAccountsWithMovements(period),
    enabled: soloConMovimientos,
  });

  const cuentasOfrecidas = useMemo(() => {
    if (!soloConMovimientos) return accounts;
    const codigos = new Set(conMovimientos);
    return accounts.filter((cuenta) => codigos.has(cuenta.code));
  }, [accounts, conMovimientos, soloConMovimientos]);

  const hayRango = Boolean(cuentaDesde.trim() && cuentaHasta.trim());

  const { data, isLoading, error } = useQuery({
    queryKey: ['accounting-ledger', period, accountCode, soloDirectos, cuentaDesde, cuentaHasta],
    queryFn: () =>
      accountingApi.getLedger(period, hayRango ? '' : accountCode, {
        soloDirectos,
        ...(hayRango ? { desde: cuentaDesde, hasta: cuentaHasta } : {}),
      }),
    enabled: hayRango || Boolean(accountCode),
  });

  const movements = useMemo(() => {
    const rangoInvalido = Boolean(desde && hasta && desde > hasta);
    const todos = data?.movements ?? [];
    if (rangoInvalido) return todos;
    return todos.filter((movimiento) => {
      // Fecha calendario: se compara el texto, sin pasar por zonas horarias.
      const fecha = movimiento.entryDate.slice(0, 10);
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      return true;
    });
  }, [data, desde, hasta]);

  const [detalle, setDetalle] = useState<LedgerMovement | null>(null);

  // El detalle necesita las líneas del asiento, que el mayor no devuelve.
  // Se piden solo cuando se abre el panel.
  const { data: asientos = [], isFetching: cargandoAsientos } = useQuery({
    queryKey: ['accounting-entries', period],
    queryFn: () => accountingApi.getEntries(period),
    enabled: Boolean(detalle),
  });

  const asiento = useMemo(() => {
    if (!detalle) return null;

    // El mayor y la lista de asientos pueden no compartir el mismo id, así que
    // se busca por id y, si no aparece, por número de asiento.
    const porNumero = (item: (typeof asientos)[number]) => {
      const correlativo = Number(item.numeroAsiento?.match(/(\d+)$/)?.[1]);
      return correlativo === detalle.entryNumber;
    };
    const encontrado = asientos.find((item) => item.id === detalle.entryId) ?? asientos.find(porNumero);

    // Respaldo: el encabezado siempre sale del propio movimiento del mayor, de
    // modo que el detalle nunca queda en blanco mientras llegan las líneas.
    const numero = formatearNumeroAsiento(detalle.entryNumber, period);
    return {
      id: encontrado?.id ?? detalle.entryId,
      numero: encontrado?.numeroAsiento || numero,
      fecha: encontrado?.fechaContable || detalle.entryDate,
      glosa: encontrado?.glosa || detalle.glosa,
      origen: etiquetaOrigen(detalle.sourceModule),
      referencia: detalle.sourceReferenceId ?? '',
      lineas: (encontrado?.movimientos ?? []).map((movimiento) => ({
        code: movimiento.cuentaContable,
        name: movimiento.denominacion,
        debit: Number(movimiento.debe) || 0,
        credit: Number(movimiento.haber) || 0,
      })),
    } satisfies EntryDetail;
  }, [detalle, asientos, period]);

  return (
    <Page>
      <PageHeader
        title="Libro Mayor"
        description="Movimientos de la cuenta seleccionada, del más antiguo al más reciente"
      >
        <div className="flex gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const filas: (string | number)[][] = [
                  ['Fecha', 'Asiento', 'Descripción', 'Módulo', 'Referencia', 'Debe', 'Haber', 'Saldo'],
                ];
                if (data) filas.push(['', '', `Saldo inicial`, '', '', '', '', monto(data.openingBalance)]);
                for (const movimiento of movements) {
                  filas.push([
                    movimiento.entryDate,
                    formatearNumeroAsiento(movimiento.entryNumber, period),
                    movimiento.glosa,
                    etiquetaOrigen(movimiento.sourceModule),
                    movimiento.sourceReferenceId ?? '',
                    movimiento.debit.toFixed(2),
                    movimiento.credit.toFixed(2),
                    movimiento.saldo.toFixed(2),
                  ]);
                }
                filas.push([
                  '',
                  '',
                  'Totales',
                  '',
                  '',
                  (data?.totalDebit ?? 0).toFixed(2),
                  (data?.totalCredit ?? 0).toFixed(2),
                  (data?.closingBalance ?? 0).toFixed(2),
                ]);
                descargarCsv(`libro-mayor-${data?.accountCode ?? accountCode}-${period}`, filas);
              }}
              disabled={movements.length === 0}
            >
              <Download className="mr-1 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={descargarPdf} disabled={movements.length === 0}>
              <Printer className="mr-1 h-4 w-4" /> PDF
            </Button>
        </div>
      </PageHeader>

      <Toolbar
        status={
          <RangoFechas
            idPrefijo="mayor"
            desde={desde}
            hasta={hasta}
            onDesde={setDesde}
            onHasta={setHasta}
          />
        }
      >
        <div className="w-full sm:w-80">
          <AccountCombobox
            idPrefijo="mayor"
            accounts={cuentasOfrecidas}
            value={accountCode}
            onChange={setAccountCode}
            placeholder="Buscar cuenta por código o nombre"
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Desde cuenta
            <Input
              value={cuentaDesde}
              onChange={(evento) => setCuentaDesde(evento.target.value)}
              placeholder="10"
              className="h-8 w-24 font-mono"
              aria-label="Código de cuenta inicial"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Hasta cuenta
            <Input
              value={cuentaHasta}
              onChange={(evento) => setCuentaHasta(evento.target.value)}
              placeholder="19"
              className="h-8 w-24 font-mono"
              aria-label="Código de cuenta final"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={soloDirectos}
            onCheckedChange={setSoloDirectos}
            aria-label="Ver solo los movimientos propios de la cuenta"
          />
          Solo movimientos directos
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={soloConMovimientos}
            onCheckedChange={setSoloConMovimientos}
            aria-label="Ofrecer solo cuentas con movimientos en el período"
          />
          Solo cuentas con movimientos
        </label>
      </Toolbar>

      {error ? (
        <Card className="p-4 mb-4 text-sm text-destructive">
          No se pudo cargar el libro mayor. Verifica el período y la cuenta.
        </Card>
      ) : null}

      <Card flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Asiento</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Módulo / Referencia</TableHead>
              <TableHead align="right">Debe</TableHead>
              <TableHead align="right">Haber</TableHead>
              <TableHead align="right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!accountCode && !hayRango ? (
              <TableRow>
                <TableCell colSpan={7}>Selecciona una cuenta o un rango de cuentas para ver sus movimientos.</TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>Cargando movimientos…</TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  {hayRango
                    ? `Las cuentas del ${cuentaDesde} al ${cuentaHasta} no tienen movimientos entre ${desde} y ${hasta}.`
                    : `La cuenta ${data?.accountCode ?? accountCode} no tiene movimientos entre ${desde} y ${hasta}.`}
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={`${movement.entryId}-${movement.entryNumber}`} className="transition-colors hover:bg-muted/40">
                  <TableCell className="whitespace-nowrap tabular-nums">{movement.entryDate}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatearNumeroAsiento(movement.entryNumber, period)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Ver detalle del asiento ${formatearNumeroAsiento(movement.entryNumber, period)}`}
                        onClick={() => setDetalle(movement)}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">
                        <span className="font-mono text-muted-foreground">{movement.accountCode}</span>
                        {' · '}
                        {movement.accountName}
                      </p>
                      <p className="text-xs text-muted-foreground">{movement.glosa}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Badge variant="outline" className="w-fit text-muted-foreground">
                        {etiquetaOrigen(movement.sourceModule)}
                      </Badge>
                      {referenciaVisible(movement.sourceReferenceId) ? (
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
                          {movement.sourceReferenceId}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell align="right" className="whitespace-nowrap tabular-nums">
                    {movement.debit ? money(movement.debit) : '—'}
                  </TableCell>
                  <TableCell align="right" className="whitespace-nowrap tabular-nums">
                    {movement.credit ? money(movement.credit) : '—'}
                  </TableCell>
                  <TableCell align="right" className="whitespace-nowrap font-medium tabular-nums">{money(movement.saldo)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {data && accountCode ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {movements.length} movimiento(s) en el rango · {data.accountCode} {data.accountName}
          </span>
          <span className="font-semibold tabular-nums">
            Saldo final: {money(data.closingBalance)}
          </span>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          El saldo se acumula con cada movimiento del rango seleccionado.
        </p>
      )}

      <EntryDetailDialog
        entry={asiento}
        open={Boolean(detalle)}
        cargando={cargandoAsientos}
        onOpenChange={(open) => { if (!open) setDetalle(null); }}
      />
    </Page>
  );
}

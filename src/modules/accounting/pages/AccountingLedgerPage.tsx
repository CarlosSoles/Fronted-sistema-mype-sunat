import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronLeft, ChevronRight, Download, Printer, SquareArrowOutUpRight } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Page,
  PageHeader,
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
import { etiquetaOrigen } from '../lib/origenLabels';
import { descargarCsv, descargarPdf } from '../lib/exportReport';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import type { LedgerMovement } from '../types/accounting.types';

const POR_PAGINA = 50;

const periodoActual = (): string => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

const money = (valor: number): string => formatCurrency(Number(valor) || 0, 'PEN');

/**
 * Libro Mayor.
 *
 * Una cuenta de mayor muestra siempre el consolidado de sus subcuentas; el
 * detalle por cuenta se ve en la columna Cuenta. El saldo corrido arranca con el
 * saldo inicial del período, que se muestra como primera fila.
 */
export default function AccountingLedgerPage() {
  const [period] = useState(periodoActual);
  // La guía contable enlaza aquí con ?cuenta=, así el código abre su mayor.
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const [accountCode, setAccountCode] = useState(() => parametros.get('cuenta') ?? '');
  const [soloConMovimientos, setSoloConMovimientos] = useState(false);
  const [pagina, setPagina] = useState(1);

  const [desde, setDesde] = useState(() => `${periodoActual()}-01`);
  const [hasta, setHasta] = useState(() => {
    const hoy = new Date();
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;
  });

  const { data: accounts = [] } = useQuery({
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['accounting-ledger', period, accountCode],
    queryFn: () => accountingApi.getLedger(period, accountCode),
    enabled: Boolean(accountCode),
  });

  // Se vuelve a la primera página al cambiar de cuenta.
  useEffect(() => setPagina(1), [accountCode]);

  const movements = useMemo(() => {
    const rangoInvalido = Boolean(desde && hasta && desde > hasta);
    const todos = data?.movements ?? [];
    if (rangoInvalido) return todos;
    return todos.filter((movimiento) => {
      const fecha = movimiento.entryDate.slice(0, 10);
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      return true;
    });
  }, [data, desde, hasta]);

  const totalPaginas = Math.max(1, Math.ceil(movements.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = movements.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  /**
   * Vista agrupada por subcuenta.
   *
   * Solo tiene sentido cuando se consulta una cuenta de mayor con varias hijas:
   * se ordenan los movimientos por cuenta y se calcula el subtotal de cada una
   * sobre el rango visible.
   */
  const [agrupar, setAgrupar] = useState(false);
  const porSubcuenta = useMemo(() => {
    const grupos = new Map<string, { nombre: string; movimientos: LedgerMovement[]; debe: number; haber: number }>();
    for (const movimiento of movements) {
      const grupo = grupos.get(movimiento.accountCode) ?? {
        nombre: movimiento.accountName,
        movimientos: [],
        debe: 0,
        haber: 0,
      };
      grupo.movimientos.push(movimiento);
      grupo.debe += movimiento.debit;
      grupo.haber += movimiento.credit;
      grupos.set(movimiento.accountCode, grupo);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [movements]);

  const puedeAgrupar = (data?.subcuentas?.length ?? 0) > 1;

  const [detalle, setDetalle] = useState<LedgerMovement | null>(null);

  // El detalle necesita las líneas del asiento, que el mayor no devuelve.
  const { data: asientos = [], isFetching: cargandoAsientos } = useQuery({
    queryKey: ['accounting-entries', period],
    queryFn: () => accountingApi.getEntries(period),
    enabled: Boolean(detalle),
  });

  const asiento = useMemo(() => {
    if (!detalle) return null;
    const correlativo = Number(detalle.entryNumber);
    // El Diario expone las líneas en `lines`; el mayor solo trae el total.
    const encontrado =
      asientos.find((item) => item.id === detalle.entryId) ??
      asientos.find((item) => item.entryNumber === correlativo);

    return {
      id: encontrado?.id ?? detalle.entryId,
      numero: formatearNumeroAsiento(detalle.entryNumber, period),
      fecha: detalle.entryDate,
      glosa: encontrado?.glosa || detalle.glosa,
      origen: etiquetaOrigen(detalle.sourceModule),
      diario: encontrado?.journalCode ?? null,
      referencia: detalle.sourceReferenceId ?? '',
      observacion: encontrado?.observation ?? null,
      anulado: detalle.status === 'ANULADO',
      lineas: (encontrado?.lines ?? []).map((linea) => ({
        code: linea.accountCode,
        name: linea.accountName,
        debit: Number(linea.debitAmount) || 0,
        credit: Number(linea.creditAmount) || 0,
      })),
    } satisfies EntryDetail;
  }, [detalle, asientos, period]);

  const [exportando, setExportando] = useState(false);
  const [rangoDesde, setRangoDesde] = useState('');
  const [rangoHasta, setRangoHasta] = useState('');

  const exportarRango = useMutation({
    mutationFn: async (formato: 'csv' | 'pdf') => {
      if (formato === 'pdf') {
        descargarPdf();
        return 0;
      }
      const datos = await accountingApi.getLedger(period, '', { desde: rangoDesde.trim(), hasta: rangoHasta.trim() });
      const filas: (string | number)[][] = [
        ['Fecha', 'Asiento', 'Cuenta', 'Descripción', 'Módulo', 'Referencia', 'Debe', 'Haber', 'Saldo'],
        ['', '', '', `Saldo inicial`, '', '', '', '', datos.openingBalance.toFixed(2)],
      ];
      for (const movimiento of datos.movements) {
        filas.push([
          formatDateToPeru(movimiento.entryDate),
          formatearNumeroAsiento(movimiento.entryNumber, period),
          movimiento.accountCode,
          movimiento.glosa,
          etiquetaOrigen(movimiento.sourceModule),
          movimiento.sourceReferenceId ?? '',
          movimiento.debit.toFixed(2),
          movimiento.credit.toFixed(2),
          movimiento.saldo.toFixed(2),
        ]);
      }
      filas.push(['', '', '', 'Totales', '', '', datos.totalDebit.toFixed(2), datos.totalCredit.toFixed(2), datos.closingBalance.toFixed(2)]);
      descargarCsv(`mayor-${rangoDesde.trim()}-${rangoHasta.trim()}-${period}`, filas);
      return datos.movements.length;
    },
    onSuccess: () => setExportando(false),
  });

  const indicador = (saldo: number) => (saldo < 0 ? 'A' : 'D');

  return (
    <Page>
      <PageHeader
        title="Libro Mayor"
        description="Movimientos de la cuenta seleccionada, del más antiguo al más reciente"
      >
        <div className="flex gap-1.5 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setRangoDesde(''); setRangoHasta(''); setExportando(true); }}
            className="h-8"
          >
            <Download className="mr-1 h-4 w-4" /> Exportar
          </Button>
          <Button variant="outline" size="icon" onClick={descargarPdf} title="Imprimir o guardar en PDF" aria-label="Imprimir o guardar en PDF">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      <Toolbar
        status={
          <div className="flex flex-wrap items-center gap-3">
            {puedeAgrupar ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={agrupar}
                  onChange={(evento) => setAgrupar(evento.target.checked)}
                  className="h-3.5 w-3.5 rounded border-input"
                  aria-label="Agrupar por subcuenta"
                />
                Agrupar por subcuenta
              </label>
            ) : null}
            <RangoFechas idPrefijo="mayor" desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          </div>
        }
      >
        <div className="w-full sm:w-80">
          <AccountCombobox
            idPrefijo="mayor"
            accounts={cuentasOfrecidas}
            value={accountCode}
            onChange={setAccountCode}
            placeholder="Buscar cuenta por código o nombre"
            casilla={{
              etiqueta: 'Solo cuentas con movimientos en el período',
              checked: soloConMovimientos,
              onChange: setSoloConMovimientos,
            }}
          />
        </div>
      </Toolbar>

      {error ? (
        <Card className="mb-4 p-4 text-sm text-destructive">
          No se pudo cargar el libro mayor. Verifica el período y la cuenta.
        </Card>
      ) : null}

      <Card flush>
        {/* Anchos fijos: la descripción ocupa el espacio restante y no se
            desplaza según el largo de la glosa de cada asiento. */}
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-24">Fecha</TableHead>
              <TableHead className="w-36">Asiento</TableHead>
              <TableHead className="w-20">Cuenta</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-40">Módulo / Referencia</TableHead>
              <TableHead align="right" className="w-28">Debe</TableHead>
              <TableHead align="right" className="w-28">Haber</TableHead>
              <TableHead align="right" className="w-32">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!accountCode ? (
              <TableRow>
                <TableCell colSpan={8}>Selecciona una cuenta para ver sus movimientos.</TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>Cargando movimientos…</TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  La cuenta {data?.accountCode ?? accountCode} no tiene movimientos entre {formatDateToPeru(desde)} y{' '}
                  {formatDateToPeru(hasta)}.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {agrupar && puedeAgrupar
                  ? porSubcuenta.map(([codigo, grupo]) => (
                      <Fragment key={`grupo-${codigo}`}>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={5} className="text-xs font-medium">
                            <span className="font-mono">{codigo}</span> · {grupo.nombre}
                          </TableCell>
                          <TableCell align="right" className="tabular-nums text-xs">{money(grupo.debe)}</TableCell>
                          <TableCell align="right" className="tabular-nums text-xs">{money(grupo.haber)}</TableCell>
                          <TableCell align="right" className="tabular-nums text-xs">{money(grupo.debe - grupo.haber)}</TableCell>
                        </TableRow>
                        {grupo.movimientos.map((movement, indice) => (
                          <TableRow
                            key={`${movement.entryId}-${codigo}-${indice}`}
                            className="cursor-pointer transition-colors hover:bg-muted/40"
                            onClick={() => setDetalle(movement)}
                          >
                            <TableCell className="whitespace-nowrap pl-8 tabular-nums">{formatDateToPeru(movement.entryDate)}</TableCell>
                            <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                              {formatearNumeroAsiento(movement.entryNumber, period)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-mono text-xs">{movement.accountCode}</TableCell>
                            <TableCell className="text-xs">{movement.glosa}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{etiquetaOrigen(movement.sourceModule)}</TableCell>
                            <TableCell align="right" className="tabular-nums">{movement.debit ? money(movement.debit) : ''}</TableCell>
                            <TableCell align="right" className="tabular-nums">{movement.credit ? money(movement.credit) : ''}</TableCell>
                            <TableCell align="right" className="tabular-nums">{money(movement.saldo)}</TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))
                  : null}

                {!agrupar || !puedeAgrupar
                  ? visibles.map((movement, indice) => (
                  <TableRow
                    key={`${movement.entryId}-${movement.accountCode}-${indice}`}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => setDetalle(movement)}
                  >
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDateToPeru(movement.entryDate)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatearNumeroAsiento(movement.entryNumber, period)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Ver detalle del asiento ${formatearNumeroAsiento(movement.entryNumber, period)}`}
                          onClick={(evento) => { evento.stopPropagation(); setDetalle(movement); }}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                        </button>
                        {movement.status === 'ANULADO' ? (
                          <Badge variant="outline" className="border-destructive/30 text-destructive">Anulación</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{movement.accountCode}</TableCell>
                    <TableCell>
                      <p className="text-xs">{movement.glosa}</p>
                      <p className="text-[11px] text-muted-foreground">{movement.accountName}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="outline" className="w-fit text-muted-foreground">
                          {etiquetaOrigen(movement.sourceModule)}
                        </Badge>
                        {movement.sourceReferenceId && movement.sourceReferenceId.length <= 32 ? (
                          <span className="truncate font-mono text-[11px] text-muted-foreground">
                            {movement.sourceReferenceId}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell align="right" className="tabular-nums whitespace-nowrap">
                      {movement.debit ? money(movement.debit) : ''}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums whitespace-nowrap">
                      {movement.credit ? money(movement.credit) : ''}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums whitespace-nowrap">
                      {money(movement.saldo)}{' '}
                      <span className="text-[10px] text-muted-foreground">{indicador(movement.saldo)}</span>
                    </TableCell>
                  </TableRow>
                  ))
                  : null}

                {/* Totales al pie del reporte. */}
                <TableRow className="bg-muted/40 font-medium">
                  <TableCell colSpan={5} className="text-xs">Totales del período</TableCell>
                  <TableCell align="right" className="tabular-nums">{money(data?.totalDebit ?? 0)}</TableCell>
                  <TableCell align="right" className="tabular-nums">{money(data?.totalCredit ?? 0)}</TableCell>
                  <TableCell align="right" className="tabular-nums">{money(data?.closingBalance ?? 0)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </Card>

      {movements.length > POR_PAGINA ? (
        <div className="mt-3 flex items-center justify-end gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => setPagina((valor) => Math.max(1, valor - 1))} disabled={paginaActual === 1}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            Página {paginaActual} de {totalPaginas} · {movements.length} movimientos
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))}
            disabled={paginaActual === totalPaginas}
          >
            Siguiente <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        <BookOpen className="mr-1 inline h-3.5 w-3.5" />
        El saldo se acumula con cada movimiento del rango seleccionado y arranca con el saldo inicial del período.
      </p>

      <EntryDetailDialog
        entry={asiento}
        open={Boolean(detalle)}
        onOpenChange={(abierto) => { if (!abierto) setDetalle(null); }}
        cargando={cargandoAsientos}
        cuentaResaltada={accountCode}
        onVerCuenta={(code) => setAccountCode(code)}
        onVerEnDiario={() => { if (detalle) navegar(`/accounting/entries?period=${period}`); }}
      />

      {/* Exportar: permite acotar a un rango de cuentas sin ocupar la barra. */}
      <Dialog open={exportando} onOpenChange={setExportando}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar el libro mayor</DialogTitle>
            <DialogDescription>
              Exporta la cuenta seleccionada o un rango de cuentas (por ejemplo de 10 a 19).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <label className="space-y-1 text-xs font-medium">
              Desde cuenta
              <Input value={rangoDesde} onChange={(evento) => setRangoDesde(evento.target.value)} placeholder="10" className="font-mono" />
            </label>
            <label className="space-y-1 text-xs font-medium">
              Hasta cuenta
              <Input value={rangoHasta} onChange={(evento) => setRangoHasta(evento.target.value)} placeholder="19" className="font-mono" />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Si dejas ambos vacíos se exporta la cuenta seleccionada.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportando(false)}>Cancelar</Button>
            <Button
              variant="outline"
              onClick={() => { setExportando(false); descargarPdf(); }}
            >
              <Printer className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button
              onClick={() => exportarRango.mutate('csv')}
              disabled={exportarRango.isPending || Boolean((rangoDesde && !rangoHasta) || (!rangoDesde && rangoHasta))}
            >
              <Download className="mr-1 h-4 w-4" /> Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

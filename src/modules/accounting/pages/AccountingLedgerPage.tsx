import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Eye } from 'lucide-react';
import {
  Input,
  Badge,
  Card,
  Page,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { Toolbar } from '../components/AccountingUI';
import { EntryDetailDialog, type EntryDetail } from '../components/EntryDetailDialog';
import { accountingApi } from '../services/accountingApi';
import { PeriodInput } from '@/components/common/PeriodInput';
import type { LedgerMovement } from '../types/accounting.types';

const periodoActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

const money = (value: number) => `S/ ${value.toFixed(2)}`;

/** Traduce el origen técnico a una etiqueta legible. */
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



export default function AccountingLedgerPage() {
  const [period, setPeriod] = useState(periodoActual);
  const [accountCode, setAccountCode] = useState('');
  // Rango visible del mayor. El período sigue siendo el que se pide al backend;
  // estas fechas solo recortan lo que ya llegó.
  const [desde, setDesde] = useState(() => `${periodoActual()}-01`);
  const [hasta, setHasta] = useState(() => {
    const hoy = new Date();
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: () => accountingApi.getAccounts(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['accounting-ledger', period, accountCode],
    queryFn: () => accountingApi.getLedger(period, accountCode),
    enabled: Boolean(accountCode),
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
    const encontrado = asientos.find((item) => item.id === detalle.entryId);
    if (!encontrado) return null;
    return {
      id: encontrado.id,
      numero: encontrado.numeroAsiento,
      fecha: encontrado.fechaContable,
      glosa: encontrado.glosa,
      origen: etiquetaOrigen(detalle.sourceModule),
      referencia: detalle.entryId,
      lineas: (encontrado.movimientos ?? []).map((movimiento) => ({
        code: movimiento.cuentaContable,
        name: movimiento.denominacion,
        debit: Number(movimiento.debe) || 0,
        credit: Number(movimiento.haber) || 0,
      })),
    } satisfies EntryDetail;
  }, [detalle, asientos]);

  return (
    <Page>
      <PageHeader
        title="Libro Mayor"
        description="Movimientos de la cuenta seleccionada, del más antiguo al más reciente"
      />

      <Toolbar>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Período</label>
          <PeriodInput value={period} onChange={setPeriod} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="mayor-desde">Desde</label>
          <Input
            id="mayor-desde"
            type="date"
            className="w-40"
            value={desde}
            onChange={(evento) => setDesde(evento.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="mayor-hasta">Hasta</label>
          <Input
            id="mayor-hasta"
            type="date"
            className="w-40"
            value={hasta}
            onChange={(evento) => setHasta(evento.target.value)}
          />
        </div>
        <div className="min-w-72 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Cuenta contable</label>
          <Select value={accountCode || undefined} onValueChange={setAccountCode}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cuenta contable" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.code} value={account.code}>
                  {account.code} · {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Toolbar>

      {data ? (
        <div className="grid gap-3 md:grid-cols-4 mb-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Cuenta</p>
            <p className="font-mono font-semibold">{data.accountCode}</p>
            <p className="text-sm">{data.accountName}</p>
            {data.subcuentas && data.subcuentas.length > 1 ? (
              <p className="text-[11px] text-muted-foreground mt-1">
                Incluye subcuentas: {data.subcuentas.join(', ')}
              </p>
            ) : null}
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Debe</p>
            <p className="text-xl font-semibold">{money(data.totalDebit)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Haber</p>
            <p className="text-xl font-semibold">{money(data.totalCredit)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Saldo final</p>
            <p className="text-xl font-semibold">{money(data.closingBalance)}</p>
          </Card>
        </div>
      ) : null}

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
            {!accountCode ? (
              <TableRow>
                <TableCell colSpan={7}>Selecciona una cuenta para ver sus movimientos.</TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>Cargando movimientos…</TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No hay movimientos para esa cuenta en el período.</TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={`${movement.entryId}-${movement.entryNumber}`} className="transition-colors hover:bg-muted/40">
                  <TableCell className="whitespace-nowrap tabular-nums">{movement.entryDate}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Ver detalle del asiento ${movement.entryNumber}`}
                        onClick={() => setDetalle(movement)}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono text-xs text-muted-foreground">{movement.entryNumber}</span>
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
                      {movement.sourceReferenceId ? (
                        <span className="font-mono text-[11px] text-muted-foreground">
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

      {!accountCode ? (
        <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          El saldo inicial del período es S/ 0.00; el saldo se acumula con cada movimiento.
        </p>
      ) : null}

      <EntryDetailDialog
        entry={asiento}
        open={Boolean(detalle)}
        cargando={cargandoAsientos}
        onOpenChange={(open) => { if (!open) setDetalle(null); }}
      />
    </Page>
  );
}

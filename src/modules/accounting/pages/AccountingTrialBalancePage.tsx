import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Download, FileDown, TriangleAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Page,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { accountingApi } from '../services/accountingApi';
import { PeriodInput } from '@/components/common/PeriodInput';
import { descargarCsv, descargarPdf, importe } from '../lib/exportReport';

const periodoActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

/** Mes en curso con el día de corte incluido, para el botón "Mes actual". */
const mesActual = () => periodoActual();

export default function AccountingTrialBalancePage() {
  const [period, setPeriod] = useState(periodoActual);
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounting-trial-balance', period],
    queryFn: () => accountingApi.getTrialBalance(period),
  });

  const filas = useMemo(() => data?.rows ?? [], [data]);
  const cuadra = Boolean(data) && Math.abs((data?.totalDebit ?? 0) - (data?.totalCredit ?? 0)) < 0.01;
  const totalSaldoInicial = data?.totalOpening ?? filas.reduce((suma, fila) => suma + (fila.openingBalance ?? 0), 0);
  const totalSaldoFinal = data?.totalBalance ?? filas.reduce((suma, fila) => suma + fila.balance, 0);

  const exportar = () => {
    descargarCsv(`balance-comprobacion-${period}`, [
      ['CUENTA', 'DENOMINACIÓN', 'SALDO INICIAL', 'DEBE', 'HABER', 'SALDO FINAL'],
      ...filas.map((fila) => [
        fila.accountCode,
        fila.accountName,
        (fila.openingBalance ?? 0).toFixed(2),
        fila.debit.toFixed(2),
        fila.credit.toFixed(2),
        fila.balance.toFixed(2),
      ]),
      ['', 'TOTALES', totalSaldoInicial.toFixed(2), (data?.totalDebit ?? 0).toFixed(2), (data?.totalCredit ?? 0).toFixed(2), totalSaldoFinal.toFixed(2)],
    ]);
  };

  return (
    <Page className="reporte-imprimible">
      <PageHeader
        title="Balance de Comprobación"
        description="Saldos iniciales, movimiento del período y saldos finales por cuenta"
      />

      <Card className="mb-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Período</label>
            <PeriodInput value={period} onChange={setPeriod} />
          </div>
          <Button variant="outline" onClick={() => setPeriod(mesActual())}>Mes actual</Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportar} disabled={filas.length === 0}>
              <Download className="mr-1.5 h-4 w-4" /> Descargar CSV
            </Button>
            <Button variant="outline" onClick={descargarPdf} disabled={filas.length === 0}>
              <FileDown className="mr-1.5 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="mb-4 p-4 text-sm text-destructive">
          No se pudo cargar el balance. Verifica el período.
        </Card>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Período</span>
          <span className="font-semibold">{period}</span>
        </div>
        <Badge
          variant="outline"
          className={
            cuadra
              ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
              : 'border-destructive/30 bg-destructive/5 text-destructive'
          }
        >
          {cuadra ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <TriangleAlert className="mr-1 h-3.5 w-3.5" />}
          {!data ? 'Sin datos' : cuadra ? 'Cuadrado' : `Descuadre de ${importe(Math.abs((data.totalDebit) - (data.totalCredit)))}`}
        </Badge>
      </div>

      <Card flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead>Denominación</TableHead>
              <TableHead align="right">Saldo inicial</TableHead>
              <TableHead align="right">Debe</TableHead>
              <TableHead align="right">Haber</TableHead>
              <TableHead align="right">Saldo final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>Cargando balance…</TableCell>
              </TableRow>
            ) : filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>No hay movimientos en el período.</TableCell>
              </TableRow>
            ) : (
              filas.map((fila) => (
                <TableRow key={fila.accountCode} className="transition-colors hover:bg-muted/40">
                  <TableCell className="font-mono font-semibold">{fila.accountCode}</TableCell>
                  <TableCell>{fila.accountName}</TableCell>
                  <TableCell align="right" className="tabular-nums text-muted-foreground">
                    {importe(fila.openingBalance ?? 0)}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(fila.debit)}</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(fila.credit)}</TableCell>
                  <TableCell
                    align="right"
                    className={`tabular-nums font-medium ${fila.balance < 0 ? 'text-destructive' : ''}`}
                  >
                    {importe(fila.balance)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {filas.length > 0 ? (
            <tfoot>
              <TableRow className="border-t-2 border-foreground/20 bg-muted/40 font-semibold">
                <TableCell colSpan={2}>TOTALES</TableCell>
                <TableCell align="right" className="tabular-nums">{importe(totalSaldoInicial)}</TableCell>
                <TableCell align="right" className="tabular-nums">{importe(data?.totalDebit ?? 0)}</TableCell>
                <TableCell align="right" className="tabular-nums">{importe(data?.totalCredit ?? 0)}</TableCell>
                <TableCell align="right" className="tabular-nums">{importe(totalSaldoFinal)}</TableCell>
              </TableRow>
            </tfoot>
          ) : null}
        </Table>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        El saldo inicial acumula los períodos anteriores; el saldo final es saldo inicial + debe − haber.
        Un saldo negativo indica cuenta acreedora.
      </p>
    </Page>
  );
}

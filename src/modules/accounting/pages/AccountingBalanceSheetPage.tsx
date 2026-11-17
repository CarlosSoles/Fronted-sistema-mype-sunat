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
import type { BalanceSheetLine } from '../types/accounting.types';
import { descargarCsv, descargarPdf, importe } from '../lib/exportReport';

const periodoActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

const money = (valor: number) => `S/ ${importe(valor)}`;

/**
 * El PCGE separa el activo por su primera cifra: 1x es corriente y 2x/3x es no
 * corriente (existencias, inmovilizado). Se usa solo para el activo.
 */
const grupoDe = (codigo: string): 'corriente' | 'no corriente' => {
  const primero = codigo.charAt(0);
  return primero === '2' || primero === '3' ? 'no corriente' : 'corriente';
};

const sumar = (lineas: BalanceSheetLine[]) => lineas.reduce((suma, linea) => suma + linea.amount, 0);

export default function AccountingBalanceSheetPage() {
  const [period, setPeriod] = useState(periodoActual);
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounting-balance-sheet', period],
    queryFn: () => accountingApi.getBalanceSheet(period),
  });

  const activo = useMemo(() => data?.activo.lines ?? [], [data]);
  const pasivo = useMemo(() => data?.pasivo.lines ?? [], [data]);
  const patrimonio = useMemo(() => data?.patrimonio.lines ?? [], [data]);

  const activoCorriente = activo.filter((linea) => grupoDe(linea.accountCode) === 'corriente');
  const activoNoCorriente = activo.filter((linea) => grupoDe(linea.accountCode) === 'no corriente');

  const descuadre = data ? Math.abs(data.totalActivo - data.totalPasivoPatrimonio) : 0;
  const cuadra = Boolean(data) && descuadre < 0.01;

  const exportar = () => {
    const filas: (string | number)[][] = [
      ['BALANCE GENERAL', period],
      [],
      ['ACTIVO', '', ''],
      ...activo.map((linea) => [linea.accountCode, linea.accountName, linea.amount.toFixed(2)]),
      ['', 'TOTAL ACTIVO', (data?.totalActivo ?? 0).toFixed(2)],
      [],
      ['PASIVO', '', ''],
      ...pasivo.map((linea) => [linea.accountCode, linea.accountName, linea.amount.toFixed(2)]),
      [],
      ['PATRIMONIO', '', ''],
      ...patrimonio.map((linea) => [linea.accountCode, linea.accountName, linea.amount.toFixed(2)]),
      ['', 'Resultado del ejercicio', (data?.resultadoEjercicio ?? 0).toFixed(2)],
      ['', 'TOTAL PASIVO + PATRIMONIO', (data?.totalPasivoPatrimonio ?? 0).toFixed(2)],
    ];
    descargarCsv(`balance-general-${period}`, filas);
  };

  const seccion = (titulo: string, lineas: BalanceSheetLine[], total: number) => (
    <>
      <TableRow className="bg-muted/30">
        <TableCell colSpan={2} className="font-semibold">{titulo}</TableCell>
        <TableCell align="right" className="font-semibold tabular-nums">{importe(total)}</TableCell>
      </TableRow>
      {lineas.map((linea) => (
        <TableRow key={linea.accountCode} className="transition-colors hover:bg-muted/40">
          <TableCell className="font-mono text-xs text-muted-foreground">{linea.accountCode}</TableCell>
          <TableCell>{linea.accountName}</TableCell>
          <TableCell align="right" className="tabular-nums">{importe(linea.amount)}</TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <Page>
      <PageHeader
        title="Balance General"
        description="Estado de Situación Financiera conforme al PCGE (activo, pasivo y patrimonio)"
      />

      <Card className="mb-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="max-w-xs space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Período</label>
            <PeriodInput value={period} onChange={setPeriod} />
          </div>
          <Button variant="outline" onClick={() => setPeriod(periodoActual())}>Mes actual</Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportar} disabled={!data}>
              <Download className="mr-1.5 h-4 w-4" /> Descargar CSV
            </Button>
            <Button variant="outline" onClick={descargarPdf} disabled={!data}>
              <FileDown className="mr-1.5 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="mb-4 p-4 text-sm text-destructive">
          No se pudo cargar el balance general. Verifica el período.
        </Card>
      ) : null}

      {!cuadra && data ? (
        <Card className="mb-4 flex items-start gap-2 border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
          <span>
            Descuadre de <strong>{money(descuadre)}</strong>. Revisa asientos incompletos o cuentas mal clasificadas.
          </span>
        </Card>
      ) : data ? (
        <Badge variant="outline" className="mb-4 border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Activo = Pasivo + Patrimonio
        </Badge>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card flush>
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-semibold">Activo</h3>
            <span className="font-semibold tabular-nums">{money(data?.totalActivo ?? 0)}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead>Denominación</TableHead>
                <TableHead align="right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3}>Cargando…</TableCell></TableRow>
              ) : activo.length === 0 ? (
                <TableRow><TableCell colSpan={3}>Sin cuentas de activo.</TableCell></TableRow>
              ) : (
                <>
                  {seccion('Activo corriente', activoCorriente, sumar(activoCorriente))}
                  {activoNoCorriente.length > 0
                    ? seccion('Activo no corriente', activoNoCorriente, sumar(activoNoCorriente))
                    : null}
                  <TableRow className="border-t-2 border-foreground/20 bg-muted/50 font-semibold">
                    <TableCell colSpan={2}>TOTAL ACTIVO</TableCell>
                    <TableCell align="right" className="tabular-nums">{importe(data?.totalActivo ?? 0)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card flush>
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-semibold">Pasivo y Patrimonio</h3>
            <span className="font-semibold tabular-nums">{money(data?.totalPasivoPatrimonio ?? 0)}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead>Denominación</TableHead>
                <TableHead align="right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data ? (
                <TableRow><TableCell colSpan={3}>Sin datos.</TableCell></TableRow>
              ) : (
                <>
                  {seccion('Pasivo', pasivo, sumar(pasivo))}
                  {seccion('Patrimonio', patrimonio, sumar(patrimonio))}
                  <TableRow>
                    <TableCell className="font-mono text-xs text-muted-foreground">—</TableCell>
                    <TableCell>Resultado del ejercicio</TableCell>
                    <TableCell align="right" className="tabular-nums">{importe(data.resultadoEjercicio)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2 border-foreground/20 bg-muted/50 font-semibold">
                    <TableCell colSpan={2}>TOTAL PASIVO + PATRIMONIO</TableCell>
                    <TableCell align="right" className="tabular-nums">{importe(data.totalPasivoPatrimonio)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total activo</p>
          <p className="font-semibold tabular-nums">{money(data?.totalActivo ?? 0)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total pasivo</p>
          <p className="font-semibold tabular-nums">{money(sumar(pasivo))}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Patrimonio</p>
          <p className="font-semibold tabular-nums">{money(data?.totalPatrimonio ?? 0)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Resultado del ejercicio</p>
          <p className="font-semibold tabular-nums">{money(data?.resultadoEjercicio ?? 0)}</p>
        </Card>
      </div>
    </Page>
  );
}

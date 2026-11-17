import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileDown } from 'lucide-react';
import {
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

  /** "Hoy": lleva el reporte al mes en curso. */
  const irAlMesActual = () => setPeriod(periodoActual());
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounting-balance-sheet', period],
    queryFn: () => accountingApi.getBalanceSheet(period),
  });

  const activo = useMemo(() => data?.activo.lines ?? [], [data]);
  const pasivo = useMemo(() => data?.pasivo.lines ?? [], [data]);
  const patrimonio = useMemo(() => data?.patrimonio.lines ?? [], [data]);

  const activoCorriente = activo.filter((linea) => grupoDe(linea.accountCode) === 'corriente');
  const activoNoCorriente = activo.filter((linea) => grupoDe(linea.accountCode) === 'no corriente');

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
    <Page className="reporte-imprimible">
      <PageHeader
        title="Balance General"
        description="Estado de Situación Financiera conforme al PCGE (activo, pasivo y patrimonio)"
      />

      <Card className="mb-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3 p-3">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Al cierre de
          </label>
          <PeriodInput value={period} onChange={setPeriod} />
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={irAlMesActual}>Hoy</Button>
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

      <Card flush>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800 hover:bg-slate-800">
              <TableHead className="w-[12%] text-[10px] uppercase tracking-wider text-white">Cuenta</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-white">Descripción</TableHead>
              <TableHead align="right" className="w-[18%] text-[10px] uppercase tracking-wider text-white">Importe (S/)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3}>Cargando…</TableCell></TableRow>
            ) : !data ? (
              <TableRow><TableCell colSpan={3}>Sin datos.</TableCell></TableRow>
            ) : (
              <>
                <TableRow className="bg-muted/70 font-semibold">
                  <TableCell colSpan={2}>ACTIVO</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(data.totalActivo)}</TableCell>
                </TableRow>
                {seccion('Activo corriente', activoCorriente, sumar(activoCorriente))}
                {activoNoCorriente.length > 0
                  ? seccion('Activo no corriente', activoNoCorriente, sumar(activoNoCorriente))
                  : null}
                <TableRow className="border-t-2 border-foreground/20 bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>TOTAL ACTIVO</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(data.totalActivo)}</TableCell>
                </TableRow>

                <TableRow className="bg-muted/70 font-semibold">
                  <TableCell colSpan={2}>PASIVO</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(sumar(pasivo))}</TableCell>
                </TableRow>
                {seccion('Pasivo corriente', pasivo, sumar(pasivo))}
                <TableRow className="border-t-2 border-foreground/20 bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>TOTAL PASIVO</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(sumar(pasivo))}</TableCell>
                </TableRow>

                <TableRow className="bg-muted/70 font-semibold">
                  <TableCell colSpan={2}>PATRIMONIO</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(data.totalPatrimonio)}</TableCell>
                </TableRow>
                {seccion('Patrimonio neto', patrimonio, sumar(patrimonio))}
                <TableRow>
                  <TableCell className="font-mono text-xs text-muted-foreground">—</TableCell>
                  <TableCell>Resultado del ejercicio</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(data.resultadoEjercicio)}</TableCell>
                </TableRow>
                <TableRow className="border-t-2 border-foreground/20 bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>TOTAL PATRIMONIO</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(data.totalPatrimonio)}</TableCell>
                </TableRow>

                <TableRow className="bg-slate-800 font-semibold text-white hover:bg-slate-800">
                  <TableCell colSpan={2} className="text-white">TOTAL PASIVO Y PATRIMONIO</TableCell>
                  <TableCell align="right" className="tabular-nums text-white">
                    {importe(data.totalPasivoPatrimonio)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </Card>

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

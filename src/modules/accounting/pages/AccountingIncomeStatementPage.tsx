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
import { descargarCsv, descargarPdf, importe } from '../lib/exportReport';

const periodoActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

/** "2026-11" -> "NOVIEMBRE 2026". */
const nombreMes = (periodo: string): string => {
  const [anio, mes] = periodo.split('-').map(Number);
  if (!anio || !mes) return periodo;
  return new Date(anio, mes - 1, 1)
    .toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    .toUpperCase();
};

export default function AccountingIncomeStatementPage() {
  const [period, setPeriod] = useState(periodoActual);
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounting-income-statement', period],
    queryFn: () => accountingApi.getIncomeStatement(period),
  });

  const exportar = () => {
    if (!data) return;
    const filas: (string | number)[][] = [['CUENTA', 'CONCEPTO', 'IMPORTE']];
    for (const group of data.groups) {
      filas.push([group.key, group.label, group.total.toFixed(2)]);
      for (const line of group.lines) {
        filas.push([line.accountCode, line.accountName, line.amount.toFixed(2)]);
      }
    }
    filas.push(['', 'Resultado bruto', data.resultadoBruto.toFixed(2)]);
    filas.push(['', 'Resultado operativo', data.resultadoOperativo.toFixed(2)]);
    descargarCsv(`estado-resultados-${period}`, filas);
  };

  const totalFilas = useMemo(
    () => (data?.groups ?? []).reduce((suma, grupo) => suma + grupo.lines.length + 1, 0),
    [data],
  );

  return (
    <Page className="reporte-imprimible">
      <PageHeader
        title="Estado de Resultados"
        description="Ingresos, costo de ventas y gastos operativos del período"
      />

      <Card className="mb-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3 p-3">
          <div className="max-w-xs space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Período</label>
            <PeriodInput value={period} onChange={setPeriod} />
          </div>
          <Button variant="outline" onClick={() => setPeriod(periodoActual())}>Mes actual</Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportar} disabled={!data || totalFilas === 0}>
              <Download className="mr-1.5 h-4 w-4" /> Descargar CSV
            </Button>
            <Button variant="outline" onClick={descargarPdf} disabled={!data || totalFilas === 0}>
              <FileDown className="mr-1.5 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="mb-4 p-4 text-sm text-destructive">
          No se pudo cargar el estado de resultados. Verifica el período.
        </Card>
      ) : null}

      <div className="mb-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Estados financieros</p>
        <h2 className="text-lg font-semibold">Estado de Resultados</h2>
        <p className="text-xs text-muted-foreground">Período {nombreMes(period)} · Expresado en soles (PEN)</p>
      </div>

      <Card flush>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800 hover:bg-slate-800">
              <TableHead className="w-[14%] text-[10px] uppercase tracking-wider text-white">Cuenta</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-white">Concepto</TableHead>
              <TableHead align="right" className="w-[18%] text-[10px] uppercase tracking-wider text-white">Importe (S/)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3}>Cargando estado de resultados…</TableCell>
              </TableRow>
            ) : !data ? null : (
              <>
                {data.groups.map((group) => (
                  <GrupoResultado key={group.key} group={group} />
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>Resultado bruto</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(data.resultadoBruto)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>Resultado operativo</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(data.resultadoOperativo)}</TableCell>
                </TableRow>
                <TableRow className="bg-slate-800 font-semibold text-white hover:bg-slate-800">
                  <TableCell colSpan={2} className="text-white">Resultado del período</TableCell>
                  <TableCell align="right" className="tabular-nums text-white">
                    {importe(data.resultadoOperativo)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Los importes negativos corresponden a gastos y costos: se muestran con signo para que el resultado sea
        la suma directa de la columna.
      </p>
    </Page>
  );
}

/** Un grupo del estado de resultados con su subtotal y sus cuentas. */
function GrupoResultado({
  group,
}: {
  group: { key: string; label: string; total: number; lines: { accountCode: string; accountName: string; amount: number }[] };
}) {
  return (
    <>
      <TableRow className="bg-muted/70 font-semibold">
        <TableCell colSpan={2}>{group.label}</TableCell>
        <TableCell align="right" className="tabular-nums">{importe(group.total)}</TableCell>
      </TableRow>
      {group.lines.map((line) => (
        <TableRow key={line.accountCode} className="transition-colors hover:bg-muted/40">
          <TableCell className="font-mono text-xs text-muted-foreground">{line.accountCode}</TableCell>
          <TableCell>{line.accountName}</TableCell>
          <TableCell align="right" className={`tabular-nums ${line.amount < 0 ? 'text-destructive' : ''}`}>
            {importe(line.amount)}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

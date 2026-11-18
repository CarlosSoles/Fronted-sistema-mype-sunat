import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer } from 'lucide-react';
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

export default function AccountingIncomeStatementPage() {
  const [period, setPeriod] = useState(periodoActual);

  /** "Este mes": lleva el reporte al mes en curso. */
  const irAlMesActual = () => setPeriod(periodoActual());
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

  /**
   * Totales de las tarjetas del pie.
   *
   * No se calculan con nuevo backend: se suman los grupos que ya devuelve el
   * reporte, distinguiendo ingresos de gastos por su etiqueta.
   */
  const totales = useMemo(() => {
    const grupos = data?.groups ?? [];
    const esIngreso = (etiqueta: string) => /ingreso/i.test(etiqueta);
    const ingresos = grupos.filter((grupo) => esIngreso(grupo.label)).reduce((s, g) => s + g.total, 0);
    const gastos = grupos.filter((grupo) => !esIngreso(grupo.label) && /gasto/i.test(grupo.label)).reduce((s, g) => s + g.total, 0);
    return { ingresos, gastos };
  }, [data]);

  /**
   * Grupos del reporte separados por bloque.
   *
   * El backend devuelve los grupos en un orden propio; aquí se clasifican por su
   * etiqueta para poder intercalar la utilidad bruta y la de operación, como en
   * el formato contable. Lo que no se reconoce va al final, sin perderse.
   */
  const grupos = useMemo(() => {
    const todos = data?.groups ?? [];
    const ingresos: typeof todos = [];
    const costos: typeof todos = [];
    const gastos: typeof todos = [];
    const otros: typeof todos = [];
    for (const grupo of todos) {
      if (/ingreso/i.test(grupo.label)) ingresos.push(grupo);
      else if (/costo/i.test(grupo.label)) costos.push(grupo);
      else if (/gasto/i.test(grupo.label)) gastos.push(grupo);
      else otros.push(grupo);
    }
    return { ingresos, costos, gastos, otros };
  }, [data]);

  return (
    <Page className="reporte-imprimible">
      <PageHeader
        title="Estado de Resultados"
        description="Ingresos, costo de ventas y gastos operativos del período"
      />

      <Card className="mb-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3 p-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Período</label>
            <PeriodInput value={period} onChange={setPeriod} />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={irAlMesActual}>Este mes</Button>
            <Button variant="outline" onClick={exportar} disabled={!data || totalFilas === 0}>
              <Download className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon" onClick={descargarPdf} title="Imprimir o guardar en PDF" aria-label="Imprimir o guardar en PDF" disabled={!data || totalFilas === 0}>
              <Printer className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="mb-4 p-4 text-sm text-destructive">
          No se pudo cargar el estado de resultados. Verifica el período.
        </Card>
      ) : null}

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
                {/* Orden del reporte: ingresos, costo, utilidad bruta, gastos,
                    utilidad de operación y resultado del período. */}
                {grupos.ingresos.map((group) => (
                  <GrupoResultado key={group.key} group={group} />
                ))}
                {grupos.costos.map((group) => (
                  <GrupoResultado key={group.key} group={group} />
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>UTILIDAD BRUTA</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(data.resultadoBruto)}</TableCell>
                </TableRow>
                {grupos.gastos.map((group) => (
                  <GrupoResultado key={group.key} group={group} />
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>UTILIDAD DE OPERACIÓN</TableCell>
                  <TableCell align="right" className="tabular-nums">{importe(data.resultadoOperativo)}</TableCell>
                </TableRow>
                {grupos.otros.map((group) => (
                  <GrupoResultado key={group.key} group={group} />
                ))}
                <TableRow className="bg-slate-800 font-semibold text-white hover:bg-slate-800">
                  <TableCell colSpan={2} className="text-white">RESULTADO NETO DEL PERÍODO</TableCell>
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

      {data ? (
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Ingresos de operación</p>
            <p className="font-semibold tabular-nums">{importe(totales.ingresos)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Utilidad bruta</p>
            <p className="font-semibold tabular-nums">{importe(data.resultadoBruto)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Gastos de operación</p>
            <p className="font-semibold tabular-nums">{importe(totales.gastos)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Resultado neto</p>
            <p className="font-semibold tabular-nums">{importe(data.resultadoOperativo)}</p>
          </Card>
        </div>
      ) : null}
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

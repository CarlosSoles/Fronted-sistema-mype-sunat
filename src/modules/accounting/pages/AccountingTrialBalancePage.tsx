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
import { RangoFechas } from '../components/AccountingUI';
import type { TrialBalanceRow } from '../types/accounting.types';
import { descargarCsv, descargarPdf, importe } from '../lib/exportReport';

const periodoActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

/** "2026-11" -> "2026-11-30", último día del mes. */
const ultimoDiaDe = (periodo: string): string => {
  const [anio, mes] = periodo.split('-').map(Number);
  if (!anio || !mes) return `${periodo}-01`;
  const ultimo = new Date(anio, mes, 0).getDate();
  return `${periodo}-${String(ultimo).padStart(2, '0')}`;
};

/** "2026-11" -> "NOVIEMBRE 2026", para el encabezado de la columna. */
const nombreMes = (periodo: string): string => {
  const [anio, mes] = periodo.split('-').map(Number);
  if (!anio || !mes) return periodo;
  const fecha = new Date(anio, mes - 1, 1);
  return fecha.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase();
};

const ELEMENTOS: Record<string, string> = {
  '1': 'ACTIVO',
  '2': 'ACTIVO REALIZABLE',
  '3': 'ACTIVO INMOVILIZADO',
  '4': 'PASIVO',
  '5': 'PATRIMONIO',
  '6': 'GASTOS',
  '7': 'INGRESOS',
  '8': 'SALDOS INTERMEDIARIOS',
  '9': 'COSTOS DE PRODUCCIÓN',
};

/**
 * Saldo neto -> par debe/haber.
 *
 * Un saldo positivo es deudor (va al Debe) y uno negativo es acreedor (va al
 * Haber). Así el balance muestra las dos columnas sin inventar importes.
 */
const par = (saldo: number): { debe: number; haber: number } =>
  saldo >= 0 ? { debe: saldo, haber: 0 } : { debe: 0, haber: Math.abs(saldo) };

interface Bloque {
  codigo: string;
  titulo: string;
  filas: TrialBalanceRow[];
}

export default function AccountingTrialBalancePage() {
  const [period, setPeriod] = useState(periodoActual);
  const [desde, setDesde] = useState(() => `${periodoActual()}-01`);
  const [hasta, setHasta] = useState(() => ultimoDiaDe(periodoActual()));
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounting-trial-balance', period],
    queryFn: () => accountingApi.getTrialBalance(period),
  });

  const filas = useMemo(() => data?.rows ?? [], [data]);

  // Agrupación por elemento del PCGE (primer dígito), como en el reporte oficial.
  const bloques = useMemo<Bloque[]>(() => {
    const porElemento = new Map<string, TrialBalanceRow[]>();
    for (const fila of filas) {
      const codigo = fila.accountCode.charAt(0);
      const lista = porElemento.get(codigo) ?? [];
      lista.push(fila);
      porElemento.set(codigo, lista);
    }
    return [...porElemento.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([codigo, lista]) => ({
        codigo,
        titulo: ELEMENTOS[codigo] ?? `ELEMENTO ${codigo}`,
        filas: lista,
      }));
  }, [filas]);

  const totales = useMemo(() => {
    const sumar = (obtener: (fila: TrialBalanceRow) => number) =>
      filas.reduce((suma, fila) => suma + obtener(fila), 0);
    const inicialDebe = sumar((f) => par(f.openingBalance ?? 0).debe);
    const inicialHaber = sumar((f) => par(f.openingBalance ?? 0).haber);
    const finalDebe = sumar((f) => par(f.balance).debe);
    const finalHaber = sumar((f) => par(f.balance).haber);
    return {
      inicialDebe,
      inicialHaber,
      debe: data?.totalDebit ?? sumar((f) => f.debit),
      haber: data?.totalCredit ?? sumar((f) => f.credit),
      finalDebe,
      finalHaber,
      diferencia: finalDebe - finalHaber,
    };
  }, [filas, data]);

  const cuadra = Math.abs(totales.debe - totales.haber) < 0.01;
  const conActividad = filas.filter((fila) => fila.debit !== 0 || fila.credit !== 0 || (fila.openingBalance ?? 0) !== 0).length;

  const exportar = () => {
    const encabezado = ['CUENTA', 'DESCRIPCIÓN', 'INICIAL DEBE', 'INICIAL HABER', 'DEBE', 'HABER', 'FINAL DEBE', 'FINAL HABER'];
    const cuerpo = bloques.flatMap((bloque) => [
      [bloque.titulo, '', '', '', '', '', '', ''],
      ...bloque.filas.map((fila) => {
        const inicial = par(fila.openingBalance ?? 0);
        const final = par(fila.balance);
        return [
          fila.accountCode,
          fila.accountName,
          inicial.debe.toFixed(2),
          inicial.haber.toFixed(2),
          fila.debit.toFixed(2),
          fila.credit.toFixed(2),
          final.debe.toFixed(2),
          final.haber.toFixed(2),
        ];
      }),
    ]);
    descargarCsv(`balance-comprobacion-${period}`, [
      encabezado,
      ...cuerpo,
      [
        'TOTAL',
        '',
        totales.inicialDebe.toFixed(2),
        totales.inicialHaber.toFixed(2),
        totales.debe.toFixed(2),
        totales.haber.toFixed(2),
        totales.finalDebe.toFixed(2),
        totales.finalHaber.toFixed(2),
      ],
    ]);
  };

  return (
    <Page className="reporte-imprimible">
      <PageHeader
        title="Balance de Comprobación"
        description="Saldos iniciales, movimiento del período y saldos finales por elemento del plan contable"
      />

      <Card className="mb-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3 p-3">
          <RangoFechas
            idPrefijo="balance"
            desde={desde}
            hasta={hasta}
            onDesde={(valor) => {
              setDesde(valor);
              if (valor) setPeriod(valor.slice(0, 7));
            }}
            onHasta={(valor) => {
              setHasta(valor);
              if (valor) setPeriod(valor.slice(0, 7));
            }}
          />
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

      <Card flush>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-slate-800 hover:bg-slate-800">
              <TableHead className="w-[8%] text-[10px] uppercase tracking-wider text-white">Cuenta</TableHead>
              <TableHead className="w-[20%] text-[10px] uppercase tracking-wider text-white">Descripción</TableHead>
              <TableHead align="center" colSpan={2} className="border-l border-white/20 text-[10px] uppercase tracking-wider text-white">
                Balance inicial
              </TableHead>
              <TableHead align="center" colSpan={2} className="border-l border-white/20 text-[10px] uppercase tracking-wider text-white">
                {nombreMes(period)}
              </TableHead>
              <TableHead align="center" colSpan={2} className="border-l border-white/20 text-[10px] uppercase tracking-wider text-white">
                Balance final
              </TableHead>
            </TableRow>
            <TableRow className="bg-slate-700 hover:bg-slate-700">
              <TableHead />
              <TableHead />
              <TableHead align="right" className="border-l border-white/20 text-[10px] uppercase tracking-wider text-white/90">Debe</TableHead>
              <TableHead align="right" className="text-[10px] uppercase tracking-wider text-white/90">Haber</TableHead>
              <TableHead align="right" className="border-l border-white/20 text-[10px] uppercase tracking-wider text-white/90">Debe</TableHead>
              <TableHead align="right" className="text-[10px] uppercase tracking-wider text-white/90">Haber</TableHead>
              <TableHead align="right" className="border-l border-white/20 text-[10px] uppercase tracking-wider text-white/90">Debe</TableHead>
              <TableHead align="right" className="text-[10px] uppercase tracking-wider text-white/90">Haber</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8}>Cargando balance…</TableCell></TableRow>
            ) : filas.length === 0 ? (
              <TableRow><TableCell colSpan={8}>No hay movimientos en el período.</TableCell></TableRow>
            ) : (
              bloques.map((bloque) => {
                const sumar = (obtener: (fila: TrialBalanceRow) => number) =>
                  bloque.filas.reduce((suma, fila) => suma + obtener(fila), 0);
                const inicialD = sumar((f) => par(f.openingBalance ?? 0).debe);
                const inicialH = sumar((f) => par(f.openingBalance ?? 0).haber);
                const debe = sumar((f) => f.debit);
                const haber = sumar((f) => f.credit);
                const finalD = sumar((f) => par(f.balance).debe);
                const finalH = sumar((f) => par(f.balance).haber);
                return (
                  <FragmentoDeBloque
                    key={bloque.codigo}
                    bloque={bloque}
                    subtotal={{ inicialD, inicialH, debe, haber, finalD, finalH }}
                  />
                );
              })
            )}
          </TableBody>
          {filas.length > 0 ? (
            <tfoot>
              <TableRow className="border-t-2 border-foreground/30 bg-muted/60 font-semibold">
                <TableCell colSpan={2}>TOTAL</TableCell>
                <TableCell align="right" className="tabular-nums">{importe(totales.inicialDebe)}</TableCell>
                <TableCell align="right" className="tabular-nums">{importe(totales.inicialHaber)}</TableCell>
                <TableCell align="right" className="tabular-nums">{importe(totales.debe)}</TableCell>
                <TableCell align="right" className="tabular-nums">{importe(totales.haber)}</TableCell>
                <TableCell align="right" className="tabular-nums">{importe(totales.finalDebe)}</TableCell>
                <TableCell align="right" className="tabular-nums">{importe(totales.finalHaber)}</TableCell>
              </TableRow>
            </tfoot>
          ) : null}
        </Table>
      </Card>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Debe final</p>
          <p className="font-semibold tabular-nums">{importe(totales.finalDebe)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Haber final</p>
          <p className="font-semibold tabular-nums">{importe(totales.finalHaber)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Cuentas con actividad</p>
          <p className="font-semibold tabular-nums">{conActividad}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Diferencia final</p>
          <p className={`font-semibold tabular-nums ${cuadra ? '' : 'text-destructive'}`}>
            {importe(totales.diferencia)}
          </p>
        </Card>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        El balance inicial es el acumulado de los períodos anteriores y el final es balance inicial + debe − haber.
        Los saldos acreedores se muestran en la columna Haber.
      </p>
    </Page>
  );
}

/** Bloque de un elemento del PCGE: fila de título con subtotales y sus cuentas. */
function FragmentoDeBloque({
  bloque,
  subtotal,
}: {
  bloque: Bloque;
  subtotal: { inicialD: number; inicialH: number; debe: number; haber: number; finalD: number; finalH: number };
}) {
  return (
    <>
      <TableRow className="bg-muted/70 font-semibold">
        <TableCell className="font-mono">{bloque.codigo}</TableCell>
        <TableCell colSpan={1}>{bloque.titulo}</TableCell>
        <TableCell align="right" className="tabular-nums">{importe(subtotal.inicialD)}</TableCell>
        <TableCell align="right" className="tabular-nums">{importe(subtotal.inicialH)}</TableCell>
        <TableCell align="right" className="tabular-nums">{importe(subtotal.debe)}</TableCell>
        <TableCell align="right" className="tabular-nums">{importe(subtotal.haber)}</TableCell>
        <TableCell align="right" className="tabular-nums">{importe(subtotal.finalD)}</TableCell>
        <TableCell align="right" className="tabular-nums">{importe(subtotal.finalH)}</TableCell>
      </TableRow>
      {bloque.filas.map((fila) => {
        const inicial = par(fila.openingBalance ?? 0);
        const final = par(fila.balance);
        return (
          <TableRow key={fila.accountCode} className="transition-colors hover:bg-muted/40">
            <TableCell className="font-mono text-xs text-muted-foreground">{fila.accountCode}</TableCell>
            <TableCell className="truncate" title={fila.accountName}>{fila.accountName}</TableCell>
            <TableCell align="right" className="tabular-nums">{inicial.debe ? importe(inicial.debe) : '—'}</TableCell>
            <TableCell align="right" className="tabular-nums">{inicial.haber ? importe(inicial.haber) : '—'}</TableCell>
            <TableCell align="right" className="tabular-nums">{fila.debit ? importe(fila.debit) : '—'}</TableCell>
            <TableCell align="right" className="tabular-nums">{fila.credit ? importe(fila.credit) : '—'}</TableCell>
            <TableCell align="right" className="tabular-nums">{final.debe ? importe(final.debe) : '—'}</TableCell>
            <TableCell align="right" className="tabular-nums">{final.haber ? importe(final.haber) : '—'}</TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

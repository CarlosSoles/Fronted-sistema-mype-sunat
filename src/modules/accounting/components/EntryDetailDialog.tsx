import { CheckCircle2, ExternalLink, Scale, TriangleAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';

/** Asiento normalizado para el detalle, venga del diario o del mayor. */
export interface EntryDetail {
  id: string;
  numero: string;
  fecha: string;
  glosa: string;
  origen: string;
  diario?: string | null;
  referencia?: string | null;
  observacion?: string | null;
  creado?: string | null;
  responsable?: string | null;
  anulado?: boolean;
  lineas: Array<{ code: string; name: string; debit: number; credit: number }>;
}

const money = (valor: number) => formatCurrency(Number(valor) || 0, 'PEN');

/** Nombre legible del diario contable. */
const NOMBRE_DIARIO: Record<string, string> = {
  VEN: 'Ventas',
  COM: 'Compras',
  CAJ: 'Caja y bancos',
  OPV: 'Operaciones varias',
  IMP: 'Importaciones',
  GAS: 'Gastos',
};

const fechaHora = (valor?: string | null): string => {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${formatDateToPeru(valor)} ${fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Detalle de un asiento.
 *
 * Componente único para el Libro Diario y el Libro Mayor: la estructura, los
 * importes y el indicador de cuadre son los mismos en ambos libros. Las tarjetas
 * sin dato no se muestran, en lugar de dejar guiones vacíos.
 */
export function EntryDetailDialog({
  entry,
  open,
  onOpenChange,
  cargando = false,
  /** Cuenta desde la que se abrió (mayor), para resaltar su línea. */
  cuentaResaltada,
  /** Navegación al mayor de una cuenta. */
  onVerCuenta,
  /** Navegación al Libro Diario cuando se abre desde el mayor. */
  onVerEnDiario,
}: {
  entry: EntryDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cargando?: boolean;
  cuentaResaltada?: string;
  onVerCuenta?: (code: string) => void;
  onVerEnDiario?: () => void;
}) {
  const lineas = entry?.lineas ?? [];
  const totalDebe = lineas.reduce((acc, linea) => acc + linea.debit, 0);
  const totalHaber = lineas.reduce((acc, linea) => acc + linea.credit, 0);
  const sinLineas = lineas.length === 0;
  const cuadrado = !sinLineas && Math.abs(totalDebe - totalHaber) <= 0.01;

  const tarjetas = entry
    ? [
        { etiqueta: 'Referencia', valor: entry.referencia },
        { etiqueta: 'Fecha contable', valor: entry.fecha ? formatDateToPeru(entry.fecha) : '' },
        { etiqueta: 'Origen', valor: entry.origen },
        { etiqueta: 'Diario contable', valor: entry.diario ? (NOMBRE_DIARIO[entry.diario] ?? entry.diario) : '' },
        { etiqueta: 'Creado', valor: fechaHora(entry.creado) },
        { etiqueta: 'Responsable', valor: entry.responsable },
      ].filter((tarjeta) => Boolean(tarjeta.valor && String(tarjeta.valor).trim()))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {cargando ? (
          <p className="py-10 text-sm text-muted-foreground">Cargando asiento…</p>
        ) : entry ? (
          <>
            <DialogHeader className="gap-1">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <DialogTitle className="font-mono text-base">{entry.numero}</DialogTitle>
                <Badge
                  variant="outline"
                  className={
                    entry.anulado
                      ? 'border-destructive/30 bg-destructive/5 text-destructive'
                      : 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                  }
                >
                  {entry.anulado ? 'Anulado' : 'Registrado'}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatDateToPeru(entry.fecha)}</span>
              </div>
              <DialogDescription className="sr-only">
                Detalle del asiento {entry.numero}
              </DialogDescription>
            </DialogHeader>

            {/* Ficha del asiento: solo se muestran los datos que existen. */}
            {tarjetas.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {tarjetas.map((tarjeta) => (
                  <div key={tarjeta.etiqueta} className="rounded-md border p-2">
                    <p className="text-[11px] text-muted-foreground">{tarjeta.etiqueta}</p>
                    <p className="truncate text-xs font-medium" title={String(tarjeta.valor)}>
                      {tarjeta.valor}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="space-y-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Concepto</p>
                <p className="text-sm">{entry.glosa || '—'}</p>
              </div>
              {entry.observacion ? (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Observación</p>
                  <p className="text-sm">{entry.observacion}</p>
                </div>
              ) : null}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Cuenta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead align="right" className="w-28">Debe</TableHead>
                  <TableHead align="right" className="w-28">Haber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sinLineas ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <span className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <TriangleAlert className="h-4 w-4" />
                        Este asiento no tiene líneas registradas; no se puede comprobar el cuadre.
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  lineas.map((linea, indice) => {
                    const resaltada = cuentaResaltada && linea.code === cuentaResaltada;
                    return (
                      <TableRow
                        key={`${linea.code}-${indice}`}
                        className={resaltada ? 'bg-muted/60' : undefined}
                      >
                        <TableCell className="whitespace-nowrap">
                          {onVerCuenta ? (
                            <button
                              type="button"
                              onClick={() => onVerCuenta(linea.code)}
                              className="font-mono text-xs font-semibold underline-offset-2 hover:underline"
                              title={`Ver el libro mayor de ${linea.code}`}
                            >
                              {linea.code}
                            </button>
                          ) : (
                            <span className="font-mono text-xs font-semibold">{linea.code}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{linea.name}</TableCell>
                        <TableCell align="right" className="tabular-nums whitespace-nowrap">
                          {linea.debit ? money(linea.debit) : ''}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums whitespace-nowrap">
                          {linea.credit ? money(linea.credit) : ''}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div className="flex flex-wrap gap-4 text-xs">
                <span>
                  Total debe: <strong className="tabular-nums">{money(totalDebe)}</strong>
                </span>
                <span>
                  Total haber: <strong className="tabular-nums">{money(totalHaber)}</strong>
                </span>
              </div>
              {sinLineas ? (
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                  Sin líneas
                </Badge>
              ) : (
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${
                    cuadrado ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                  }`}
                >
                  {cuadrado ? <CheckCircle2 className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
                  {cuadrado ? 'Cuadra' : 'No cuadra'}
                </span>
              )}
            </div>

            {onVerEnDiario || (entry.referencia && onVerCuenta) ? (
              <div className="flex flex-wrap justify-end gap-2 print:hidden">
                {entry.referencia && onVerCuenta ? (
                  <Button variant="ghost" size="sm" onClick={() => onVerCuenta(entry.referencia!.split('-')[0])}>
                    <ExternalLink className="mr-1 h-4 w-4" /> Ver documento de origen
                  </Button>
                ) : null}
                {onVerEnDiario ? (
                  <Button variant="ghost" size="sm" onClick={onVerEnDiario}>
                    <ExternalLink className="mr-1 h-4 w-4" /> Ver en Libro Diario
                  </Button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

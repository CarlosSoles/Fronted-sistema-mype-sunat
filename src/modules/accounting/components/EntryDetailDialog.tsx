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

/**
 * Detalle de un asiento.
 *
 * Componente único para el Libro Diario y el Libro Mayor. La estructura sigue la
 * del detalle de referencia: número en grande, una línea de contexto, tarjetas
 * con los datos que existen, concepto, líneas y totales.
 *
 * La observación solo se muestra en el Diario: en el Mayor el usuario está
 * revisando saldos, no la ficha completa del asiento.
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
  /** El mayor no muestra la observación del asiento. */
  mostrarObservacion = true,
}: {
  entry: EntryDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cargando?: boolean;
  cuentaResaltada?: string;
  onVerCuenta?: (code: string) => void;
  onVerEnDiario?: () => void;
  mostrarObservacion?: boolean;
}) {
  const lineas = entry?.lineas ?? [];
  const totalDebe = lineas.reduce((acc, linea) => acc + linea.debit, 0);
  const totalHaber = lineas.reduce((acc, linea) => acc + linea.credit, 0);
  const sinLineas = lineas.length === 0;
  const cuadrado = !sinLineas && Math.abs(totalDebe - totalHaber) <= 0.01;

  // Tarjetas: solo las que tienen dato. «Origen» ocupa el lugar del responsable.
  const tarjetas = entry
    ? [
        { etiqueta: 'Número / Referencia', valor: entry.numero },
        { etiqueta: 'Fecha contable', valor: entry.fecha ? formatDateToPeru(entry.fecha) : '' },
        { etiqueta: 'Origen', valor: entry.origen },
        {
          etiqueta: 'Diario contable',
          valor: entry.diario ? (NOMBRE_DIARIO[entry.diario] ?? entry.diario) : '',
        },
        { etiqueta: 'Documento', valor: entry.referencia },
      ].filter((tarjeta) => Boolean(tarjeta.valor && String(tarjeta.valor).trim()))
    : [];

  const subtitulo = [entry?.fecha ? formatDateToPeru(entry.fecha) : '', entry?.origen ?? '']
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {cargando ? (
          <p className="py-10 text-sm text-muted-foreground">Cargando asiento…</p>
        ) : entry ? (
          <>
            <DialogHeader className="gap-1.5">
              <div className="flex flex-wrap items-start justify-between gap-2 pr-8">
                <div>
                  <DialogTitle className="font-mono text-lg font-semibold">{entry.numero}</DialogTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>
                </div>
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
              </div>
              <DialogDescription className="sr-only">
                Detalle del asiento {entry.numero}
              </DialogDescription>
            </DialogHeader>

            {tarjetas.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tarjetas.map((tarjeta) => (
                  <div key={tarjeta.etiqueta} className="rounded-lg border p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {tarjeta.etiqueta}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold" title={String(tarjeta.valor)}>
                      {tarjeta.valor}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Concepto</p>
              <p className="mt-1 text-sm">{entry.glosa || '—'}</p>
            </div>

            {mostrarObservacion && entry.observacion ? (
              <div className="rounded-lg border p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Observación</p>
                <p className="mt-1 text-sm">{entry.observacion}</p>
              </div>
            ) : null}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Líneas del asiento ({lineas.length})
                </p>
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
                    {cuadrado ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}
                    {cuadrado ? 'Asiento cuadrado' : 'Asiento descuadrado'}
                  </span>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta contable</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead align="right">Debe</TableHead>
                    <TableHead align="right">Haber</TableHead>
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
                        <TableRow key={`${linea.code}-${indice}`} className={resaltada ? 'bg-muted/60' : undefined}>
                          <TableCell className="whitespace-nowrap">
                            {onVerCuenta ? (
                              <button
                                type="button"
                                onClick={() => onVerCuenta(linea.code)}
                                className="block text-left"
                                title={`Ver el libro mayor de ${linea.code}`}
                              >
                                <span className="block font-mono text-xs font-bold text-destructive">{linea.code}</span>
                                <span className="block text-[11px] text-muted-foreground">{linea.name}</span>
                              </button>
                            ) : (
                              <>
                                <span className="block font-mono text-xs font-bold text-destructive">{linea.code}</span>
                                <span className="block text-[11px] text-muted-foreground">{linea.name}</span>
                              </>
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
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex flex-wrap gap-4 text-xs">
                <span>
                  Total debe: <strong className="tabular-nums">{money(totalDebe)}</strong>
                </span>
                <span>
                  Total haber: <strong className="tabular-nums">{money(totalHaber)}</strong>
                </span>
              </div>
              {onVerEnDiario ? (
                <Button variant="ghost" size="sm" onClick={onVerEnDiario}>
                  <ExternalLink className="mr-1 h-4 w-4" /> Ver en Libro Diario
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

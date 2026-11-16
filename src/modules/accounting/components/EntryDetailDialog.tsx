import { CheckCircle2, Scale, TriangleAlert } from 'lucide-react';
import {
  Badge,
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
  createdAt?: string | null;
  lineas: Array<{ code: string; name: string; debit: number; credit: number }>;
}

const money = (value: number) => formatCurrency(Number(value) || 0, 'PEN');

/** Fecha y hora legibles del momento en que se registró el asiento. */
const fechaHora = (valor?: string | null): string => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return `${fecha.toLocaleDateString('es-PE')} ${fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Detalle de un asiento en una ventana centrada.
 *
 * Se abre solo desde el icono de la lista: la tabla queda limpia y el detalle
 * muestra lo que no cabe en una fila (líneas, orígenes y totales).
 */
export function EntryDetailDialog({
  entry,
  open,
  onOpenChange,
  cargando = false,
}: {
  entry: EntryDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cargando?: boolean;
}) {
  const totalDebe = entry?.lineas.reduce((acc, linea) => acc + linea.debit, 0) ?? 0;
  const totalHaber = entry?.lineas.reduce((acc, linea) => acc + linea.credit, 0) ?? 0;
  const cuadrado = Math.abs(totalDebe - totalHaber) <= 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {cargando ? (
          <p className="py-10 text-sm text-muted-foreground">Cargando asiento…</p>
        ) : entry ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">{entry.numero}</span>
                <Badge
                  variant="outline"
                  className={
                    cuadrado
                      ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                      : 'border-destructive/30 bg-destructive/5 text-destructive'
                  }
                >
                  {cuadrado ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <TriangleAlert className="mr-1 h-3.5 w-3.5" />}
                  {cuadrado ? 'Asiento cuadrado' : 'Asiento descuadrado'}
                </Badge>
              </div>
              <DialogTitle className="text-base leading-snug">{entry.glosa}</DialogTitle>
              <DialogDescription className="text-xs">
                {formatDateToPeru(entry.fecha)}
                {entry.diario ? ` · ${entry.diario}` : ''}
                {entry.referencia ? ` · ${entry.referencia}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Chip etiqueta="Fecha contable" valor={formatDateToPeru(entry.fecha)} />
              <Chip etiqueta="Creado" valor={fechaHora(entry.createdAt)} />
              <Chip etiqueta="Diario" valor={entry.diario ?? '—'} />
              <Chip etiqueta="Origen" valor={entry.origen} />
              <Chip etiqueta="Referencia" valor={entry.referencia ?? '—'} />
              <Chip etiqueta="Total" valor={money(totalDebe)} />
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Líneas del asiento ({entry.lineas.length})
              </p>
              <div className="rounded-lg ring-1 ring-foreground/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuenta contable</TableHead>
                      <TableHead align="right">Debe</TableHead>
                      <TableHead align="right">Haber</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.lineas.map((linea, index) => (
                      <TableRow key={`${entry.id}-${index}`}>
                        <TableCell>
                          <span className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs font-semibold">{linea.code}</span>
                            <span className="text-[11px] leading-snug text-muted-foreground">{linea.name}</span>
                          </span>
                        </TableCell>
                        <TableCell align="right" className="whitespace-nowrap tabular-nums">
                          {linea.debit ? money(linea.debit) : '—'}
                        </TableCell>
                        <TableCell align="right" className="whitespace-nowrap tabular-nums">
                          {linea.credit ? money(linea.credit) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Totales</span>
              <span className="flex items-center gap-4 font-medium tabular-nums">
                <span>{money(totalDebe)}</span>
                <span>{money(totalHaber)}</span>
                <Scale className={cuadrado ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-destructive'} />
              </span>
            </div>
          </>
        ) : (
          <p className="py-10 text-sm text-muted-foreground">No se pudo cargar el asiento.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Chip({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{etiqueta}</p>
      <p className="mt-1 truncate text-sm tabular-nums" title={valor}>{valor}</p>
    </div>
  );
}

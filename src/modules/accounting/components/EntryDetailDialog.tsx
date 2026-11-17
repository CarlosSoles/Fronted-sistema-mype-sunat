import { CheckCircle2, Scale, TriangleAlert } from 'lucide-react';
import {
  Badge,
  Dialog,
  DialogContent,
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
  lineas: Array<{ code: string; name: string; debit: number; credit: number }>;
}

const money = (value: number) => formatCurrency(Number(value) || 0, 'PEN');

/**
 * Detalle de un asiento en ventana flotante centrada.
 *
 * El ancho queda fijo y las columnas se reparten con `table-fixed`: así el
 * contenido largo se recorta en vez de empujar la tabla y obligar a desplazar
 * el modal a la derecha.
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
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        {cargando ? (
          <p className="py-10 text-sm text-muted-foreground">Cargando asiento…</p>
        ) : entry ? (
          <>
            <DialogHeader className="gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
                <DialogTitle className="font-mono text-base">{entry.numero}</DialogTitle>
                <Badge
                  variant="outline"
                  className={
                    cuadrado
                      ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                      : 'border-destructive/30 bg-destructive/5 text-destructive'
                  }
                >
                  {cuadrado ? 'Registrado' : 'Descuadrado'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateToPeru(entry.fecha)}
                {entry.diario ? ` · ${entry.diario}` : ''}
              </p>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {/* El número del asiento (AS/...) es la referencia principal; el
                  documento de origen se muestra aparte si existe. */}
              <Chip etiqueta="Número / Referencia" valor={entry.numero} />
              <Chip etiqueta="Fecha contable" valor={formatDateToPeru(entry.fecha)} />
              <Chip etiqueta="Diario contable" valor={entry.diario ?? '—'} />
              <Chip etiqueta="Origen" valor={entry.origen} />
            </div>

            {entry.referencia ? (
              <p className="text-xs text-muted-foreground">
                Documento de origen: <span className="font-medium text-foreground">{entry.referencia}</span>
              </p>
            ) : null}

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Concepto</p>
                <p className="mt-1 text-sm font-medium leading-snug">{entry.glosa}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Observación</p>
                <p className="mt-1 text-sm text-muted-foreground">{entry.observacion?.trim() || '—'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Líneas del asiento ({entry.lineas.length})
              </p>
              {cuadrado ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Asiento cuadrado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                  <TriangleAlert className="h-3.5 w-3.5" /> Asiento descuadrado
                </span>
              )}
            </div>

            <div className="rounded-lg ring-1 ring-foreground/10">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[58%]">Cuenta contable</TableHead>
                    <TableHead align="right" className="w-[21%]">Debe</TableHead>
                    <TableHead align="right" className="w-[21%]">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.lineas.map((linea, index) => (
                    <TableRow key={`${entry.id}-${index}`}>
                      <TableCell>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="font-mono text-xs font-semibold">{linea.code}</span>
                          <span className="truncate text-[11px] leading-snug text-muted-foreground" title={linea.name}>
                            {linea.name}
                          </span>
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

            <div className="flex items-center justify-between rounded-lg bg-foreground px-3 py-2 text-sm text-background">
              <span className="text-xs uppercase tracking-wider">Debe · Haber</span>
              <span className="flex items-center gap-4 font-medium tabular-nums">
                <span>{money(totalDebe)}</span>
                <span>{money(totalHaber)}</span>
                <Scale className={cuadrado ? 'h-4 w-4 text-emerald-400' : 'h-4 w-4 text-red-400'} />
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
    <div className="min-w-0 rounded-lg bg-muted/40 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{etiqueta}</p>
      <p className="mt-1 truncate text-sm" title={valor}>{valor}</p>
    </div>
  );
}

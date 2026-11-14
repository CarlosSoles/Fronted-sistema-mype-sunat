import { CheckCircle2, Scale, TriangleAlert } from 'lucide-react';
import {
  Badge,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';

/** Asiento normalizado para el panel, venga del diario o del mayor. */
export interface EntryDetail {
  id: string;
  numero: string;
  fecha: string;
  glosa: string;
  origen: string;
  referencia?: string | null;
  lineas: Array<{ code: string; name: string; debit: number; credit: number }>;
}

const money = (value: number) => formatCurrency(Number(value) || 0, 'PEN');

/**
 * Panel lateral con el detalle de un asiento: metadatos, concepto y líneas.
 *
 * Es el mismo componente para el Libro Diario y el Libro Mayor, así el detalle
 * se lee igual en los dos y solo cambia de dónde salen los datos.
 */
export function EntryDetailSheet({
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {cargando ? (
          <div className="py-10 text-sm text-muted-foreground">Cargando asiento…</div>
        ) : entry ? (
          <>
            <SheetHeader className="gap-3">
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
              <SheetTitle className="text-base leading-snug">{entry.glosa}</SheetTitle>
              <SheetDescription className="text-xs">
                {formatDateToPeru(entry.fecha)} · {entry.origen}
                {entry.referencia ? ` · ${entry.referencia}` : ''}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Fecha contable</p>
                <p className="mt-1 text-sm tabular-nums">{formatDateToPeru(entry.fecha)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Origen</p>
                <p className="mt-1 text-sm">{entry.origen}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total debe</p>
                <p className="mt-1 text-sm font-medium tabular-nums">{money(totalDebe)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total haber</p>
                <p className="mt-1 text-sm font-medium tabular-nums">{money(totalHaber)}</p>
              </div>
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Líneas del asiento ({entry.lineas.length})
            </p>
            <div className="mt-2 rounded-lg ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
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
                          <span className="text-[11px] text-muted-foreground leading-snug">{linea.name}</span>
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

            <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Totales</span>
              <span className="flex items-center gap-4 font-medium tabular-nums">
                <span>{money(totalDebe)}</span>
                <span>{money(totalHaber)}</span>
                <Scale className={cuadrado ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-destructive'} />
              </span>
            </div>
          </>
        ) : (
          <div className="py-10 text-sm text-muted-foreground">No se pudo cargar el asiento.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}

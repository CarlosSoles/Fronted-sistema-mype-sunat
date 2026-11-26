import { useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { BookOpenCheck, LoaderCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { sireApi } from '../services/sireApi';
import type { SireAsientoPreview } from '../types/sire.types';
import { getPeriodFeedback } from '../validators/sireSchema';

interface Props {
  period: string;
}

interface PreviewResult {
  period: string;
  asientos: SireAsientoPreview[];
}

/**
 * Botón y modal de previsualización de asientos contables.
 *
 * Solo consulta `GET /sire/asientos-preview?periodo=AAAAMM`: no contabiliza ni
 * modifica datos. El resultado se guarda junto con el periodo consultado para
 * no mostrar asientos de un periodo anterior si este cambia.
 */
export const SireAsientosPreview = ({ period }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const requestIdRef = useRef(0);

  const loadPreview = async () => {
    setOpen(true);

    const feedback = getPeriodFeedback(period);
    if (feedback) {
      setResult(null);
      setError(feedback);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const asientos = await sireApi.getAsientosPreview(period);
      if (requestId === requestIdRef.current) setResult({ period, asientos });
    } catch (cause) {
      if (requestId === requestIdRef.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudieron previsualizar los asientos contables.',
        );
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const asientos = result?.period === period ? result.asientos : null;
  const totalDebe = asientos?.reduce((total, asiento) => total + asiento.debe, 0) ?? 0;
  const totalHaber = asientos?.reduce((total, asiento) => total + asiento.haber, 0) ?? 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        disabled={loading}
        onClick={() => void loadPreview()}
      >
        {loading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
        )}
        {loading ? 'Cargando asientos…' : 'Previsualizar Asiento Contable'}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            requestIdRef.current += 1;
            setLoading(false);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Previsualización de asientos contables</DialogTitle>
            <DialogDescription>
              Asientos que el backend generaría para el periodo {period}. Esta vista no contabiliza
              ni modifica información.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div
              role="status"
              className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
            >
              <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              Generando la previsualización de asientos…
            </div>
          )}

          {!loading && error && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo previsualizar el asiento contable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && asientos && asientos.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay asientos generados para este periodo.
            </p>
          )}

          {!loading && !error && asientos && asientos.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta Contable</TableHead>
                  <TableHead align="right">Debe</TableHead>
                  <TableHead align="right">Haber</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asientos.map((asiento, index) => (
                  <TableRow key={`${asiento.cuentaContable}-${index}`}>
                    <TableCell className="font-mono">{asiento.cuentaContable}</TableCell>
                    <TableCell align="right" className="font-mono">
                      {formatCurrency(asiento.debe, 'PEN')}
                    </TableCell>
                    <TableCell align="right" className="font-mono">
                      {formatCurrency(asiento.haber, 'PEN')}
                    </TableCell>
                    <TableCell>{asiento.descripcion || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Totales</TableCell>
                  <TableCell align="right" className="font-mono">
                    {formatCurrency(totalDebe, 'PEN')}
                  </TableCell>
                  <TableCell align="right" className="font-mono">
                    {formatCurrency(totalHaber, 'PEN')}
                  </TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cerrar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

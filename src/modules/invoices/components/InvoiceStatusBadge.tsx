/**
 * Badge semafórico del estado de un comprobante frente a SUNAT.
 *
 * Semántica de color exigida por el módulo M1:
 *  - Verde   -> Aceptado (CDR código 0).
 *  - Amarillo-> Observado (CDR 4xxx: aceptado con observaciones).
 *  - Azul    -> En cola Outbox, pendiente de despacho.
 *  - Rojo    -> Rechazado o en DLQ (requiere accion correctiva).
 */
import { Badge } from '@/components/ui';
import type { EstadoCdrDemo } from '../data/invoiceDemoData';

/** Metadatos visuales de cada estado. */
const ESTADOS: Record<
  EstadoCdrDemo,
  { label: string; className: string; ariaLabel: string }
> = {
  ACEPTADO: {
    label: 'Aceptado',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700',
    ariaLabel: 'Aceptado por SUNAT',
  },
  OBSERVADO: {
    label: 'Observado',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-700',
    ariaLabel: 'Aceptado con observaciones de SUNAT',
  },
  EN_COLA: {
    label: 'En cola Outbox',
    className: 'border-blue-500/40 bg-blue-500/10 text-blue-700',
    ariaLabel: 'Pendiente de envio en la cola Outbox',
  },
  RECHAZADO: {
    label: 'Rechazado',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    ariaLabel: 'Rechazado por SUNAT o en cola DLQ',
  },
};

interface InvoiceStatusBadgeProps {
  estado: EstadoCdrDemo;
  codigo?: string;
}

export const InvoiceStatusBadge = ({ estado, codigo }: InvoiceStatusBadgeProps) => {
  const meta = ESTADOS[estado];

  return (
    <Badge
      variant="outline"
      className={`font-medium ${meta.className}`}
      aria-label={meta.ariaLabel}
    >
      {meta.label}
      {codigo && codigo !== '0' ? ` · ${codigo}` : ''}
    </Badge>
  );
};

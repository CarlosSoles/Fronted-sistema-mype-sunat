/**
 * Badge semafórico del estado de un comprobante frente a SUNAT.
 *
 * Semántica de color exigida por el módulo M1:
 *  - Verde   -> Aceptado (CDR código 0).
 *  - Amarillo-> Observado (CDR 4xxx: aceptado con observaciones).
 *  - Azul    -> En cola Outbox, pendiente de despacho.
 *  - Ámbar   -> Sin confirmar: el envío falló y SUNAT no lo evaluó.
 *  - Rojo    -> Rechazado por SUNAT (requiere acción correctiva).
 *
 * POR QUÉ "SIN CONFIRMAR" EXISTE
 *
 * `estado` viene de `mapEstadoCdr`, que colapsa un ERROR_RED dentro de
 * RECHAZADO para que la fila salga en rojo. Eso hacía que la ficha dijera
 * "Rechazado" sobre un comprobante que SUNAT nunca recibió, contradiciendo al
 * texto explicativo de la misma pantalla. El estado crudo llega aparte y
 * permite rotularlo bien sin abrir todavía el enum de estados (deuda anotada
 * en `lib/invoiceRedError`).
 */
import { Badge } from '@/components/ui';
import type { EstadoCdrDemo } from '../data/invoiceDemoData';
import type { ComprobanteDemo } from '../data/invoiceDemoSchema';
import { esErrorDeRed } from '../lib/invoiceRedError';

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

/**
 * Estado de un comprobante cuyo envío falló.
 *
 * No está en `ESTADOS` porque no es parte del enum `EstadoCdrDemo`: es la
 * lectura correcta de un ERROR_RED, que el enum no sabe representar. Ámbar y no
 * rojo porque no hay veredicto de SUNAT: el documento puede seguir emitiéndose
 * una vez resuelto el problema de red.
 */
const ESTADO_SIN_CONFIRMAR = {
  label: 'Sin confirmar',
  className: 'border-amber-500/40 bg-amber-500/10 text-amber-700',
  ariaLabel: 'No llegó a SUNAT: el envío falló por un error de red',
} as const;

interface InvoiceStatusBadgeProps {
  estado: EstadoCdrDemo;
  codigo?: string;
  /**
   * Comprobante completo, cuando se conoce.
   *
   * Sin él no se puede distinguir un rechazo de SUNAT de un fallo de envío:
   * `estado` los colapsa en RECHAZADO. Es opcional para no romper los usos que
   * solo tienen el estado.
   */
  comprobante?: ComprobanteDemo;
}

export const InvoiceStatusBadge = ({
  estado,
  codigo,
  comprobante,
}: InvoiceStatusBadgeProps) => {
  // El fallo de envío se resuelve antes que el mapa de estados: si el
  // comprobante es un ERROR_RED, no es un rechazo aunque `estado` lo diga.
  const meta =
    comprobante && esErrorDeRed(comprobante)
      ? ESTADO_SIN_CONFIRMAR
      : ESTADOS[estado];

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

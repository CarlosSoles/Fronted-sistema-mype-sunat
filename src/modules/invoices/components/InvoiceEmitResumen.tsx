/**
 * Resumen en tiempo real del comprobante que se está emitiendo (M1).
 *
 * Aplica el motor tributario real (`liquidarComprobante`) y las reglas
 * normativas (cronograma de cuotas y monto en letras) sobre los valores del
 * formulario, para que el usuario vea el resultado antes de confirmar.
 */
import { PageText } from '@/components/ui';
import {
  liquidarComprobante,
} from '../lib/invoiceRetentions';
import {
  generarCronogramaCuotas,
  montoEnLetrasSunat,
} from '../lib/invoiceCreditAndRules';
import { borradorALiquidar } from '../lib/invoiceEmitDraft';
import type { BorradorEmision } from '../lib/invoiceEmitDraft';

interface InvoiceEmitResumenProps {
  borrador: BorradorEmision;
}

/** Formatea un monto en soles. */
const soles = (valor: number): string =>
  `S/ ${valor.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Resumen tributario calculado del borrador actual. */
export const InvoiceEmitResumen = ({ borrador }: InvoiceEmitResumenProps) => {
  const liquidacion = liquidarComprobante(
    borradorALiquidar(borrador),
    {
      bolsasPlasticas: borrador.bolsas,
      esAgenteRetencion: borrador.agenteRetencion,
      detraccionPorcentaje: borrador.detraccionPct,
    },
  );

  const cuotas =
    borrador.formaPago === 'Credito'
      ? generarCronogramaCuotas(
          liquidacion.netoPendientePago,
          borrador.numeroCuotas,
          borrador.fecha,
        )
      : [];

  return (
    <div className="space-y-1 rounded-lg border bg-muted/40 p-3">
      <PageText variant="label">Resumen calculado</PageText>
      <PageText variant="caption">
        Op. gravada {soles(liquidacion.opGravada)} · IGV{' '}
        {soles(liquidacion.igv)}
      </PageText>
      <PageText variant="caption">
        Detracción SPOT {soles(liquidacion.montoDetraccion)} · Retención 3%{' '}
        {soles(liquidacion.montoRetencion)}
      </PageText>
      <PageText variant="label">
        Neto a pagar {soles(liquidacion.netoPendientePago)}
      </PageText>
      {cuotas.length > 0 && (
        <PageText variant="caption">
          {cuotas
            .map((q) => `${q.numero}: ${soles(q.monto)}`)
            .join(' · ')}
        </PageText>
      )}
      <PageText variant="caption">
        {montoEnLetrasSunat(liquidacion.netoPendientePago)}
      </PageText>
    </div>
  );
};

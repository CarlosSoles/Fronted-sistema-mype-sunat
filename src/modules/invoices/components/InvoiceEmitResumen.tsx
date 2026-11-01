/**
 * Resumen en tiempo real del comprobante que se está emitiendo (M1).
 *
 * Aplica el motor tributario real (`liquidarComprobante`) sobre las LÍNEAS de la
 * grilla (TA-64) y muestra el desglose por afectación, que ahora puede tener
 * gravadas, exoneradas e inafectas a la vez. También muestra el cronograma de
 * cuotas ya repartido y el monto en letras.
 */
import { PageText } from '@/components/ui';
import { liquidarComprobante } from '../lib/invoiceRetentions';
import {
  buscarDetraccion,
  montoDetraccionPara,
} from '../lib/invoiceDetraccion';
import { montoEnLetrasSunat } from '../lib/invoiceCreditAndRules';
import { borradorALiquidar, esTipoNota } from '../lib/invoiceEmitDraft';
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
  const esNota = esTipoNota(borrador.tipo);
  const codigo = esNota ? undefined : borrador.codigoDetraccion;
  const porcentaje = codigo ? (buscarDetraccion(codigo)?.porcentaje ?? 0) : 0;

  const liquidacion = liquidarComprobante(borradorALiquidar(borrador), {
    // El ICBPER de la grilla ya vive en su propia línea; `bolsasPlasticas`
    // solo cubre el campo suelto, que no debe contarse dos veces.
    bolsasPlasticas: 0,
    esAgenteRetencion: !esNota && borrador.agenteRetencion,
    detraccionPorcentaje: porcentaje,
  });

  // El ICBPER de las líneas se suma al total: no pasa por `liquidarComprobante`
  // porque cada bolsa trae su propio importe en la grilla.
  const icbperLineas = borrador.items.reduce(
    (acc, item) => acc + (Number.isFinite(item.icbper) ? item.icbper : 0),
    0,
  );
  const importeTotal = liquidacion.importeTotal + icbperLineas;
  const detraccion = montoDetraccionPara(importeTotal, codigo);
  const neto = importeTotal - detraccion - liquidacion.montoRetencion;

  return (
    <div className="space-y-1 rounded-lg border bg-muted/40 p-3">
      <PageText variant="label">Resumen calculado</PageText>

      {liquidacion.opGravada > 0 && (
        <PageText variant="caption">
          Gravada {soles(liquidacion.opGravada)} · IGV {soles(liquidacion.igv)}
        </PageText>
      )}
      {liquidacion.opExonerada > 0 && (
        <PageText variant="caption">
          Exonerada {soles(liquidacion.opExonerada)}
        </PageText>
      )}
      {liquidacion.opInafecta > 0 && (
        <PageText variant="caption">
          Inafecta {soles(liquidacion.opInafecta)}
        </PageText>
      )}
      {liquidacion.opGratuita > 0 && (
        <PageText variant="caption">
          Gratuita {soles(liquidacion.opGratuita)} (no se cobra)
        </PageText>
      )}
      {icbperLineas > 0 && (
        <PageText variant="caption">
          ICBPER {soles(icbperLineas)}
        </PageText>
      )}

      {detraccion > 0 && (
        <PageText variant="caption">
          Detracción SPOT {soles(detraccion)} (depósito en el Banco de la Nación)
        </PageText>
      )}
      {liquidacion.montoRetencion > 0 && (
        <PageText variant="caption">
          Retención 3% {soles(liquidacion.montoRetencion)}
        </PageText>
      )}

      <PageText variant="label">Importe total {soles(importeTotal)}</PageText>
      {neto !== importeTotal && (
        <PageText variant="label">Neto pendiente {soles(neto)}</PageText>
      )}

      {borrador.cuotas.length > 0 && (
        <PageText variant="caption">
          {borrador.cuotas
            .map(
              (q, i) =>
                `Cuota${String(i + 1).padStart(3, '0')}: ${soles(q.monto)}`,
            )
            .join(' · ')}
        </PageText>
      )}

      <PageText variant="caption">{montoEnLetrasSunat(importeTotal)}</PageText>
    </div>
  );
};

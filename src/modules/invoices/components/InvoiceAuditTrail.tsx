/**
 * Bitácora de auditoría del pipeline de envío a SUNAT (M1).
 *
 * Muestra las cinco etapas que atraviesa un comprobante desde la cola Outbox
 * hasta la respuesta del `billService`, con su tiempo de ejecución.
 */
import { Badge, PageText } from '@/components/ui';
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';

interface InvoiceAuditTrailProps {
  comprobante: ComprobanteDemo;
}

/** Etapas del pipeline de emisión electrónica. */
const ETAPAS = [
  '1. Ingesta Outbox',
  '2. Generación XML UBL 2.1',
  '3. Validación Esquema XSD',
  '4. Firma Digital XMLDSig X.509',
  '5. Envío SOAP billService',
] as const;

/** Tiempo medio por etapa para la simulación de la bitácora. */
const MS_POR_ETAPA = 180;

/** Bitácora del pipeline con los tiempos de cada etapa. */
export const InvoiceAuditTrail = ({ comprobante }: InvoiceAuditTrailProps) => {
  const total = comprobante.tiempoDespachoMs ?? MS_POR_ETAPA * ETAPAS.length;
  const aceptado = comprobante.estado !== 'RECHAZADO';

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <PageText variant="label">Bitácora de Auditoría</PageText>

      {ETAPAS.map((etapa, i) => {
        const ms = Math.round(total / ETAPAS.length) * (i + 1);
        return (
          <div
            key={etapa}
            className="flex items-center justify-between gap-2"
          >
            <PageText variant="caption">{etapa}</PageText>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {ms} ms
              </Badge>
              <Badge
                variant={aceptado ? 'secondary' : 'destructive'}
                className="text-[10px]"
              >
                {aceptado ? 'OK' : 'FALLÓ'}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};

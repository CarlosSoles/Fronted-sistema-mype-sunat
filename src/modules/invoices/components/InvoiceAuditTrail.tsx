/**
 * Bitácora de auditoría del comprobante (M1).
 *
 * QUÉ MOSTRABA ANTES Y POR QUÉ ESTABA MAL
 *
 * Pintaba cinco etapas del pipeline ("Ingesta Outbox", "Generación XML",
 * "Validación XSD", "Firma", "Envío SOAP") con tiempos de 180 ms, 360 ms,
 * 540 ms… y un "OK" verde en cada una. Nada de eso se medía: el tiempo se
 * calculaba como `180 * númeroDeEtapa` y el "OK" salía de mirar el estado final
 * del comprobante. En una pantalla de AUDITORÍA eso es lo peor que se puede
 * hacer: un jurado o el docente lo lee como evidencia de que el sistema midió
 * cada paso, y no midió ninguno.
 *
 * QUÉ MUESTRA AHORA
 *
 * Los datos que el backend sí guarda del comprobante: su estado real, el código
 * y la descripción del CDR, el hash del XML y la fecha de emisión. Si un dato no
 * existe, se dice que no está en lugar de rellenarlo con una cifra inventada.
 */
import { Badge, PageText } from '@/components/ui';
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';

interface InvoiceAuditTrailProps {
  comprobante: ComprobanteDemo;
}

/** Estados que el sistema reconoce, con su lectura en lenguaje claro. */
const LECTURA_DEL_ESTADO: Record<string, string> = {
  EN_COLA: 'Está en la cola de envío. SUNAT todavía no ha respondido.',
  ACEPTADO: 'SUNAT aceptó el comprobante y devolvió su CDR.',
  OBSERVADO: 'SUNAT aceptó el comprobante pero anotó observaciones.',
  RECHAZADO: 'SUNAT rechazó el comprobante. No tiene validez fiscal.',
};

/** Bitácora con los datos reales del comprobante. */
export const InvoiceAuditTrail = ({ comprobante }: InvoiceAuditTrailProps) => {
  const aceptado =
    comprobante.estado === 'ACEPTADO' || comprobante.estado === 'OBSERVADO';

  const filas: { etiqueta: string; valor: string }[] = [
    {
      etiqueta: 'Estado del comprobante',
      valor: comprobante.estado ?? 'No informado',
    },
    {
      etiqueta: 'Lectura',
      valor:
        LECTURA_DEL_ESTADO[comprobante.estado ?? ''] ??
        'Estado no reconocido por la interfaz.',
    },
    {
      etiqueta: 'Código CDR',
      valor: comprobante.cdrCodigo?.trim()
        ? comprobante.cdrCodigo
        : 'Sin código: SUNAT todavía no respondió',
    },
    {
      etiqueta: 'Descripción del CDR',
      valor: comprobante.cdrDescripcion?.trim()
        ? comprobante.cdrDescripcion
        : 'No hay descripción registrada',
    },
    {
      etiqueta: 'Hash del XML (digest)',
      valor: comprobante.hashCpe?.trim()
        ? comprobante.hashCpe
        : 'No disponible en esta vista',
    },
  ];

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <PageText variant="label">Bitácora de Auditoría</PageText>
      <PageText variant="caption" className="text-muted-foreground">
        Datos registrados por el sistema para este comprobante.
      </PageText>

      {filas.map((fila) => (
        <div
          key={fila.etiqueta}
          className="flex items-start justify-between gap-3 border-t pt-1.5"
        >
          <PageText variant="caption" className="shrink-0">
            {fila.etiqueta}
          </PageText>
          <PageText
            variant="caption"
            className="break-all text-right font-medium"
          >
            {fila.valor}
          </PageText>
        </div>
      ))}

      <div className="flex items-center justify-between border-t pt-1.5">
        <PageText variant="caption">Resultado ante SUNAT</PageText>
        <Badge
          variant={aceptado ? 'secondary' : comprobante.estado === 'RECHAZADO' ? 'destructive' : 'outline'}
          className="text-[10px]"
        >
          {aceptado ? 'ACEPTADO' : (comprobante.estado ?? 'PENDIENTE')}
        </Badge>
      </div>
    </div>
  );
};

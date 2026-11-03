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

/**
 * Lectura de un ERROR_RED.
 *
 * La fila recibe `estado: 'RECHAZADO'` porque `mapEstadoCdr` colapsa
 * FALLO_CRITICO ahí para que el badge salga en rojo. Eso hacía que la Bitácora
 * afirmara "SUNAT rechazó el comprobante" sobre uno que SUNAT NUNCA VIO: no
 * llegó a enviarse. Un rechazo es un veredicto del fisco; esto es un fallo de
 * transmisión, y confundirlos es afirmar algo falso sobre el documento.
 */
const LECTURA_ERROR_RED =
  'No llegó a SUNAT: el envío falló por un error de red. SUNAT no lo evaluó, así que no hay rechazo ni aceptación.';

/** ¿El comprobante falló en el envío, sin llegar a SUNAT? */
const esErrorDeRed = (c: ComprobanteDemo): boolean =>
  c.estadoBackend === 'ERROR_RED' ||
  // Respaldo por si la fila llega sin el estado crudo del backend.
  (!c.cdrCodigo && !c.ultimoErrorCodigo && c.cdrDescripcion?.includes('No llegó a SUNAT'));

/** Bitácora con los datos reales del comprobante. */
export const InvoiceAuditTrail = ({ comprobante }: InvoiceAuditTrailProps) => {
  const aceptado =
    comprobante.estado === 'ACEPTADO' || comprobante.estado === 'OBSERVADO';
  const falloDeRed = esErrorDeRed(comprobante);

  const filas: { etiqueta: string; valor: string }[] = [
    {
      etiqueta: 'Estado del comprobante',
      valor: comprobante.estado ?? 'No informado',
    },
    {
      etiqueta: 'Lectura',
      valor: falloDeRed
        ? LECTURA_ERROR_RED
        : (LECTURA_DEL_ESTADO[comprobante.estado ?? ''] ??
          'Estado no reconocido por la interfaz.'),
    },
    {
      etiqueta: 'Código CDR',
      valor: comprobante.cdrCodigo?.trim()
        ? comprobante.cdrCodigo
        : falloDeRed
          // No es "todavía no respondió": SUNAT no respondió PORQUE nunca le
          // llegó el documento. Decirlo al revés sugiere una espera que no va
          // a terminar sola.
          ? 'Sin código: el envío no llegó a SUNAT'
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

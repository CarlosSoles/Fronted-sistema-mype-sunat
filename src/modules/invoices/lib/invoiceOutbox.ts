/**
 * Ciclo de vida de la cola Outbox del módulo M1 (Facturación).
 *
 * El módulo trabaja en modo demostración: la emisión encola el comprobante en
 * memoria y el worker de la cola simula el despacho a SUNAT para que el
 * usuario vea el ciclo completo (EN_COLA -> CDR). Sin este paso la pantalla se
 * quedaba con todos los comprobantes "En cola" para siempre y el contador de
 * la tarjeta Outbox nunca bajaba.
 *
 * TypeScript puro: no depende de React ni de red, por eso puede probarse de
 * forma aislada y reutilizarse cuando exista el backend real.
 */
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';
import { descripcionCdr } from '../data/invoiceDemoHelpers';

/** Espera simulada de la cola antes de recibir el CDR, en milisegundos. */
export const DESPACHO_SIMULADO_MS = 2500;

/** Resultado de una respuesta del CDR sobre un comprobante en cola. */
export interface RespuestaCdr {
  estado: ComprobanteDemo['estado'];
  codigo: string;
  tiempoDespachoMs: number;
}

/** Respuesta por defecto del billService de SUNAT para un despacho correcto. */
export const RESPUESTA_ACEPTADO: RespuestaCdr = {
  estado: 'ACEPTADO',
  codigo: '0',
  tiempoDespachoMs: 1240,
};

/**
 * Registra la respuesta del CDR en el comprobante que estaba en cola.
 *
 * Devuelve una copia inmutable: el comprobante original no se muta. Si el
 * comprobante no estaba en cola, la respuesta se ignora y se devuelve tal cual,
 * porque un CDR solo puede llegar sobre un documento pendiente de despacho.
 */
export const registrarRespuestaCdr = (
  comprobante: ComprobanteDemo,
  respuesta: RespuestaCdr = RESPUESTA_ACEPTADO,
): ComprobanteDemo => {
  if (comprobante.estado !== 'EN_COLA') return comprobante;

  return {
    ...comprobante,
    estado: respuesta.estado,
    cdrCodigo: respuesta.codigo,
    cdrDescripcion: descripcionCdr(respuesta.codigo),
    tiempoDespachoMs: respuesta.tiempoDespachoMs,
  };
};

/**
 * Simula el paso del worker de la cola Outbox sobre el lote completo.
 *
 * Solo despacha los comprobantes de tipo importable por la cola (facturas,
 * boletas y notas): las comunicaciones de baja y los resúmenes diarios (RA/RC)
 * viajan por otro canal y permanecen como están.
 */
export const despacharColaOutbox = (
  comprobantes: readonly ComprobanteDemo[],
  respuesta: RespuestaCdr = RESPUESTA_ACEPTADO,
): ComprobanteDemo[] =>
  comprobantes.map((c) =>
    c.tipo === 'RA' || c.tipo === 'RC'
      ? c
      : registrarRespuestaCdr(c, respuesta),
  );

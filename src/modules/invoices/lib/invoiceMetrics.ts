/**
 * Cálculo de las métricas fiscales del módulo de Facturación (M1).
 *
 * Se separa del componente visual para respetar la regla de responsabilidad
 * única y mantener las KPI cards por debajo del límite de líneas.
 *
 * Reglas contables aplicadas:
 *  - Los comprobantes RECHAZADOS son fiscalmente inválidos ante SUNAT: no
 *    suman base, IGV ni total facturado.
 *  - Notas de Crédito (07) RESTAN de la venta del periodo; Notas de Débito (08)
 *    SUMAN, igual que las Facturas (01) y Boletas (03).
 *  - Los Resúmenes (RA/RC) no se agregan aquí: son comunicaciones, no ventas.
 */
import { igvDesdeBase, round2 } from '../lib/invoiceCalculations';
import type { ComprobanteDemo } from '../data/invoiceDemoData';

/** Métricas agregadas que alimentan las tarjetas superiores. */
export interface ResumenFiscal {
  totalFacturado: number;
  baseTotal: number;
  igvTotal: number;
  aceptados: number;
  tasaExito: number;
  enCola: number;
  despachoPromedioMs: number;
  rechazados: number;
  /** Comprobantes aceptados con observaciones del CDR (código 4xxx). */
  observados: number;
  /** Importe neto a cobrar tras descontar detracciones y retenciones. */
  netoTotalCobrar: number;
}

/** Estados que representan un comprobante válido ante SUNAT. */
const ESTADOS_ACEPTADOS = new Set(['ACEPTADO', 'OBSERVADO']);

/** Tipos que incrementan la venta del periodo (Catálogo 01). */
const TIPOS_QUE_SUMAN = new Set(['01', '03', '08']);

/** Tipos que disminuyen la venta del periodo (Nota de Crédito). */
const TIPOS_QUE_RESTAN = new Set(['07']);

/** Calcula las métricas del periodo a partir de los comprobantes visibles. */
export const calcularResumenFiscal = (
  comprobantes: readonly ComprobanteDemo[],
): ResumenFiscal => {
  // Los rechazos quedan fuera de todo agregado fiscal.
  const validos = comprobantes.filter((c) => c.estado !== 'RECHAZADO');

  const afectanTotales = validos.filter(
    (c) => TIPOS_QUE_SUMAN.has(c.tipo) || TIPOS_QUE_RESTAN.has(c.tipo),
  );

  const signo = (c: ComprobanteDemo): number =>
    TIPOS_QUE_RESTAN.has(c.tipo) ? -1 : 1;

  const baseTotal = round2(
    afectanTotales.reduce((acc, c) => acc + signo(c) * c.baseImponible, 0),
  );
  const igvTotal = round2(
    afectanTotales.reduce((acc, c) => acc + signo(c) * c.igv, 0),
  );
  const totalFacturado = round2(baseTotal + igvTotal);

  const netoTotalCobrar = round2(
    afectanTotales.reduce((acc, c) => acc + signo(c) * c.totalNeto, 0),
  );

  const aceptados = comprobantes.filter((c) =>
    ESTADOS_ACEPTADOS.has(c.estado),
  ).length;
  const observados = comprobantes.filter(
    (c) => c.estado === 'OBSERVADO',
  ).length;
  const rechazados = comprobantes.filter(
    (c) => c.estado === 'RECHAZADO',
  ).length;
  const enCola = comprobantes.filter((c) => c.estado === 'EN_COLA').length;

  const despachos = comprobantes
    .map((c) => c.tiempoDespachoMs)
    .filter((ms): ms is number => typeof ms === 'number');

  const despachoPromedioMs = despachos.length
    ? Math.round(despachos.reduce((a, b) => a + b, 0) / despachos.length)
    : 0;

  const tasaExito = comprobantes.length
    ? round2((aceptados / comprobantes.length) * 100)
    : 0;

  return {
    totalFacturado,
    baseTotal,
    igvTotal,
    aceptados,
    tasaExito,
    enCola,
    despachoPromedioMs,
    rechazados,
    observados,
    netoTotalCobrar,
  };
};

/** Comprueba que el IGV mostrado coincide con el 18% de la base. */
export const igvEsperado = (base: number): number => igvDesdeBase(base);

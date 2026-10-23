/**
 * Modelo y conversión del borrador de emisión de comprobantes (M1).
 *
 * TypeScript puro: define el estado del formulario y la conversión hacia el
 * `ComprobanteDemo` final. Se aísla del modal para respetar el límite de líneas.
 *
 * Reglas que se cubren aquí (y no solo en la UI):
 *  - El correlativo se calcula a partir de los comprobantes ya emitidos para
 *    esa serie, de modo que dos emisiones nunca comparten `serie-correlativo`
 *    (que es la clave primaria del CPE y también el `id` de la grilla).
 *  - Una Nota hereda del documento afectado el tipo de operación, la forma de
 *    pago y las cuotas; no puede llevar detracción ni retención (solo las
 *    facturas las generan) y usa la serie F/B que exige SUNAT.
 *  - Las Notas al crédito recuperan la fecha de emisión del documento afectado
 *    (Catálogo 09, motivo 13), como manda la RS 193-2020/SUNAT.
 */
import type { LineaComprobante, AfectacionIgv } from './invoiceTaxes';
import type {
  ComprobanteDemo,
  TipoComprobante,
  TipoOperacion,
} from '../data/invoiceDemoTypes';
import { construir } from '../data/invoiceDemoTypes';
import {
  serieInicialPorTipo,
  serieParaNota,
  type TipoEmisible,
} from './invoiceEmitValidation';

/** Estado editable del formulario de emisión. */
export interface BorradorEmision {
  tipo: TipoEmisible;
  serie: string;
  correlativo: number;
  clienteDoc: string;
  clienteTipoDoc: '1' | '6';
  clienteRazonSocial: string;
  descripcion: string;
  base: number;
  afectacion: AfectacionIgv;
  formaPago: 'Contado' | 'Credito';
  numeroCuotas: number;
  detraccionPct: number;
  agenteRetencion: boolean;
  bolsas: number;
  documentoAfectado: string;
  /** Tipo del documento afectado, para heredar el tipo de operación. */
  tipoDocumentoAfectado: TipoOperacion;
  motivoCodigo: string;
  motivoDescripcion: string;
  fecha: string;
}

/** Estado de una serie para calcular el siguiente correlativo. */
interface EstadoSerie {
  serie: string;
  correlativo: number;
}

/** Borrador inicial para un tipo de comprobante. */
export const borradorInicial = (
  tipo: TipoEmisible,
  fecha: string,
): BorradorEmision => ({
  tipo,
  serie: serieInicialPorTipo(tipo),
  correlativo: 100,
  clienteDoc: '',
  clienteTipoDoc: '6',
  clienteRazonSocial: '',
  descripcion: 'Servicio de confección',
  base: 100,
  afectacion: 'GRAVADA',
  formaPago: 'Contado',
  numeroCuotas: 2,
  detraccionPct: 0,
  agenteRetencion: false,
  bolsas: 0,
  documentoAfectado: '',
  tipoDocumentoAfectado: '0101',
  motivoCodigo: tipo === '08' ? '02' : '01',
  motivoDescripcion:
    tipo === '08' ? 'Aumento en el valor' : 'Anulación de la operación',
  fecha,
});

/**
 * Calcula el siguiente correlativo libre de una serie.
 *
 * Toma el mayor correlativo ya existente en esa serie (sin importar el tipo de
 * documento ni el estado) y le suma uno. Si la serie no tiene comprobantes se
 * usa el correlativo base tal cual, que es el primer número libre de la serie:
 * sumarle uno dejaría huecos entre la semilla y la primera emisión.
 */
export const siguienteCorrelativo = (
  existentes: readonly EstadoSerie[],
  serie: string,
  base = 100,
): number => {
  const deLaSerie = existentes
    .filter((c) => c.serie === serie)
    .map((c) => c.correlativo);

  if (deLaSerie.length === 0) return base;

  return Math.max(...deLaSerie) + 1;
};

/** Convierte el borrador a las líneas que consume el motor tributario. */
export const borradorALiquidar = (
  b: BorradorEmision,
): readonly LineaComprobante[] => [
  { base: Number.isFinite(b.base) ? b.base : 0, afectacion: b.afectacion },
];

/** Indica si el tipo de comprobante es una Nota de Crédito o de Débito. */
export const esTipoNota = (tipo: string): boolean =>
  tipo === '07' || tipo === '08';

/**
 * Convierte el borrador a un comprobante listo para la grilla.
 *
 * El resultado entra como `EN_COLA`: la cola Outbox lo despacha y el CDR llega
 * después (ver `registrarRespuestaCdr` en `./invoiceOutbox`).
 */
export const borradorAComprobante = (
  b: BorradorEmision,
): ComprobanteDemo => {
  const esNota = esTipoNota(b.tipo);
  const numeroCuotas = b.formaPago === 'Credito' ? b.numeroCuotas : 0;

  return construir({
    tipo: b.tipo as TipoComprobante,
    serie: b.serie,
    correlativo: b.correlativo,
    ruc: b.clienteDoc,
    tipoDocCliente: b.clienteDoc.length === 11 ? '6' : '1',
    razonSocial: b.clienteRazonSocial || 'CLIENTE SIN RAZÓN SOCIAL',
    fecha: b.fecha,
    base: b.base,
    afectacion: b.afectacion,
    // Solo las Facturas generan detracción SPOT o retención del IGV; una Nota
    // las hereda del documento afectado, no las crea.
    detraccionPct: !esNota && b.detraccionPct > 0 ? b.detraccionPct : undefined,
    agenteRetencion: !esNota && b.agenteRetencion,
    estado: 'EN_COLA',
    tipoOperacion: esNota ? b.tipoDocumentoAfectado : undefined,
    formaPago: b.formaPago,
    numeroCuotas,
    documentoAfectado: esNota ? b.documentoAfectado : undefined,
    motivoNota: esNota
      ? { codigo: b.motivoCodigo, descripcion: b.motivoDescripcion }
      : undefined,
    items: [
      {
        codigo: 'SRV-001',
        descripcion: b.descripcion,
        unidad: 'NIU',
        cantidad: 1,
        valorUnitario: b.base,
        afectacion: b.afectacion,
      },
    ],
  });
};

/** Aplica el tipo de comprobante y deja la serie coherente con él. */
export const cambiarTipo = (
  b: BorradorEmision,
  tipo: TipoEmisible,
): BorradorEmision => ({
  ...b,
  tipo,
  serie: serieInicialPorTipo(tipo),
  // Los motivos del Catálogo 09 y 10 son distintos: se reinician al cambiar.
  motivoCodigo: tipo === '08' ? '02' : '01',
  motivoDescripcion:
    tipo === '08' ? 'Aumento en el valor' : 'Anulación de la operación',
  documentoAfectado: '',
  tipoDocumentoAfectado: '0101',
});

/**
 * Vincula una Nota con el documento que modifica.
 *
 * SUNAT exige que la Nota use la misma serie (F/B) que el documento afectado y
 * que su tipo de operación sea el de la factura 1001 cuando esta lleva
 * detracción. La forma de pago quedó en el documento original: la Nota al
 * crédito la replica y además recupera su fecha de emisión (motivo 13).
 * Devuelve el borrador actualizado y el comprobante encontrado.
 */
export const vincularDocumentoAfectado = (
  b: BorradorEmision,
  existentes: readonly ComprobanteDemo[],
): {
  borrador: BorradorEmision;
  afectado: ComprobanteDemo | undefined;
} => {
  const buscado = b.documentoAfectado.trim().toUpperCase();
  const afectado = existentes.find(
    (c) => c.estado !== 'RECHAZADO' && c.id.toUpperCase() === buscado,
  );

  return {
    borrador: {
      ...b,
      serie: serieParaNota(b.tipo, b.documentoAfectado, b.serie),
      tipoDocumentoAfectado: afectado?.tipoOperacion ?? '0101',
      formaPago: afectado?.formaPago ?? b.formaPago,
      numeroCuotas:
        afectado?.formaPago === 'Credito'
          ? Math.max(1, afectado.cuotas.length)
          : b.numeroCuotas,
      fecha: afectado?.fechaEmision ?? b.fecha,
    },
    afectado,
  };
};

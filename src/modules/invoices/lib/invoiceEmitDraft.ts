/**
 * Modelo y conversión del borrador de emisión de comprobantes (M1).
 *
 * TypeScript puro: define el estado del formulario y la conversión hacia el
 * `ComprobanteDemo` final. Se aísla del modal para respetar el límite de líneas.
 */
import type { LineaComprobante, AfectacionIgv } from './invoiceTaxes';
import type {
  ComprobanteDemo,
  TipoComprobante,
} from '../data/invoiceDemoTypes';
import { construir } from '../data/invoiceDemoTypes';

/** Estado editable del formulario de emisión. */
export interface BorradorEmision {
  tipo: '01' | '03' | '07' | '08';
  serie: string;
  correlativo: number;
  clienteDoc: string;
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
  motivoCodigo: string;
  motivoDescripcion: string;
  fecha: string;
}

/** Borrador inicial para un tipo de comprobante. */
export const borradorInicial = (
  tipo: BorradorEmision['tipo'],
  fecha: string,
): BorradorEmision => ({
  tipo,
  serie: tipo === '01' ? 'F001' : tipo === '03' ? 'B001' : tipo === '07' ? 'FC01' : 'FD01',
  correlativo: 100,
  clienteDoc: '',
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
  motivoCodigo: tipo === '08' ? '02' : '01',
  motivoDescripcion:
    tipo === '08' ? 'Aumento en el valor' : 'Anulación de la operación',
  fecha,
});

/** Convierte el borrador a las líneas que consume el motor tributario. */
export const borradorALiquidar = (
  b: BorradorEmision,
): readonly LineaComprobante[] => [
  { base: Number.isFinite(b.base) ? b.base : 0, afectacion: b.afectacion },
];

/** Convierte el borrador a un comprobante listo para la grilla. */
export const borradorAComprobante = (
  b: BorradorEmision,
): ComprobanteDemo =>
  construir({
    tipo: b.tipo as TipoComprobante,
    serie: b.serie,
    correlativo: b.correlativo,
    ruc: b.clienteDoc,
    razonSocial: b.clienteRazonSocial || 'CLIENTE SIN RAZÓN SOCIAL',
    fecha: b.fecha,
    base: b.base,
    afectacion: b.afectacion,
    detraccionPct: b.detraccionPct > 0 ? b.detraccionPct : undefined,
    agenteRetencion: b.agenteRetencion,
    estado: 'EN_COLA',
    formaPago: b.formaPago,
    numeroCuotas: b.numeroCuotas,
    documentoAfectado:
      b.tipo === '07' || b.tipo === '08' ? b.documentoAfectado : undefined,
    motivoNota:
      b.tipo === '07' || b.tipo === '08'
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

/**
 * Tipos y fábrica de comprobantes de demostración (M1). Los montos se derivan
 * con el motor real de `../lib/invoiceCalculations`. Las utilidades de
 * simulación (CDR, hash, cuotas) viven en `./invoiceDemoHelpers`.
 */
import {
  calcularDetraccion,
  calcularRetencion,
  igvDesdeBase,
  round2,
  type AfectacionIgv,
} from '../lib/invoiceCalculations';
import { construirCuotas, descripcionCdr, hashSimulado } from './invoiceDemoHelpers';
import { itemsPorDefecto } from './invoiceDemoItems';

/** Tipo de comprobante del Catálogo 01 de SUNAT. */
export type TipoComprobante = '01' | '03' | '07' | '08' | 'RA' | 'RC';

/** Estado del CDR devuelto por SUNAT. */
export type EstadoCdrDemo = 'ACEPTADO' | 'OBSERVADO' | 'EN_COLA' | 'RECHAZADO';

/** Tipo de operación del Catálogo 51 de SUNAT. */
export type TipoOperacion = '0101' | '1001' | '0200';

/** Forma de pago declarada en el comprobante. */
export type FormaPago = 'Contado' | 'Credito';

/** Cuota del cronograma de pago al crédito. */
export interface CuotaDemo {
  numero: string;
  monto: number;
  vencimiento: string;
}

/** Motivo de la nota (Catálogo 09 para NC, Catálogo 10 para ND). */
export interface MotivoNota {
  codigo: string;
  descripcion: string;
}

/** Ítem del detalle del comprobante. */
export interface ItemDemo {
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  valorUnitario: number;
  afectacion: AfectacionIgv;
}

/** Fila enriquecida que consume la tabla del módulo. */
export interface ComprobanteDemo {
  id: string;
  tipo: TipoComprobante;
  serie: string;
  correlativo: number;
  clienteRuc: string;
  clienteRazonSocial: string;
  fechaEmision: string;
  moneda: 'PEN' | 'USD';
  baseImponible: number;
  igv: number;
  detraccion: number;
  retencion: number;
  totalNeto: number;
  estado: EstadoCdrDemo;
  cdrCodigo?: string;
  /** Documento afectado, solo para notas de crédito/débito. */
  documentoAfectado?: string;
  /** Tiempo de despacho en la cola Outbox, en ms. */
  tiempoDespachoMs?: number;
  tipoOperacion: TipoOperacion;
  formaPago: FormaPago;
  /** Cronograma de cuotas (solo si `formaPago` es 'Credito'). */
  cuotas: readonly CuotaDemo[];
  /** Motivo de la nota (solo para tipos 07 y 08). */
  motivoNota?: MotivoNota;
  cdrDescripcion: string;
  hashCpe: string;
  items: readonly ItemDemo[];
}

/** Entrada reducida: el resto de montos se calcula. */
export interface SemillaComprobante {
  tipo: TipoComprobante;
  serie: string;
  correlativo: number;
  ruc: string;
  razonSocial: string;
  fecha: string;
  base: number;
  afectacion?: AfectacionIgv;
  detraccionPct?: number;
  agenteRetencion?: boolean;
  estado: EstadoCdrDemo;
  cdrCodigo?: string;
  documentoAfectado?: string;
  tiempoDespachoMs?: number;
  tipoOperacion?: TipoOperacion;
  formaPago?: FormaPago;
  numeroCuotas?: number;
  motivoNota?: MotivoNota;
  items?: readonly ItemDemo[];
}

/** Construye un comprobante derivando IGV, detracción, retención y neto. */
export function construir(semilla: SemillaComprobante): ComprobanteDemo {
  const afectacion = semilla.afectacion ?? 'GRAVADA';
  const igv = afectacion === 'GRAVADA' ? igvDesdeBase(semilla.base) : 0;
  const total = round2(semilla.base + igv);
  const detraccion = semilla.detraccionPct
    ? calcularDetraccion(total, semilla.detraccionPct)
    : 0;
  const retencion = semilla.agenteRetencion
    ? calcularRetencion(total, true)
    : 0;
  const tipoOperacion: TipoOperacion =
    semilla.tipoOperacion ??
    (semilla.detraccionPct && semilla.detraccionPct > 0 ? '1001' : '0101');
  const formaPago: FormaPago = semilla.formaPago ?? 'Contado';
  const totalNeto = round2(total - detraccion - retencion);
  const cuotas =
    formaPago === 'Credito'
      ? construirCuotas(totalNeto, semilla.numeroCuotas ?? 2, semilla.fecha)
      : [];

  const items: readonly ItemDemo[] =
    semilla.items && semilla.items.length > 0
      ? semilla.items
      : itemsPorDefecto(
          semilla.serie,
          semilla.correlativo,
          semilla.base,
          afectacion,
        );

  return {
    id: `${semilla.serie}-${semilla.correlativo}`,
    tipo: semilla.tipo,
    serie: semilla.serie,
    correlativo: semilla.correlativo,
    clienteRuc: semilla.ruc,
    clienteRazonSocial: semilla.razonSocial,
    fechaEmision: semilla.fecha,
    moneda: 'PEN',
    baseImponible: round2(semilla.base),
    igv,
    detraccion,
    retencion,
    totalNeto,
    estado: semilla.estado,
    cdrCodigo: semilla.cdrCodigo,
    documentoAfectado: semilla.documentoAfectado,
    tiempoDespachoMs: semilla.tiempoDespachoMs,
    tipoOperacion,
    formaPago,
    cuotas,
    motivoNota: semilla.motivoNota,
    cdrDescripcion: descripcionCdr(semilla.cdrCodigo),
    hashCpe: hashSimulado(
      `${semilla.serie}-${semilla.correlativo}-${semilla.ruc}-${total}`,
    ),
    items,
  };
}

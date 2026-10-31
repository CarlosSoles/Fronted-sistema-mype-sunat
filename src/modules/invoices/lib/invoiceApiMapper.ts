/**
 * Adaptador entre el DTO del backend (TA-29) y el modelo que pinta la grilla.
 *
 * La grilla (`ComprobanteDemo`) se diseñó sobre datos semilla y expone más
 * campos de los que el backend guarda hoy: detracción, retención, cuotas y
 * líneas. Se rellenan con valores neutros y documentados en vez de inventar
 * montos; el total y el IGV sí vienen del backend cuando están disponibles.
 */
import type { EstadoCdrDemo, ComprobanteDemo, TipoComprobante } from '../data/invoiceDemoSchema';
import { descripcionCdr } from '../data/invoiceDemoHelpers';
import type { CreateInvoicePayload, InvoiceListado } from '../types/invoice.types';

/** Redondeo a dos decimales, igual que el resto del módulo. */
const round2 = (valor: number): number => Math.round(valor * 100) / 100;

/**
 * Estados del backend → estados que entiende el badge.
 *
 * Los estados intermedios del outbox (PENDIENTE, EN_COLA, PROCESANDO,
 * ENVIADO, ERROR_RED) se muestran como "en cola": el CDR todavía no llegó.
 */
const ESTADOS: Record<string, EstadoCdrDemo> = {
  ACEPTADO: 'ACEPTADO',
  OBSERVADO: 'OBSERVADO',
  RECHAZADO: 'RECHAZADO',
  ANULADO: 'RECHAZADO',
};

/** Tipos UBL que la grilla distingue; el resto se trata como factura. */
const TIPOS: Record<string, TipoComprobante> = {
  '03': '03',
  '07': '07',
  '08': '08',
};

/**
 * Fecha del comprobante en la zona del equipo.
 *
 * `fecha_emision` llega en ISO UTC: cortar el string daría el día siguiente
 * para una emisión después de las 19:00 en Lima.
 */
function fechaLocal(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso.slice(0, 10);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Convierte una fila del backend al modelo de la grilla. */
export function aComprobanteDemo(item: InvoiceListado): ComprobanteDemo {
  const total = Number(item.monto_total ?? 0);
  const base = item.base_imponible ?? round2(total / 1.18);
  const igv = item.total_igv ?? round2(total - base);
  const documento = item.cliente_documento ?? '';

  return {
    id: item.id,
    tipo: TIPOS[item.tipo_comprobante] ?? '01',
    serie: item.serie,
    correlativo: item.correlativo,
    clienteRuc: documento,
    clienteTipoDoc: documento.length === 11 ? '6' : '1',
    clienteRazonSocial: item.cliente_nombre ?? 'Sin nombre registrado',
    fechaEmision: fechaLocal(item.fecha_emision),
    moneda: item.moneda === 'USD' ? 'USD' : 'PEN',
    baseImponible: base,
    igv,
    // El backend todavía no persiste detracción ni retención por comprobante.
    detraccion: 0,
    retencion: 0,
    totalNeto: total,
    estado: ESTADOS[item.estado] ?? 'EN_COLA',
    cdrCodigo: item.cdr_codigo ?? undefined,
    documentoAfectado: item.documento_afectado ?? undefined,
    tipoOperacion: '0101',
    formaPago: 'Contado',
    cuotas: [],
    cdrDescripcion: item.cdr_codigo
      ? descripcionCdr(item.cdr_codigo)
      : 'Sin CDR: el comprobante aún no tiene respuesta de SUNAT',
    hashCpe: item.hash_cpe ?? '',
    items: [],
  };
}

/** Datos del emisor que viajan al comprobante (salen de la sesión). */
export interface EmisorDatos {
  ruc: string;
  razonSocial: string;
}

/**
 * Convierte el comprobante de la grilla en el payload de alta del backend.
 *
 * El contrato `payload_ubl` es el que consume el generador UBL 2.1
 * (`InvoicePayload`), no una copia libre: si cambia el generador, este mapeo
 * debe cambiar con él.
 */
export function aPayloadCreacion(
  comprobante: ComprobanteDemo,
  emisor: EmisorDatos,
): CreateInvoicePayload {
  const lineas = comprobante.items.map((item, index) => {
    const neto = round2(item.valorUnitario * item.cantidad);
    const igvLinea = round2(neto * 0.18);

    return {
      id: index + 1,
      descripcion: item.descripcion,
      codigo: item.codigo || undefined,
      unidad: item.unidad,
      cantidad: item.cantidad,
      valorUnitario: item.valorUnitario,
      precioUnitario: round2(item.valorUnitario * 1.18),
      afectacion: '10',
      totalLinea: round2(neto + igvLinea),
      igvLinea,
    };
  });

  const total = round2(comprobante.baseImponible + comprobante.igv);

  return {
    ruc_emisor: emisor.ruc,
    serie: comprobante.serie,
    correlativo: comprobante.correlativo,
    tipo_comprobante: comprobante.tipo,
    monto_total: total,
    fecha_emision: comprobante.fechaEmision,
    payload_ubl: {
      rucEmisor: emisor.ruc,
      razonSocialEmisor: emisor.razonSocial,
      tipoComprobante: comprobante.tipo,
      serie: comprobante.serie,
      numero: comprobante.correlativo,
      fechaEmision: comprobante.fechaEmision,
      tipoMoneda: comprobante.moneda,
      tipoOperacion: comprobante.tipoOperacion,
      formaPago: comprobante.formaPago,
      cliente: {
        tipoDocumento: comprobante.clienteTipoDoc,
        numeroDocumento: comprobante.clienteRuc,
        razonSocial: comprobante.clienteRazonSocial,
      },
      lineas,
      montoGravado: comprobante.baseImponible,
      montoIgv: comprobante.igv,
      montoTotal: total,
      ...(comprobante.documentoAfectado
        ? { documentoAfectado: comprobante.documentoAfectado }
        : {}),
      ...(comprobante.detraccion > 0
        ? { montoDetraccion: comprobante.detraccion }
        : {}),
      ...(comprobante.retencion > 0
        ? { montoRetencion: comprobante.retencion }
        : {}),
    },
  };
}

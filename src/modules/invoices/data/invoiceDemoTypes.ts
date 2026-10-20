/**
 * Fábrica de comprobantes de demostración (M1). Los montos se derivan con el
 * motor real de `../lib/invoiceCalculations`. Los tipos viven en
 * `./invoiceDemoSchema` y las utilidades de simulación (CDR, hash, cuotas) en
 * `./invoiceDemoHelpers`.
 */
import {
  calcularDetraccion,
  calcularRetencion,
  igvDesdeBase,
  round2,
} from '../lib/invoiceCalculations';
import {
  construirCuotas,
  descripcionCdr,
  hashSimulado,
} from './invoiceDemoHelpers';
import { itemsPorDefecto } from './invoiceDemoItems';
import type {
  ComprobanteDemo,
  FormaPago,
  ItemDemo,
  SemillaComprobante,
  TipoOperacion,
} from './invoiceDemoSchema';

export type {
  ComprobanteDemo,
  CuotaDemo,
  EstadoCdrDemo,
  FormaPago,
  ItemDemo,
  MotivoNota,
  SemillaComprobante,
  TipoComprobante,
  TipoOperacion,
} from './invoiceDemoSchema';

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

import { describe, it, expect } from 'vitest';
/**
 * Adaptador del listado del backend al modelo de la grilla (TA-29).
 *
 * Lo que se prueba aquí es lo que puede mentir: que los montos vengan del
 * backend cuando existen, que los estados intermedios no se pinten como
 * aceptados y que un comprobante sin CDR no se anuncie como validado.
 */
import { aComprobanteDemo } from '@/modules/invoices/lib/invoiceApiMapper';
import type { InvoiceListado } from '@/modules/invoices/types/invoice.types';

function fila(overrides: Partial<InvoiceListado> = {}): InvoiceListado {
  return {
    id: 'inv-1',
    tipo_comprobante: '01',
    serie: 'F001',
    correlativo: 7,
    numero: 'F001-00000007',
    fecha_emision: '2026-10-30T15:00:00.000Z',
    estado: 'ACEPTADO',
    monto_total: 118,
    moneda: 'PEN',
    cliente_documento: '20100070970',
    cliente_nombre: 'CLIENTE DE PRUEBA',
    cdr_codigo: '0',
    ...overrides,
  };
}

describe('invoiceApiMapper', () => {
  it('usa la base y el IGV reales cuando el backend los envía', () => {
    const comprobante = aComprobanteDemo(
      fila({ base_imponible: 100, total_igv: 18 }),
    );

    expect(comprobante.baseImponible).toBe(100);
    expect(comprobante.igv).toBe(18);
    expect(comprobante.totalNeto).toBe(118);
    expect(comprobante.estado).toBe('ACEPTADO');
  });

  it('deriva el 18% solo si el backend no manda los montos', () => {
    const comprobante = aComprobanteDemo(fila({ monto_total: 1180 }));

    expect(comprobante.baseImponible).toBe(1000);
    expect(comprobante.igv).toBe(180);
  });

  it('trata los estados intermedios como "en cola", no como aceptados', () => {
    for (const estado of ['PENDIENTE', 'EN_COLA', 'PROCESANDO', 'ENVIADO', 'ERROR_RED']) {
      expect(aComprobanteDemo(fila({ estado })).estado).toBe('EN_COLA');
    }
    expect(aComprobanteDemo(fila({ estado: 'ANULADO' })).estado).toBe('RECHAZADO');
  });

  it('no anuncia un CDR cuando el comprobante todavía no lo tiene', () => {
    const comprobante = aComprobanteDemo(fila({ cdr_codigo: null }));

    expect(comprobante.cdrCodigo).toBeUndefined();
    expect(comprobante.cdrDescripcion).toMatch(/Sin CDR/);
  });

  it('conserva el documento afectado de las notas de crédito', () => {
    const comprobante = aComprobanteDemo(
      fila({ tipo_comprobante: '07', documento_afectado: 'F001-00000001' }),
    );

    expect(comprobante.tipo).toBe('07');
    expect(comprobante.documentoAfectado).toBe('F001-00000001');
  });
});

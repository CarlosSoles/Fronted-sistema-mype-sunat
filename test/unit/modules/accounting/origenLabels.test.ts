import { describe, expect, it, vi } from 'vitest';
import { etiquetaOrigen, esAnulacion, ORIGEN_LABELS } from '@/modules/accounting/lib/origenLabels';

/**
 * La columna ORIGEN nunca debe mostrar el código crudo. Estos son los códigos
 * que existen hoy en la base de producción, más los que el código escribe.
 */
describe('etiquetaOrigen', () => {
  it.each([
    ['M1_INVOICES', 'Facturación'],
    ['INVOICES', 'Facturación'],
    ['CUSTOMS_IMPORT', 'Importaciones'],
    ['PURCHASES_IMPORT', 'Importaciones'],
    ['PURCHASES', 'Compras'],
    ['PURCHASES_RECEPTION', 'Recepción de compras'],
    ['MANUAL_PAYABLE', 'Cuenta por pagar manual'],
    ['COLLECTIONS', 'Cobranzas'],
    ['EXPENSES', 'Gastos'],
    ['CLOSING', 'Cierre contable'],
    ['MANUAL', 'Asiento manual'],
    ['MIGRATION', 'Migración de saldos'],
  ])('traduce %s a "%s"', (codigo, esperado) => {
    expect(etiquetaOrigen(codigo)).toBe(esperado);
  });

  it('un código desconocido se hace legible, nunca se muestra crudo', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(etiquetaOrigen('IMPORT_COSTS')).toBe('Import costs');
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });

  it('avisa una sola vez por código desconocido', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    etiquetaOrigen('OTRO_CODIGO_RARO');
    etiquetaOrigen('OTRO_CODIGO_RARO');
    expect(aviso).toHaveBeenCalledTimes(1);
    aviso.mockRestore();
  });

  it('ningún valor del diccionario queda en mayúsculas sostenidas ni con guiones bajos', () => {
    // SIRE es una sigla oficial y va en mayúsculas a propósito.
    const siglas = new Set(['SIRE']);
    for (const [codigo, texto] of Object.entries(ORIGEN_LABELS)) {
      expect(texto, codigo).not.toMatch(/_/);
      if (!siglas.has(texto)) {
        expect(texto, codigo).not.toBe(texto.toUpperCase());
      }
      expect(texto.charAt(0), codigo).toBe(texto.charAt(0).toUpperCase());
    }
  });

  it('sin origen devuelve un texto, no vacío', () => {
    expect(etiquetaOrigen(null)).toBe('Sin origen');
    expect(etiquetaOrigen('')).toBe('Sin origen');
  });

  it('detecta las anulaciones por el prefijo ANUL', () => {
    expect(esAnulacion('ANUL-b2b59a20')).toBe(true);
    expect(esAnulacion('ANUL-PAGO-5fac8124')).toBe(true);
    expect(esAnulacion('F001-00000001')).toBe(false);
    expect(esAnulacion(null)).toBe(false);
  });
});

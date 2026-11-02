/**
 * Cálculo del siguiente correlativo (pantalla de emisión).
 *
 * Es la regla que evita dos comprobantes con el mismo número: se prueba sin
 * montar la pantalla, con datos de otras series y con filas inválidas.
 */
import { describe, expect, it } from 'vitest';
import { siguienteCorrelativo } from '@/modules/invoices/lib/invoiceCorrelativo';

describe('siguienteCorrelativo', () => {
  it('empieza en 1 cuando la serie no tiene comprobantes', () => {
    expect(siguienteCorrelativo([], 'F001')).toBe(1);
  });

  it('toma el mayor de la serie y suma uno', () => {
    const comprobantes = [
      { serie: 'F001', correlativo: 7 },
      { serie: 'F001', correlativo: 3 },
      { serie: 'F001', correlativo: 12 },
    ];

    expect(siguienteCorrelativo(comprobantes, 'F001')).toBe(13);
  });

  it('ignora los comprobantes de otras series', () => {
    const comprobantes = [
      { serie: 'B001', correlativo: 99 },
      { serie: 'F001', correlativo: 4 },
    ];

    expect(siguienteCorrelativo(comprobantes, 'F001')).toBe(5);
  });

  it('descarta correlativos inválidos en lugar de romper el cálculo', () => {
    const comprobantes = [
      { serie: 'F001', correlativo: 0 },
      { serie: 'F001', correlativo: Number.NaN },
      { serie: 'F001', correlativo: 5 },
    ];

    expect(siguienteCorrelativo(comprobantes, 'F001')).toBe(6);
  });
});

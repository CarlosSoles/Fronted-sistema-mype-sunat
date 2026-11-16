import { describe, expect, it } from 'vitest';
import { formatDateToPeru } from '@/lib/formatters';

/**
 * La fecha contable es un día calendario, no un instante. Si se formatea como
 * instante en la zona de Lima, la medianoche UTC retrocede al día anterior y la
 * lista muestra asientos fuera del rango filtrado.
 */
describe('formatDateToPeru · fechas calendario', () => {
  it('una fecha pura se muestra tal cual', () => {
    expect(formatDateToPeru('2026-11-01')).toBe('01/11/2026');
  });

  it('una fecha con hora en UTC no retrocede de día', () => {
    expect(formatDateToPeru('2026-11-01T00:00:00.000Z')).toBe('01/11/2026');
    expect(formatDateToPeru('2026-10-31T19:00:00.000Z')).toBe('31/10/2026');
  });

  it('una fecha con desplazamiento horario conserva el día escrito', () => {
    expect(formatDateToPeru('2026-10-31T23:30:00-05:00')).toBe('31/10/2026');
  });

  it('un valor vacío o inválido no rompe', () => {
    expect(formatDateToPeru(null)).toBe('-');
    expect(formatDateToPeru('no-es-fecha')).toBe('-');
  });
});

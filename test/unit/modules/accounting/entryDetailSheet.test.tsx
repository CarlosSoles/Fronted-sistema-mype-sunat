import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EntryDetailSheet, type EntryDetail } from '@/modules/accounting/components/EntryDetailSheet';

const ASIENTO: EntryDetail = {
  id: 'entry-1',
  numero: 'MISC/2026/10/0001',
  fecha: '2026-10-17',
  glosa: 'Costo de ventas (mercadería) F001-000003',
  origen: 'Facturación',
  referencia: 'F001-000003',
  lineas: [
    { code: '691', name: 'Costo de ventas de mercaderías', debit: 0.95, credit: 0 },
    { code: '201', name: 'Mercaderías', debit: 0, credit: 0.95 },
  ],
};

afterEach(() => cleanup());

describe('EntryDetailSheet', () => {
  it('muestra los datos del asiento y sus líneas', () => {
    render(<EntryDetailSheet entry={ASIENTO} open onOpenChange={vi.fn()} />);

    expect(screen.getByText('MISC/2026/10/0001')).toBeTruthy();
    expect(screen.getByText('Costo de ventas (mercadería) F001-000003')).toBeTruthy();
    expect(screen.getByText('691')).toBeTruthy();
    expect(screen.getByText('Costo de ventas de mercaderías')).toBeTruthy();
    expect(screen.getByText('Líneas del asiento (2)')).toBeTruthy();
    expect(screen.getByText('Asiento cuadrado')).toBeTruthy();
  });

  it('avisa cuando el asiento no está cuadrado', () => {
    render(
      <EntryDetailSheet
        entry={{ ...ASIENTO, lineas: [ASIENTO.lineas[0]] }}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Asiento descuadrado')).toBeTruthy();
  });

  it('no revienta si el asiento no se pudo cargar', () => {
    render(<EntryDetailSheet entry={null} open onOpenChange={vi.fn()} />);
    expect(screen.getByText('No se pudo cargar el asiento.')).toBeTruthy();
  });
});

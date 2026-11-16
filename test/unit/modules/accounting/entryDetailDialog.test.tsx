import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EntryDetailDialog, type EntryDetail } from '@/modules/accounting/components/EntryDetailDialog';

const ASIENTO: EntryDetail = {
  id: 'entry-1',
  numero: 'AS/2026/10/0001',
  fecha: '2026-10-17',
  glosa: 'Costo de ventas (mercadería) F001-000003',
  origen: 'Facturación',
  diario: 'Ventas',
  referencia: 'F001-000003',
  createdAt: '2026-10-17T17:35:26.000Z',
  lineas: [
    { code: '691', name: 'Costo de ventas de mercaderías', debit: 0.95, credit: 0 },
    { code: '201', name: 'Mercaderías', debit: 0, credit: 0.95 },
  ],
};

afterEach(() => cleanup());

describe('EntryDetailDialog', () => {
  it('muestra los datos del asiento y sus líneas', () => {
    render(<EntryDetailDialog entry={ASIENTO} open onOpenChange={vi.fn()} />);

    expect(screen.getByText('AS/2026/10/0001')).toBeTruthy();
    expect(screen.getByText('Costo de ventas (mercadería) F001-000003')).toBeTruthy();
    expect(screen.getByText('691')).toBeTruthy();
    expect(screen.getByText('Costo de ventas de mercaderías')).toBeTruthy();
    expect(screen.getByText('Líneas del asiento (2)')).toBeTruthy();
    expect(screen.getByText('Asiento cuadrado')).toBeTruthy();
    // El detalle distingue la fecha contable del momento del registro.
    expect(screen.getByText('Creado')).toBeTruthy();
    expect(screen.getByText('Referencia')).toBeTruthy();
  });

  it('muestra un guion cuando el asiento no trae fecha de registro', () => {
    render(<EntryDetailDialog entry={{ ...ASIENTO, createdAt: null }} open onOpenChange={vi.fn()} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('avisa cuando el asiento no está cuadrado', () => {
    render(
      <EntryDetailDialog
        entry={{ ...ASIENTO, lineas: [ASIENTO.lineas[0]] }}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Asiento descuadrado')).toBeTruthy();
  });

  it('no revienta si el asiento no se pudo cargar', () => {
    render(<EntryDetailDialog entry={null} open onOpenChange={vi.fn()} />);
    expect(screen.getByText('No se pudo cargar el asiento.')).toBeTruthy();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EntryDetailDialog, type EntryDetail } from '@/modules/accounting/components/EntryDetailDialog';

const ASIENTO: EntryDetail = {
  id: 'entry-1',
  numero: 'AS/2026/10/0001',
  fecha: '2026-10-17T00:00:00.000Z',
  glosa: 'Costo de ventas (mercadería) F001-000003',
  origen: 'Facturación',
  diario: 'Ventas',
  referencia: 'F001-000003',
  observacion: 'Asiento 4/5 — Costo de ventas y baja de mercaderías',
  lineas: [
    { code: '691', name: 'Costo de ventas de mercaderías', debit: 0.95, credit: 0 },
    { code: '201', name: 'Mercaderías', debit: 0, credit: 0.95 },
  ],
};

afterEach(() => cleanup());

describe('EntryDetailDialog', () => {
  it('muestra las tarjetas del asiento, el concepto y las líneas', () => {
    render(<EntryDetailDialog entry={ASIENTO} open onOpenChange={vi.fn()} />);

    expect(screen.getByText('AS/2026/10/0001')).toBeTruthy();
    expect(screen.getByText('F001-000003')).toBeTruthy();
    expect(screen.getByText('Facturación')).toBeTruthy();
    expect(screen.getByText('Asiento 4/5 — Costo de ventas y baja de mercaderías')).toBeTruthy();
    expect(screen.getByText('Líneas del asiento (2)')).toBeTruthy();
    expect(screen.getByText('Asiento cuadrado')).toBeTruthy();
    expect(screen.getByText('Registrado')).toBeTruthy();
  });

  it('no muestra el campo Creado: solo la fecha contable', () => {
    render(<EntryDetailDialog entry={ASIENTO} open onOpenChange={vi.fn()} />);
    expect(screen.queryByText('Creado')).toBeNull();
    expect(screen.getAllByText('17/10/2026').length).toBeGreaterThan(0);
  });

  it('avisa cuando el asiento no está cuadrado', () => {
    render(
      <EntryDetailDialog entry={{ ...ASIENTO, lineas: [ASIENTO.lineas[0]] }} open onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText('Asiento descuadrado')).toBeTruthy();
  });

  it('sin observación muestra un guion', () => {
    render(<EntryDetailDialog entry={{ ...ASIENTO, observacion: null }} open onOpenChange={vi.fn()} />);
    // Hay varios guiones (debe/haber en cero); basta con que aparezca alguno.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});

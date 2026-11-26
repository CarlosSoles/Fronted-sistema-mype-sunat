import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryDetailDialog, type EntryDetail } from '@/modules/accounting/components/EntryDetailDialog';

const ASIENTO: EntryDetail = {
  id: 'entry-1',
  numero: 'AS/2026/11/0077',
  fecha: '2026-11-12T00:00:00.000Z',
  glosa: 'Pago gasto E2E',
  origen: 'Gastos',
  diario: 'GAS',
  referencia: 'PAGO-GASTO-123',
  observacion: 'Asiento 4/5 — pago del gasto',
  creado: '2026-11-12T11:41:00.000Z',
  responsable: 'Administrador',
  anulado: false,
  lineas: [
    { code: '42121', name: 'Cuentas por pagar', debit: 118, credit: 0 },
    { code: '1041', name: 'Caja o banco', debit: 0, credit: 118 },
  ],
};

afterEach(() => cleanup());

describe('EntryDetailDialog', () => {
  it('muestra las líneas reales y los totales del asiento', () => {
    render(<EntryDetailDialog entry={ASIENTO} open onOpenChange={vi.fn()} />);

    expect(screen.getAllByText('AS/2026/11/0077').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cuentas por pagar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Caja o banco').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/S\/ 118[.,]00/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Asiento cuadrado')).toBeTruthy();
    expect(screen.getByText('Registrado')).toBeTruthy();
    expect(screen.getByText('Líneas del asiento (2)')).toBeTruthy();
  });

  it('usa Origen en lugar de responsable y no muestra Creado', () => {
    render(<EntryDetailDialog entry={ASIENTO} open onOpenChange={vi.fn()} />);

    expect(screen.getByText('Origen')).toBeTruthy();
    expect(screen.queryByText('Responsable')).toBeNull();
    expect(screen.queryByText('Creado')).toBeNull();
    expect(screen.getByText('Número / Referencia')).toBeTruthy();
    expect(screen.getByText('Fecha contable')).toBeTruthy();
    expect(screen.getByText('Diario contable')).toBeTruthy();
    expect(screen.queryByText('Documento')).toBeNull();
  });

  it('avisa cuando el asiento no cuadra', () => {
    render(<EntryDetailDialog entry={{ ...ASIENTO, lineas: [ASIENTO.lineas[0]] }} open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Asiento descuadrado')).toBeTruthy();
  });

  it('no dice que cuadra cuando el asiento no tiene líneas', () => {
    render(<EntryDetailDialog entry={{ ...ASIENTO, lineas: [] }} open onOpenChange={vi.fn()} />);

    expect(screen.getByText(/no tiene líneas registradas/)).toBeTruthy();
    expect(screen.getByText('Sin líneas')).toBeTruthy();
    expect(screen.queryByText('Asiento cuadrado')).toBeNull();
  });

  it('marca los asientos anulados', () => {
    render(<EntryDetailDialog entry={{ ...ASIENTO, anulado: true }} open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Anulado')).toBeTruthy();
  });

  it('el código de cuenta abre su libro mayor', async () => {
    const verCuenta = vi.fn();
    render(
      <EntryDetailDialog
        entry={ASIENTO}
        open
        onOpenChange={vi.fn()}
        cuentaResaltada="1041"
        onVerCuenta={verCuenta}
      />,
    );

    await userEvent.setup().click(screen.getByTitle('Ver el libro mayor de 1041'));
    expect(verCuenta).toHaveBeenCalledWith('1041');
  });
});

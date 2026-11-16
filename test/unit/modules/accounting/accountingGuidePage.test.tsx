import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountingGuidePage from '@/modules/accounting/pages/AccountingGuidePage';

afterEach(() => cleanup());

/**
 * La guía contable es documentación: debe explicar los asientos reales que
 * genera el sistema, con las cuentas que usa el puente.
 */
describe('AccountingGuidePage', () => {
  const montar = () =>
    render(
      <MemoryRouter>
        <AccountingGuidePage />
      </MemoryRouter>,
    );

  it('explica los cinco procesos contables', () => {
    montar();
    for (const proceso of ['Ventas', 'Compras', 'Gastos y cobranzas', 'Importaciones', 'Cierre del ejercicio']) {
      expect(screen.getByText(proceso)).toBeTruthy();
    }
  });

  it('muestra los asientos de venta con sus cuentas reales', () => {
    montar();
    expect(screen.getByText(/Provisión de la venta/)).toBeTruthy();
    // "Costo de ventas" aparece como título del asiento y como nombre de cuenta.
    expect(screen.getAllByText(/Costo de ventas/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('12121').length).toBeGreaterThan(0);
    expect(screen.getAllByText('40111').length).toBeGreaterThan(0);
    expect(screen.getAllByText('70121').length).toBeGreaterThan(0);
  });

  it('aclara qué operaciones no generan asiento', () => {
    montar();
    expect(screen.getByText('Qué no genera asiento')).toBeTruthy();
  });
});

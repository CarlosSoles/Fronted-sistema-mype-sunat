import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountingGuidePage from '@/modules/accounting/pages/AccountingGuidePage';

// La guía consulta las reglas de la empresa para marcar cada proceso como
// personalizado o por defecto; se simula la respuesta para no salir a la red.
vi.mock('@/modules/accounting/services/accountingApi', () => ({
  accountingApi: {
    getRules: vi.fn().mockResolvedValue([
      { id: '1', process_code: 'VENTA', document_type: '*', line_order: 1, account_code: '12121', side: 'DEBE', base_calculation: 'TOTAL', is_active: true },
    ]),
  },
}));

afterEach(() => cleanup());

/**
 * La guía contable es documentación viva: debe explicar los asientos reales que
 * genera el sistema, con las cuentas que usa, y permitir simular un importe.
 */
describe('AccountingGuidePage', () => {
  const montar = () => {
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter>
          <AccountingGuidePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('explica los cinco procesos contables', () => {
    montar();
    for (const proceso of ['Ventas', 'Compras', 'Gastos', 'Importaciones', 'Cierre del ejercicio']) {
      expect(screen.getAllByText(proceso).length).toBeGreaterThan(0);
    }
  });

  it('muestra los asientos de venta con sus cuentas reales', () => {
    montar();
    expect(screen.getAllByText(/Provisión de la venta/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('12121').length).toBeGreaterThan(0);
    expect(screen.getAllByText('40111').length).toBeGreaterThan(0);
    expect(screen.getAllByText('70121').length).toBeGreaterThan(0);
  });

  it('muestra el asiento en formato tabla con totales que cuadran', () => {
    montar();
    expect(screen.getAllByText('Denominación').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cuadra ✓').length).toBeGreaterThan(0);
  });

  it('permite simular un importe y calcula el IGV', () => {
    montar();
    // Con 118.00: base 100.00 e IGV 18.00.
    expect(screen.getAllByText(/S\/ 100[.,]00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/S\/ 18[.,]00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/S\/ 118[.,]00/).length).toBeGreaterThan(0);
  });

});

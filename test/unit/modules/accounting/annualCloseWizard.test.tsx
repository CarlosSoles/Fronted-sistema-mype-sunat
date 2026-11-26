import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnnualCloseWizard } from '@/modules/accounting/components/AnnualCloseWizard';
import { accountingApi } from '@/modules/accounting/services/accountingApi';

vi.mock('@/modules/accounting/services/accountingApi', () => ({
  accountingApi: {
    getClosingPreview: vi.fn(),
    closePeriod: vi.fn(),
    generateClosingEntry: vi.fn(),
    closeFiscalYear: vi.fn(),
  },
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const periodo = (month: number, status: 'ABIERTO' | 'CERRADO') => ({
  companyId: 'c1',
  period: `2026-${String(month).padStart(2, '0')}`,
  year: 2026,
  month,
  status,
  openedAt: '2026-01-01',
  closedAt: null,
});

const montar = (periods: ReturnType<typeof periodo>[]) => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onAviso = vi.fn();
  render(
    <QueryClientProvider client={cliente}>
      <AnnualCloseWizard year={2026} periods={periods} abierto onCerrar={vi.fn()} onAviso={onAviso} />
    </QueryClientProvider>,
  );
  return { onAviso };
};

describe('AnnualCloseWizard', () => {
  it('muestra los cuatro pasos del cierre', () => {
    vi.mocked(accountingApi.getClosingPreview).mockResolvedValue({
      year: 2026, totalIngresos: 0, totalGastos: 0, resultado: 0, tipo: 'SIN RESULTADO', lineas: [], tieneAsientoCierre: false,
    } as never);
    montar([periodo(11, 'CERRADO'), periodo(12, 'ABIERTO')]);

    expect(screen.getByText('Revisar pendientes')).toBeTruthy();
    expect(screen.getByText('Cerrar los meses de enero a noviembre')).toBeTruthy();
    expect(screen.getByText('Generar el asiento de cierre')).toBeTruthy();
    expect(screen.getByText('Cerrar diciembre y el año')).toBeTruthy();
  });

  it('cierra los meses de enero a noviembre que sigan abiertos', async () => {
    vi.mocked(accountingApi.getClosingPreview).mockResolvedValue({
      year: 2026, totalIngresos: 0, totalGastos: 0, resultado: 0, tipo: 'SIN RESULTADO', lineas: [], tieneAsientoCierre: false,
    } as never);
    vi.mocked(accountingApi.closePeriod).mockResolvedValue({} as never);

    const { onAviso } = montar([periodo(1, 'ABIERTO'), periodo(2, 'CERRADO'), periodo(12, 'ABIERTO')]);

    await userEvent.setup().click(await screen.findByRole('button', { name: /Cerrar los meses pendientes/ }));

    await waitFor(() => expect(accountingApi.closePeriod).toHaveBeenCalledWith('2026-01'));
    // Diciembre no se cierra en este paso: se cierra al final.
    expect(accountingApi.closePeriod).not.toHaveBeenCalledWith('2026-12');
    await waitFor(() => expect(onAviso).toHaveBeenCalled());
  });

  it('muestra el resultado del ejercicio antes de generar el asiento', async () => {
    vi.mocked(accountingApi.getClosingPreview).mockResolvedValue({
      year: 2026,
      totalIngresos: 1180,
      totalGastos: 600,
      resultado: 580,
      tipo: 'UTILIDAD',
      lineas: [],
      tieneAsientoCierre: false,
    } as never);

    montar([periodo(11, 'CERRADO'), periodo(12, 'ABIERTO')]);

    await userEvent.setup().click(screen.getByRole('button', { name: /Generar el asiento de cierre/ }));

    expect(await screen.findByText('UTILIDAD')).toBeTruthy();
    expect(screen.getAllByText(/S\/ 580[.,]00/).length).toBeGreaterThan(0);
  });
});

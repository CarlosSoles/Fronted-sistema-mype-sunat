import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AccountingTrialBalancePage from '@/modules/accounting/pages/AccountingTrialBalancePage';
import { accountingApi } from '@/modules/accounting/services/accountingApi';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const montar = () => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>
        <AccountingTrialBalancePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('Balance de Comprobación', () => {
  it('muestra saldo inicial, debe, haber y saldo final con sus totales', async () => {
    vi.spyOn(accountingApi, 'getTrialBalance').mockResolvedValue({
      period: '2026-11',
      rows: [
        { accountCode: '101', accountName: 'Caja', openingBalance: 100, debit: 50, credit: 20, balance: 130 },
        { accountCode: '701', accountName: 'Ventas', openingBalance: 0, debit: 0, credit: 130, balance: -130 },
      ],
      totalDebit: 50,
      totalCredit: 150,
      totalOpening: 100,
      totalBalance: 0,
    });

    montar();

    expect(await screen.findByText('Caja')).toBeTruthy();
    // Encabezados en dos niveles: Balance inicial / período / Balance final.
    expect(screen.getByText('Balance inicial')).toBeTruthy();
    expect(screen.getByText('Balance final')).toBeTruthy();
    expect(screen.getByText('TOTAL')).toBeTruthy();
    expect(screen.getByLabelText('Descargar CSV')).toBeTruthy();
  });

  it('muestra la diferencia final cuando debe y haber no coinciden', async () => {
    vi.spyOn(accountingApi, 'getTrialBalance').mockResolvedValue({
      period: '2026-11',
      rows: [{ accountCode: '101', accountName: 'Caja', openingBalance: 0, debit: 50, credit: 0, balance: 50 }],
      totalDebit: 50,
      totalCredit: 10,
      totalOpening: 0,
      totalBalance: 50,
    });

    montar();

    // La diferencia se informa en la tarjeta inferior, no en una barra aparte.
    expect(await screen.findByText('Diferencia final')).toBeTruthy();
  });
});

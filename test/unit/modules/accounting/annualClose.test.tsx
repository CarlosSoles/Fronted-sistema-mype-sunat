import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountingPeriodsPage from '@/modules/accounting/pages/AccountingPeriodsPage';
import { accountingApi } from '@/modules/accounting/services/accountingApi';

vi.mock('@/modules/accounting/services/accountingApi', () => ({
  accountingApi: {
    getPeriods: vi.fn(),
    openPeriod: vi.fn(),
    closePeriod: vi.fn(),
    openFiscalYear: vi.fn(),
    closeFiscalYear: vi.fn(),
    generateClosingEntry: vi.fn(),
    closeAnnual: vi.fn(),
  },
}));

const periodo = (status: 'ABIERTO' | 'CERRADO') => ({
  id: `2026-12-${status}`, companyId: 'c1', period: '2026-12', year: 2026, month: 12,
  status, openedAt: '2026-12-01', closedAt: status === 'CERRADO' ? '2026-12-31' : null,
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('cierra el año completo y muestra que el asiento fue creado', async () => {
  vi.mocked(accountingApi.getPeriods).mockResolvedValue([periodo('ABIERTO')] as never);
  vi.mocked(accountingApi.closeAnnual).mockResolvedValue({ closingEntryCreated: true, periods: [periodo('CERRADO')] } as never);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const q = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={q}><AccountingPeriodsPage /></QueryClientProvider>);

  const boton = await screen.findByRole('button', { name: /Cerrar año completo/ });
  await userEvent.setup().click(boton);
  await waitFor(() => expect(accountingApi.closeAnnual).toHaveBeenCalledWith(2026));
  expect(await screen.findByText(/Asiento de cierre generado y año bloqueado/)).toBeTruthy();
});

it('informa cuando el asiento de cierre ya existía', async () => {
  vi.mocked(accountingApi.getPeriods).mockResolvedValue([periodo('ABIERTO')] as never);
  vi.mocked(accountingApi.closeAnnual).mockResolvedValue({ closingEntryCreated: false, periods: [periodo('CERRADO')] } as never);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const q = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={q}><AccountingPeriodsPage /></QueryClientProvider>);

  const boton = await screen.findByRole('button', { name: /Cerrar año completo/ });
  await userEvent.setup().click(boton);
  expect(await screen.findByText(/ya existía; año bloqueado/)).toBeTruthy();
});

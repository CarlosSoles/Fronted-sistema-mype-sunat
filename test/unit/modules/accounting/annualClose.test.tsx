import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
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
    reopenPeriod: vi.fn(),
    getClosingPreview: vi.fn(),
  },
}));

const periodo = (month: number, status: 'ABIERTO' | 'CERRADO') => ({
  id: `2026-${month}-${status}`,
  companyId: 'c1',
  period: `2026-${String(month).padStart(2, '0')}`,
  year: 2026,
  month,
  status,
  openedAt: '2026-01-01',
  closedAt: status === 'CERRADO' ? '2026-01-31' : null,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const montar = () => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>
        <AccountingPeriodsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

/**
 * La tabla de Períodos muestra solo los meses: el año va en un encabezado de
 * texto, no en una fila dentro de las columnas.
 */
it('muestra el año como encabezado y no como fila de la tabla', async () => {
  vi.mocked(accountingApi.getPeriods).mockResolvedValue([
    periodo(11, 'ABIERTO'),
    periodo(12, 'CERRADO'),
  ] as never);
  montar();

  expect(await screen.findByText('Año fiscal 2026')).toBeTruthy();
  // Sin celdas con el texto del año: no hay fila de agrupación dentro de la tabla.
  expect(screen.queryAllByRole('cell', { name: /Año fiscal 2026/ })).toHaveLength(0);
  // Los meses aparecen como rango de fechas: inicio y fin.
  expect(screen.getAllByRole('cell', { name: '01/11/2026' }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('cell', { name: '30/11/2026' }).length).toBeGreaterThan(0);
});

it('muestra los contadores del año y la acción de cierre guiado', async () => {
  vi.mocked(accountingApi.getPeriods).mockResolvedValue([
    periodo(11, 'ABIERTO'),
    periodo(12, 'CERRADO'),
  ] as never);
  montar();

  expect(await screen.findByText('1 abierto(s) · 1 cerrado(s)')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /Cierre guiado/ }).length).toBeGreaterThan(0);
});

it('con todos los años no ofrece el menú de acciones del año', async () => {
  vi.mocked(accountingApi.getPeriods).mockResolvedValue([periodo(11, 'ABIERTO')] as never);
  montar();

  await screen.findByText('Año fiscal 2026');
  expect(screen.queryByRole('button', { name: /Más acciones del año/ })).toBeNull();
});

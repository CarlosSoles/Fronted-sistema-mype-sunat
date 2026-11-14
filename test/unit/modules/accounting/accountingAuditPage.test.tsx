import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountingAuditPage from '@/modules/accounting/pages/AccountingAuditPage';
import { accountingApi } from '@/modules/accounting/services/accountingApi';

vi.mock('@/modules/accounting/services/accountingApi', () => ({
  accountingApi: {
    getAudit: vi.fn(),
    regularizarComprobantes: vi.fn(),
  },
}));

const informe = (over: Record<string, any> = {}) => ({
  companyId: 'c1',
  period: null,
  generatedAt: '2026-11-13T00:00:00.000Z',
  ok: false,
  catalogo: { total: 1700, activas: 1690 },
  reglas: {
    procesos: ['GASTO', 'VENTA'],
    total: 14,
    issues: [
      { severity: 'ERROR', code: 'CUENTA_MADRE', process: 'VENTA', lineOrder: 9, message: 'VENTA línea 9: la cuenta PCGE 74 es de mayor y tiene subcuentas; use una subcuenta' },
      { severity: 'WARN', code: 'PROCESO_INCOMPLETO', process: 'VENTA', message: 'VENTA: sin regla para las líneas 10, 11' },
    ],
  },
  asientos: {
    revisados: 4,
    truncado: false,
    descuadrados: [{ id: 'e1', entryNumber: 7, period: '2026-11', sourceModule: 'INVOICES', sourceReferenceId: 'inv-1', debe: 118, haber: 100, diferencia: 18, detalle: 'debe 118.00 contra haber 100.00' }],
    sinLineas: [],
    duplicados: [],
    conCuentaInvalida: [],
  },
  comprobantes: {
    revisados: 2,
    truncado: false,
    sinAsiento: [{ id: 'inv-9', numero: 'F001-00000009', tipoComprobante: '01', fechaEmision: '2026-11-10', total: 118, detalle: 'comprobante aceptado sin asiento (período 2026-11)' }],
    sinCosto: [],
  },
  compras: {
    revisadas: 1,
    truncado: false,
    sinAsiento: [{ id: 'p1', numero: 'COM-000001', documento: 'F001-77', proveedor: 'Proveedor SAC', fecha: '2026-11-08', total: 236, detalle: 'compra registrada sin asiento contable' }],
  },
  cobros: {
    deComprobantesAnulados: [{ id: 'cob-1', comprobante: 'F001-00000005', cliente: 'Cliente SAC', fecha: '2026-11-09', monto: 118, detalle: 'cobro registrado sobre un comprobante anulado' }],
  },
  resumen: { errors: 2, warnings: 1 },
  ...over,
});

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AccountingAuditPage />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('muestra los hallazgos de reglas, asientos y comprobantes', async () => {
  vi.mocked(accountingApi.getAudit).mockResolvedValue(informe() as never);
  renderPage();

  expect(await screen.findByText(/la cuenta PCGE 74 es de mayor/)).toBeTruthy();
  expect(screen.getByText(/sin regla para las líneas 10, 11/)).toBeTruthy();
  expect(screen.getByText('F001-00000009')).toBeTruthy();
  expect(screen.getByText('COM-000001')).toBeTruthy();
  expect(screen.getByText(/Cobros sobre comprobantes anulados \(1\)/)).toBeTruthy();
  expect(screen.getByText(/2 error\(es\)/)).toBeTruthy();
  expect(screen.getByText(/1 aviso\(s\)/)).toBeTruthy();
  expect(accountingApi.getAudit).toHaveBeenCalledWith(undefined);
});

it('simula la regularización sin escribir y luego la ejecuta', async () => {
  vi.mocked(accountingApi.getAudit).mockResolvedValue(informe() as never);
  vi.mocked(accountingApi.regularizarComprobantes)
    .mockResolvedValueOnce({ dryRun: true, revisados: 2, pendientes: 1, regularizados: 0, omitidos: 0, fallidos: [], detalle: [] } as never)
    .mockResolvedValueOnce({ dryRun: false, revisados: 2, pendientes: 1, regularizados: 1, omitidos: 0, fallidos: [], detalle: [] } as never);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const user = userEvent.setup();
  renderPage();

  await user.click(await screen.findByRole('button', { name: /Simular regularización/ }));
  await waitFor(() => expect(accountingApi.regularizarComprobantes).toHaveBeenCalledWith({ dryRun: true }));
  expect(await screen.findByText(/Simulación: 1 de 2 comprobante\(s\) se regularizarían/)).toBeTruthy();

  await user.click(await screen.findByRole('button', { name: /Regularizar 1/ }));
  await waitFor(() => expect(accountingApi.regularizarComprobantes).toHaveBeenCalledWith({ dryRun: false }));
  expect(await screen.findByText(/Regularizados 1 · omitidos 0 · fallidos 0/)).toBeTruthy();
});

it('informa cuando la auditoría no puede cargarse', async () => {
  vi.mocked(accountingApi.getAudit).mockRejectedValue(new Error('sin conexión'));
  renderPage();
  expect(await screen.findByText('No se pudo cargar la auditoría.')).toBeTruthy();
});

import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InvoiceEmitModal } from '@/modules/invoices/components/InvoiceEmitModal';
import { construir } from '@/modules/invoices/data/invoiceDemoTypes';

vi.mock('@/modules/invoices/services/invoicesApi', () => ({ invoicesApi: { buscarClientes: vi.fn(async () => []), getSaldoNota: vi.fn(async () => ({ total: 1770, devuelto: 100.01, disponible: 1669.99 })), emitirComprobante: vi.fn() } }));
describe('saldo de nota de crédito', () => {
  it('consulta y muestra el saldo y bloquea exceso sin emitir', async () => {
    const factura = construir({ tipo: '01', serie: 'F001', correlativo: 56, ruc: '20100070970', razonSocial: 'Cliente', fecha: '2026-11-05', base: 1500, estado: 'ACEPTADO' });
    const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={query}><InvoiceEmitModal tipoInicial="07" fecha="2026-11-05" existentes={[factura]} onEmitir={vi.fn()} onCerrar={vi.fn()} /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText('Documento afectado'), { target: { value: 'F001-00000056' } });
    expect(await screen.findByText(/Disponible según servidor S\/ 1669.99/)).toBeTruthy();
    expect(screen.getByText(/base S\/ 1500.00/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Descripción de la línea 1'), { target: { value: 'Servicio' } });
    fireEvent.change(screen.getByLabelText('Valor unitario de la línea 1'), { target: { value: '2000' } });
    expect(screen.getByText(/La nota supera el saldo disponible/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Emitir Nota de Crédito' }) as HTMLButtonElement).disabled).toBe(true);
    cleanup(); query.clear();
  });
});

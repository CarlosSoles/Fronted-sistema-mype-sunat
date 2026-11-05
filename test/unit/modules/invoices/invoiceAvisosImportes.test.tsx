import { expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InvoiceItemsGrid } from '@/modules/invoices/components/InvoiceItemsGrid';
import { itemVacio } from '@/modules/invoices/lib/invoiceItems';
it('avisa el valor cero y el descuento que excede la línea', () => {
  const item = { ...itemVacio('a'), descripcion: 'Servicio', descuento: { codigo: '00' as const, monto: 20 } };
  render(<InvoiceItemsGrid items={[item]} onCambiar={vi.fn()} onEliminar={vi.fn()} onAgregar={vi.fn()} onAgregarBolsa={vi.fn()} />);
  expect(screen.getByText(/valor unitario es cero/)).toBeTruthy();
  expect(screen.getByText(/descuento no puede superar/)).toBeTruthy();
  cleanup();
});

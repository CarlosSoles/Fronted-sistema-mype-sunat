import { expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CustomerLookupField } from '@/modules/invoices/components/CustomerLookupField';
let resolver!: (valor: unknown[]) => void;
vi.mock('@/modules/invoices/services/invoicesApi', () => ({ invoicesApi: { buscarClientes: () => new Promise((resolve) => { resolver = resolve as (valor: unknown[]) => void; }) } }));
it('indica carga y busca por razón social, sin conservar un documento anterior', async () => {
  const cambio = vi.fn(), elegir = vi.fn();
  render(<CustomerLookupField documento="20100070970" razonSocial="Anterior" labelDocumento="Cliente" onDocumentoChange={cambio} onElegir={elegir} />);
  const campo = screen.getByLabelText('Cliente');
  fireEvent.focus(campo); fireEvent.change(campo, { target: { value: 'FERRE' } });
  expect(screen.getByText('Buscando en la cartera…')).toBeTruthy();
  expect(cambio).toHaveBeenLastCalledWith('');
  resolver([{ tipoDocumento: '6', numeroDocumento: '20100070970', razonSocial: 'FERRETERÍA LOS ANDES' }]);
  fireEvent.click(await screen.findByText('FERRETERÍA LOS ANDES'));
  expect(elegir).toHaveBeenCalledWith(expect.objectContaining({ numeroDocumento: '20100070970' }));
  cleanup();
});

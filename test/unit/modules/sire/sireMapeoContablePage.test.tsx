import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SireMapeoContablePage from '@/modules/sire/pages/SireMapeoContablePage';
import { accountingApi } from '@/modules/accounting/services/accountingApi';
import { empresaApi } from '@/modules/sire/services/empresaApi';
import { sireApi } from '@/modules/sire/services/sireApi';
import { useAuthStore } from '@/stores/authStore';

const accounts = [
  { code: '121', name: 'Facturas por cobrar', element: '1', nature: 'Deudora' as const, parentCode: null, level: 3, isActive: true },
  { code: '421', name: 'Facturas por pagar', element: '4', nature: 'Acreedora' as const, parentCode: null, level: 3, isActive: true },
  { code: '6011', name: 'Compras de mercaderías', element: '6', nature: 'Deudora' as const, parentCode: null, level: 4, isActive: true },
  { code: '701', name: 'Ventas de mercaderías', element: '7', nature: 'Acreedora' as const, parentCode: null, level: 3, isActive: true },
  { code: '40111', name: 'IGV cuenta propia', element: '4', nature: 'Acreedora' as const, parentCode: null, level: 5, isActive: true },
];

const globalMappings = [
  { processCode: 'VENTA', roleCode: 'CXC', accountCode: '121', description: 'Facturas por cobrar emitidas', isCustom: false },
  { processCode: 'VENTA', roleCode: 'IGV', accountCode: '40111', description: 'IGV ventas', isCustom: false },
  { processCode: 'VENTA', roleCode: 'INGRESO', accountCode: '701', description: 'Ventas gravadas', isCustom: true },
  { processCode: 'COMPRA', roleCode: 'CXP', accountCode: '421', description: 'Facturas por pagar', isCustom: false },
  { processCode: 'COMPRA', roleCode: 'IGV_CREDITO', accountCode: '40111', description: 'IGV compras', isCustom: false },
  { processCode: 'COMPRA', roleCode: 'GASTO_COMPRA', accountCode: '6011', description: 'Compras de mercaderías', isCustom: false },
];

beforeEach(() => {
  useAuthStore.setState({
    token: 'test-access-token',
    user: {
      id: 'admin',
      email: 'admin@example.invalid',
      fullName: 'Admin',
      role: 'ADMIN',
      companyId: 'company-1',
    },
    activeCompany: {
      tenantId: 'company-1',
      ruc: '20614142503',
      razonSocial: 'DEMO SAC',
    },
  });
  vi.spyOn(empresaApi, 'listarEmpresas').mockResolvedValue([
    {
      id: 'company-1',
      ruc: '20614142503',
      razonSocial: 'DEMO SAC',
      nombreComercial: 'DEMO',
      activa: true,
    },
  ]);
  vi.spyOn(accountingApi, 'getPlanCuentas').mockResolvedValue(accounts);
  vi.spyOn(accountingApi, 'getAccountingMappings').mockResolvedValue(globalMappings);
  vi.spyOn(sireApi, 'getMapeoContable').mockResolvedValue([]);
  vi.spyOn(sireApi, 'getConfiguracionStatus').mockResolvedValue({ configured: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <SireMapeoContablePage />
    </MemoryRouter>,
  );

describe('SireMapeoContablePage · cuentas globales', () => {
  it('muestra las cuentas globales heredadas y las usa como placeholder', async () => {
    renderPage();

    expect(await screen.findByText('Cuentas Globales (Heredadas)')).toBeInTheDocument();
    expect(screen.getAllByText('121 - Facturas por cobrar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('421 - Facturas por pagar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('701 - Ventas de mercaderías').length).toBeGreaterThan(0);
    expect(screen.getByText('Personalizada')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText('Cuenta contable de VENTAS')).toHaveValue('');
    });
    expect(screen.getByText(/Heredar global: 121 - Facturas por cobrar/)).toBeInTheDocument();
  });

  it('guarda solo las sobrescrituras con el companyId seleccionado', async () => {
    const saveSpy = vi.spyOn(sireApi, 'saveMapeoContable').mockResolvedValue();
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Cuenta contable de VENTAS')).not.toBeDisabled();
    });
    fireEvent.change(screen.getByLabelText('Cuenta contable de VENTAS'), {
      target: { value: '701' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Mapeo' }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith(
        [{ tipoOperacion: 'VENTAS', cuentaContable: '701' }],
        'company-1',
      );
    });
  });

  it('si no hay sobrescrituras no llama al POST y mantiene la herencia', async () => {
    const saveSpy = vi.spyOn(sireApi, 'saveMapeoContable').mockResolvedValue();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Guardar Mapeo' })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Mapeo' }));

    expect(await screen.findByText('No hay sobrescrituras SIRE; se usarán las cuentas globales.')).toBeInTheDocument();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});

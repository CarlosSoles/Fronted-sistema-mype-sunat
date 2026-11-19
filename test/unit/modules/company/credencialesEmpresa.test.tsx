import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CredencialesEmpresaPage from '@/modules/company/pages/CredencialesEmpresaPage';
import { empresaApi } from '@/modules/sire/services/empresaApi';
import { sireApi } from '@/modules/sire/services/sireApi';
import { useAuthStore } from '@/stores/authStore';

const empresas = [
  {
    id: 'company-1',
    ruc: '20614142503',
    razonSocial: 'SYNC-SUNAT DEMO MYPE S.A.C.',
    nombreComercial: 'DEMO MYPE',
    activa: true,
  },
  {
    id: 'company-2',
    ruc: '20100070970',
    razonSocial: 'EMPRESA DOS SAC',
    nombreComercial: 'EMPRESA DOS',
    activa: true,
  },
];

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
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
      razonSocial: 'SYNC-SUNAT DEMO MYPE S.A.C.',
    },
  });
  vi.spyOn(empresaApi, 'listarEmpresas').mockResolvedValue(empresas);
  vi.spyOn(sireApi, 'getConfiguracionStatus').mockResolvedValue({ configured: false });
  vi.spyOn(empresaApi, 'getConfiguracion').mockResolvedValue({
    ruc: '20614142503',
    razonSocial: 'SYNC-SUNAT DEMO MYPE S.A.C.',
    nombreComercial: 'DEMO MYPE',
    direccion: 'Domicilio ficticio 123',
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    series: [],
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CredencialesEmpresaPage', () => {
  it('reúne credenciales, datos de empresa y selector Multi-RUC para ADMIN', async () => {
    render(<CredencialesEmpresaPage />);

    expect(screen.getByText('Credenciales de Empresa')).toBeInTheDocument();
    expect(screen.getByText('Datos de la Empresa')).toBeInTheDocument();
    expect(screen.getByLabelText('Empresa')).toBeInTheDocument();

    for (const label of ['Client ID', 'Client Secret', 'Usuario SOL', 'Clave SOL']) {
      expect(screen.getByLabelText(label)).not.toBeDisabled();
    }

    await waitFor(() => {
      expect(screen.getByLabelText('Razón Social')).toHaveValue('SYNC-SUNAT DEMO MYPE S.A.C.');
      expect(screen.getByLabelText('Nombre Comercial')).toHaveValue('DEMO MYPE');
    });
  });

  it('recarga el estado de credenciales al cambiar de empresa', async () => {
    const statusSpy = vi.spyOn(sireApi, 'getConfiguracionStatus').mockResolvedValue({
      configured: false,
    });
    render(<CredencialesEmpresaPage />);

    await waitFor(() => expect(screen.getByLabelText('Empresa')).toHaveValue('company-1'));
    expect(statusSpy).toHaveBeenCalledWith('company-1');

    fireEvent.change(screen.getByLabelText('Empresa'), {
      target: { value: 'company-2' },
    });

    await waitFor(() => expect(statusSpy).toHaveBeenCalledWith('company-2'));
  });
});

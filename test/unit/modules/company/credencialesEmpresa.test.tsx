import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CredencialesEmpresaPage from '@/modules/company/pages/CredencialesEmpresaPage';
import { empresaApi } from '@/modules/sire/services/empresaApi';
import { sireApi } from '@/modules/sire/services/sireApi';
import { useAuthStore } from '@/stores/authStore';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  useAuthStore.setState({ token: 'test-access-token' });
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
  it('reúne las credenciales y los datos de la empresa en un solo apartado', async () => {
    render(<CredencialesEmpresaPage />);

    expect(screen.getByText('Credenciales de Empresa')).toBeInTheDocument();
    expect(screen.getByText('Datos de la Empresa')).toBeInTheDocument();

    for (const label of ['Client ID', 'Client Secret', 'Usuario SOL', 'Clave SOL']) {
      expect(screen.getByLabelText(label)).not.toBeDisabled();
    }

    await waitFor(() => {
      expect(screen.getByLabelText('Razón Social')).toHaveValue('SYNC-SUNAT DEMO MYPE S.A.C.');
      expect(screen.getByLabelText('Nombre Comercial')).toHaveValue('DEMO MYPE');
    });
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SireConfiguracionPage from '@/modules/sire/pages/SireConfiguracionPage';
import { empresaApi } from '@/modules/sire/services/empresaApi';
import { useAuthStore } from '@/stores/authStore';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  useAuthStore.setState({
    token: 'test-access-token',
    activeCompany: {
      tenantId: 'company-session',
      ruc: '20100070970',
      razonSocial: 'Empresa fixture',
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SireConfiguracionPage', () => {
  it('muestra solo los datos de la empresa y no las credenciales', () => {
    render(<SireConfiguracionPage />);

    expect(screen.getByLabelText('RUC de la Empresa')).toHaveValue('20100070970');
    expect(screen.getByLabelText('Nombre de la Empresa')).toHaveValue('Empresa fixture');
    expect(screen.getByLabelText('Series')).toBeInTheDocument();
    expect(screen.queryByLabelText('Client ID')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Client Secret')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Usuario SOL')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Clave SOL')).not.toBeInTheDocument();
  });

  it('permite validar el RUC y autocompleta el nombre sin bloquear el campo', async () => {
    const validateMock = vi.spyOn(empresaApi, 'validateRuc').mockResolvedValue({
      ruc: '20100047218',
      razonSocial: 'BANCO DE CREDITO DEL PERU',
    });

    render(<SireConfiguracionPage />);

    const rucInput = screen.getByLabelText('RUC de la Empresa');
    expect(rucInput).not.toHaveAttribute('readonly');

    fireEvent.change(rucInput, { target: { value: '20100047218' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

    await waitFor(() => expect(validateMock).toHaveBeenCalledWith('20100047218'));
    expect(await screen.findByDisplayValue('BANCO DE CREDITO DEL PERU')).toBeInTheDocument();
    expect(screen.getByLabelText('RUC de la Empresa')).not.toHaveAttribute('readonly');
  });

  it('guarda los datos de la empresa con el PUT de configuración', async () => {
    const saveMock = vi.spyOn(empresaApi, 'saveConfiguracion').mockResolvedValue();

    render(<SireConfiguracionPage />);

    fireEvent.change(screen.getByLabelText('Nombre de la Empresa'), {
      target: { value: 'EMPRESA NUEVA SAC' },
    });
    fireEvent.change(screen.getByLabelText('Series'), {
      target: { value: 'f001, B001, F001' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Datos de la Empresa/i }));

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith({
        ruc: '20100070970',
        razonSocial: 'EMPRESA NUEVA SAC',
        series: ['F001', 'B001'],
      });
    });

    expect(await screen.findByText('Datos de la empresa guardados exitosamente.')).toBeInTheDocument();
  });
});

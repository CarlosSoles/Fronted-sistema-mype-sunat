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
  it('muestra solo los datos de la empresa, con el RUC vacío y sin credenciales', () => {
    render(<SireConfiguracionPage />);

    expect(screen.getByLabelText('RUC de la Empresa')).toHaveValue('');
    expect(screen.getByLabelText('Nombre de la Empresa')).toHaveValue('');
    expect(screen.getByLabelText('Dirección')).toHaveValue('');
    expect(screen.getByLabelText('Estado')).toHaveValue('');
    expect(screen.getByLabelText('Condición')).toHaveValue('');
    expect(screen.queryByLabelText('Series')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Client ID')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Client Secret')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Usuario SOL')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Clave SOL')).not.toBeInTheDocument();
  });

  it('permite validar el RUC y autocompleta todos los datos sin bloquear el campo', async () => {
    const validateMock = vi.spyOn(empresaApi, 'validateRuc').mockResolvedValue({
      ruc: '20100047218',
      razonSocial: 'BANCO DE CREDITO DEL PERU',
      direccion: 'CAL. CENTENARIO NRO. 156',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
    });

    render(<SireConfiguracionPage />);

    const rucInput = screen.getByLabelText('RUC de la Empresa');
    expect(rucInput).not.toHaveAttribute('readonly');

    fireEvent.change(rucInput, { target: { value: '20100047218' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

    await waitFor(() => expect(validateMock).toHaveBeenCalledWith('20100047218'));
    await waitFor(() => {
      expect(screen.getByLabelText('Nombre de la Empresa')).toHaveValue('BANCO DE CREDITO DEL PERU');
      expect(screen.getByLabelText('Dirección')).toHaveValue('CAL. CENTENARIO NRO. 156');
      expect(screen.getByLabelText('Estado')).toHaveValue('ACTIVO');
      expect(screen.getByLabelText('Condición')).toHaveValue('HABIDO');
    });
    expect(screen.getByLabelText('RUC de la Empresa')).not.toHaveAttribute('readonly');
  });

  it('muestra un error cuando el RUC no es válido', async () => {
    vi.spyOn(empresaApi, 'validateRuc').mockRejectedValue(
      new Error('RUC no válido o no encontrado.'),
    );

    render(<SireConfiguracionPage />);

    fireEvent.change(screen.getByLabelText('RUC de la Empresa'), {
      target: { value: '20100047218' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

    expect(await screen.findByText('RUC no válido o no encontrado.')).toBeInTheDocument();
  });

  it('guarda los datos de la empresa con el PUT de configuración', async () => {
    const saveMock = vi.spyOn(empresaApi, 'saveConfiguracion').mockResolvedValue();

    render(<SireConfiguracionPage />);

    fireEvent.change(screen.getByLabelText('RUC de la Empresa'), {
      target: { value: '20100070970' },
    });
    fireEvent.change(screen.getByLabelText('Nombre de la Empresa'), {
      target: { value: 'EMPRESA NUEVA SAC' },
    });
    fireEvent.change(screen.getByLabelText('Dirección'), {
      target: { value: 'AV. PRINCIPAL 123' },
    });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'ACTIVO' } });
    fireEvent.change(screen.getByLabelText('Condición'), { target: { value: 'HABIDO' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Datos de la Empresa/i }));

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith({
        ruc: '20100070970',
        razonSocial: 'EMPRESA NUEVA SAC',
        direccion: 'AV. PRINCIPAL 123',
        estado: 'ACTIVO',
        condicion: 'HABIDO',
      });
    });

    expect(await screen.findByText('Datos de la empresa guardados exitosamente.')).toBeInTheDocument();
  });
});

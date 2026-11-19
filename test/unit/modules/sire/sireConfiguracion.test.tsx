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
  vi.spyOn(empresaApi, 'getConfiguracion').mockResolvedValue({
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    direccion: '',
    estado: '',
    condicion: '',
    series: [],
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SireConfiguracionPage', () => {
  it('muestra los datos de la empresa, con el RUC vacío y sin credenciales', () => {
    render(<SireConfiguracionPage />);

    expect(screen.getByLabelText('RUC de la Empresa')).toHaveValue('');
    expect(screen.getByLabelText('Razón Social')).toHaveValue('');
    expect(screen.getByLabelText('Nombre Comercial')).toHaveValue('');
    expect(screen.getByLabelText('Dirección Fiscal')).toHaveValue('');
    expect(screen.getByLabelText('Estado SUNAT')).toHaveValue('');
    expect(screen.getByLabelText('Estado SUNAT')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Condición')).toHaveValue('');
    expect(screen.getByLabelText('Condición')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Series')).toHaveValue('');
    expect(screen.queryByLabelText('Client ID')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Client Secret')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Usuario SOL')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Clave SOL')).not.toBeInTheDocument();
  });

  it('permite validar el RUC y autocompleta todos los datos sin bloquear los campos editables', async () => {
    const validateMock = vi.spyOn(empresaApi, 'validateRuc').mockResolvedValue({
      ruc: '20100047218',
      razonSocial: 'BANCO DE CREDITO DEL PERU',
      nombreComercial: 'BCP',
      direccion: 'CAL. CENTENARIO NRO. 156',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
      series: ['F001', 'B001'],
    });

    render(<SireConfiguracionPage />);

    await waitFor(() =>
      expect(screen.getByLabelText('RUC de la Empresa')).not.toBeDisabled(),
    );
    const rucInput = screen.getByLabelText('RUC de la Empresa');
    expect(rucInput).not.toHaveAttribute('readonly');

    fireEvent.change(rucInput, { target: { value: '20100047218' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

    await waitFor(() => expect(validateMock).toHaveBeenCalledWith('20100047218'));
    await waitFor(() => {
      expect(screen.getByLabelText('Razón Social')).toHaveValue('BANCO DE CREDITO DEL PERU');
      expect(screen.getByLabelText('Nombre Comercial')).toHaveValue('BCP');
      expect(screen.getByLabelText('Dirección Fiscal')).toHaveValue('CAL. CENTENARIO NRO. 156');
      expect(screen.getByLabelText('Estado SUNAT')).toHaveValue('ACTIVO');
      expect(screen.getByLabelText('Condición')).toHaveValue('HABIDO');
      expect(screen.getByLabelText('Series')).toHaveValue('F001, B001');
    });
    expect(screen.getByLabelText('RUC de la Empresa')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('Razón Social')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('Nombre Comercial')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('Dirección Fiscal')).not.toHaveAttribute('readonly');
  });

  it('muestra un error cuando el RUC no es válido', async () => {
    vi.spyOn(empresaApi, 'validateRuc').mockRejectedValue(
      new Error('RUC no válido o no encontrado.'),
    );

    render(<SireConfiguracionPage />);

    await waitFor(() =>
      expect(screen.getByLabelText('RUC de la Empresa')).not.toBeDisabled(),
    );
    fireEvent.change(screen.getByLabelText('RUC de la Empresa'), {
      target: { value: '20100047218' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

    expect(await screen.findByText('RUC no válido o no encontrado.')).toBeInTheDocument();
  });

  it('carga los datos guardados desde GET /empresa/configuracion', async () => {
    vi.spyOn(empresaApi, 'getConfiguracion').mockResolvedValue({
      ruc: '20614142503',
      razonSocial: 'SYNC-SUNAT DEMO MYPE S.A.C.',
      nombreComercial: 'DEMO MYPE',
      direccion: 'Domicilio ficticio 123',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
      series: ['F001', 'B001'],
    });

    render(<SireConfiguracionPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('RUC de la Empresa')).toHaveValue('20614142503');
      expect(screen.getByLabelText('Razón Social')).toHaveValue('SYNC-SUNAT DEMO MYPE S.A.C.');
      expect(screen.getByLabelText('Nombre Comercial')).toHaveValue('DEMO MYPE');
      expect(screen.getByLabelText('Dirección Fiscal')).toHaveValue('Domicilio ficticio 123');
      expect(screen.getByLabelText('Estado SUNAT')).toHaveValue('ACTIVO');
      expect(screen.getByLabelText('Condición')).toHaveValue('HABIDO');
      expect(screen.getByLabelText('Series')).toHaveValue('F001, B001');
    });
  });

  it('guarda los datos de la empresa con el PUT de configuración', async () => {
    vi.spyOn(empresaApi, 'validateRuc').mockResolvedValue({
      ruc: '20100070970',
      razonSocial: 'EMPRESA NUEVA SAC',
      nombreComercial: 'EMPRESA NUEVA',
      direccion: 'AV. PRINCIPAL 123',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
      series: ['F001', 'B001'],
    });
    const saveMock = vi.spyOn(empresaApi, 'saveConfiguracion').mockResolvedValue();

    render(<SireConfiguracionPage />);

    await waitFor(() =>
      expect(screen.getByLabelText('RUC de la Empresa')).not.toBeDisabled(),
    );
    fireEvent.change(screen.getByLabelText('RUC de la Empresa'), {
      target: { value: '20100070970' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Razón Social')).toHaveValue('EMPRESA NUEVA SAC'),
    );

    fireEvent.change(screen.getByLabelText('Series'), {
      target: { value: 'F001, f002' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Datos de la Empresa/i }));

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith({
        razonSocial: 'EMPRESA NUEVA SAC',
        nombreComercial: 'EMPRESA NUEVA',
        direccion: 'AV. PRINCIPAL 123',
        estado: 'ACTIVO',
        condicion: 'HABIDO',
        series: ['F001', 'F002'],
      });
    });

    expect(await screen.findByText('Datos de la empresa guardados exitosamente.')).toBeInTheDocument();
  });
});

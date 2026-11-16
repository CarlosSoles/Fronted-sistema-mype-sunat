import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SireCredentialsPage from '@/modules/sire/pages/SireCredentialsPage';
import { sireApi } from '@/modules/sire/services/sireApi';
import { useAuthStore } from '@/stores/authStore';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  useAuthStore.setState({ token: 'test-access-token' });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SireCredentialsPage', () => {
  it('muestra los cuatro campos editables aunque ya existan credenciales', async () => {
    vi.spyOn(sireApi, 'getConfiguracionStatus').mockResolvedValue({ configured: true });

    render(<SireCredentialsPage />);

    expect(await screen.findByText('Credenciales ya configuradas')).toBeInTheDocument();

    for (const label of ['Client ID', 'Client Secret', 'Usuario SOL', 'Clave SOL']) {
      const input = screen.getByLabelText(label);
      expect(input).not.toHaveAttribute('readonly');
      expect(input).not.toBeDisabled();
    }

    expect(screen.queryByLabelText('RUC de la Empresa')).not.toBeInTheDocument();
  });

  it('guarda las credenciales con el POST de configuración', async () => {
    vi.spyOn(sireApi, 'getConfiguracionStatus').mockResolvedValue({ configured: false });
    const saveMock = vi.spyOn(sireApi, 'saveConfiguracion').mockResolvedValue({ configured: true });

    render(<SireCredentialsPage />);

    await waitFor(() =>
      expect(screen.queryByText('Consultando el estado de las credenciales…')).not.toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'client-123' } });
    fireEvent.change(screen.getByLabelText('Client Secret'), { target: { value: 'secret-456' } });
    fireEvent.change(screen.getByLabelText('Usuario SOL'), { target: { value: 'MODDATOS' } });
    fireEvent.change(screen.getByLabelText('Clave SOL'), { target: { value: 'moddatos123' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Credenciales/i }));

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith({
        clientId: 'client-123',
        clientSecret: 'secret-456',
        solUser: 'MODDATOS',
        solPassword: 'moddatos123',
      });
    });

    expect(await screen.findByText('Credenciales guardadas exitosamente.')).toBeInTheDocument();
  });
});

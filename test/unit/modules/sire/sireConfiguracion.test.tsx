import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SireConfiguracionPage from '@/modules/sire/pages/SireConfiguracionPage';
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

describe('SireConfiguracionPage', () => {
  it('al montar, si configured es true, muestra mensaje de ya configurado y botón Editar', async () => {
    vi.spyOn(sireApi, 'getConfiguracionStatus').mockResolvedValue({ configured: true });

    render(<SireConfiguracionPage />);

    expect(await screen.findByText('Credenciales ya configuradas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Client ID')).not.toBeInTheDocument();
  });

  it('permite abrir el formulario de edición al hacer clic en Editar', async () => {
    vi.spyOn(sireApi, 'getConfiguracionStatus').mockResolvedValue({ configured: true });

    render(<SireConfiguracionPage />);

    const editBtn = await screen.findByRole('button', { name: 'Editar' });
    fireEvent.click(editBtn);

    expect(screen.getByLabelText('Client ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Client Secret')).toBeInTheDocument();
    expect(screen.getByLabelText('Usuario SOL')).toBeInTheDocument();
    expect(screen.getByLabelText('Clave SOL')).toBeInTheDocument();
  });

  it('si configured es false, muestra el formulario directamente', async () => {
    vi.spyOn(sireApi, 'getConfiguracionStatus').mockResolvedValue({ configured: false });

    render(<SireConfiguracionPage />);

    expect(await screen.findByLabelText('Client ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Client Secret')).toBeInTheDocument();
    expect(screen.getByLabelText('Usuario SOL')).toBeInTheDocument();
    expect(screen.getByLabelText('Clave SOL')).toBeInTheDocument();
  });

  it('guarda las credenciales enviadas y muestra mensaje de éxito', async () => {
    vi.spyOn(sireApi, 'getConfiguracionStatus').mockResolvedValue({ configured: false });
    const saveMock = vi.spyOn(sireApi, 'saveConfiguracion').mockResolvedValue({ configured: true });

    render(<SireConfiguracionPage />);

    await screen.findByLabelText('Client ID');

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

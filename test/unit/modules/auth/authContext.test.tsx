import { cleanup, render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import { authApi } from '@/modules/auth/services/authApi';
import { useAuthStore } from '@/stores/authStore';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.getState().logout();
});

const ConsumerComponent = () => {
  const { user, accessToken, isAuthenticated, login, logout, updateProfile } = useAuthContext();

  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'Autenticado' : 'No Autenticado'}</span>
      <span data-testid="user-email">{user?.email || 'sin-usuario'}</span>
      <span data-testid="user-name">{user?.fullName || 'sin-nombre'}</span>
      <span data-testid="access-token">{accessToken || 'sin-token'}</span>

      <button
        onClick={() =>
          login({ email: 'admin@mype.pe', password: 'Password123!#' })
        }
      >
        Login Test
      </button>

      <button onClick={() => updateProfile('Carlos Actualizado')}>Update Name</button>
      <button onClick={() => logout()}>Logout Test</button>
    </div>
  );
};

describe('AuthContext & Session Life Cycle', () => {
  it('inicializa y permite autenticar, actualizar perfil y cerrar sesión', async () => {
    vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('No token'));
    vi.spyOn(authApi, 'login').mockResolvedValue({
      accessToken: 'jwt-token-12345',
      user: {
        id: 'user-uuid-1',
        companyId: 'company-uuid-1',
        email: 'admin@mype.pe',
        fullName: 'Carlos Ahumada',
        role: 'ADMIN',
      },
    });
    vi.spyOn(authApi, 'updateProfile').mockResolvedValue({
      success: true,
      message: 'Actualizado',
    });
    vi.spyOn(authApi, 'logout').mockResolvedValue({
      success: true,
      message: 'Sesión finalizada',
    });

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    // Ejecutar Login
    await act(async () => {
      screen.getByText('Login Test').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Autenticado');
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@mype.pe');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Carlos Ahumada');
    expect(screen.getByTestId('access-token')).toHaveTextContent('jwt-token-12345');

    // Actualizar Perfil
    await act(async () => {
      screen.getByText('Update Name').click();
    });
    expect(screen.getByTestId('user-name')).toHaveTextContent('Carlos Actualizado');

    // Logout
    await act(async () => {
      screen.getByText('Logout Test').click();
    });
    expect(screen.getByTestId('auth-status')).toHaveTextContent('No Autenticado');
    expect(screen.getByTestId('access-token')).toHaveTextContent('sin-token');
  });

  it('solo llama refreshToken una vez al montar y conserva el usuario si refresh no trae user', async () => {
    const refreshSpy = vi.spyOn(authApi, 'refreshToken').mockResolvedValue({
      accessToken: 'jwt-refreshed-1',
    } as never);
    vi.spyOn(authApi, 'getProfile').mockResolvedValue({} as never);
    vi.spyOn(authApi, 'login').mockResolvedValue({
      accessToken: 'jwt-after-login',
      user: {
        id: 'u-1',
        companyId: 'c-1',
        email: 'admin@mype.pe',
        fullName: 'Usuario Prueba',
        role: 'ADMIN',
      },
    });

    await act(async () => {
      render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>
      );
    });

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('access-token')).toHaveTextContent('jwt-refreshed-1');

    await act(async () => {
      screen.getByText('Login Test').click();
    });

    // No debe volver a dispararse refreshToken tras login (previene tormenta 429)
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('access-token')).toHaveTextContent('jwt-after-login');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Usuario Prueba');
  });

  it('descarta la sesión guardada cuando el refresco responde 401', async () => {
    // Sesión fantasma: hay token en el store pero el servidor ya no la acepta.
    useAuthStore.setState({
      token: 'token-vencido',
      user: {
        id: 'u-1',
        companyId: 'c-1',
        email: 'admin@mype.pe',
        fullName: 'Sesión vieja',
        role: '',
      } as never,
    });
    vi.spyOn(authApi, 'refreshToken').mockRejectedValue({ response: { status: 401 } });

    await act(async () => {
      render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>
      );
    });

    // Sin limpiar el token, la ruta protegida dejaba pasar y el usuario
    // acababa en un 403 de módulo en lugar del login.
    expect(screen.getByTestId('auth-status')).toHaveTextContent('No Autenticado');
    expect(screen.getByTestId('access-token')).toHaveTextContent('sin-token');
  });

  it('conserva la sesión si el refresco falla por red y no por credenciales', async () => {
    useAuthStore.setState({
      token: 'token-vivo',
      user: {
        id: 'u-1',
        companyId: 'c-1',
        email: 'admin@mype.pe',
        fullName: 'Sesión viva',
        role: 'ADMIN',
      } as never,
    });
    vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Network Error'));

    await act(async () => {
      render(
        <AuthProvider>
          <ConsumerComponent />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('access-token')).toHaveTextContent('token-vivo');
  });
});

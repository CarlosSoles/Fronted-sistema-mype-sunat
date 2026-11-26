import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProtectedRoute } from '@/routes/RoleProtectedRoute';
import { permissionsApi } from '@/modules/auth/services/permissionsApi';
import { useAuthStore } from '@/stores/authStore';
import { serverSnapshot } from '../../../fixtures/permissionsServer';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderRoute = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/sire/mapeo-contable']}>
        <RoleProtectedRoute roles={['ADMIN']}>
          <span>Mapeo contable permitido</span>
        </RoleProtectedRoute>
      </MemoryRouter>
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  queryClient.clear();
  vi.restoreAllMocks();
  useAuthStore.getState().logout();
});

describe('RoleProtectedRoute · alias ADMINISTRADOR', () => {
  it('permite el acceso aunque el servidor devuelva ADMINISTRADOR y no publique la ruta', async () => {
    useAuthStore.setState({
      token: 'token',
      user: {
        id: 'admin',
        email: 'admin@example.invalid',
        role: 'ADMINISTRADOR',
      },
    });
    const base = serverSnapshot();
    vi.mocked(permissionsApi.mine).mockResolvedValue({
      ...base,
      role: { code: 'ADMINISTRADOR', name: 'Administrador', isSystem: false },
      modules: base.modules.map((module) => ({
        ...module,
        canView: module.moduleCode === 'M3' ? false : module.canView,
      })),
      menus: base.menus.filter((menu) => menu.path !== '/sire/mapeo-contable'),
    });

    renderRoute();

    expect(await screen.findByText('Mapeo contable permitido')).toBeInTheDocument();
    expect(screen.queryByText('Módulo Restringido')).not.toBeInTheDocument();
  });

  it('mantiene el 403 para un rol distinto de ADMIN', async () => {
    useAuthStore.setState({
      token: 'token',
      user: {
        id: 'contador',
        email: 'contador@example.invalid',
        role: 'CONTADOR',
      },
    });
    const base = serverSnapshot();
    vi.mocked(permissionsApi.mine).mockResolvedValue({
      ...base,
      role: { code: 'CONTADOR', name: 'Contador', isSystem: true },
      menus: base.menus.filter((menu) => menu.path !== '/sire/mapeo-contable'),
    });

    renderRoute();

    expect(await screen.findByText('Módulo Restringido')).toBeInTheDocument();
    expect(screen.queryByText('Mapeo contable permitido')).not.toBeInTheDocument();
  });
});

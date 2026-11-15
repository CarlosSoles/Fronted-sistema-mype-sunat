import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleProtectedRoute } from '@/routes/RoleProtectedRoute';
import { useAuthStore } from '@/stores/authStore';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (ui: React.ReactNode) => <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>;

afterEach(() => {
  cleanup();
  useAuthStore.getState().logout();
});

describe('Navigation Guards: ProtectedRoute & RoleProtectedRoute', () => {
  it('ProtectedRoute redirige a /login cuando el usuario no está autenticado', () => {
    useAuthStore.getState().logout();

    render(
      wrap(<MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Pantalla de Login</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Contenido Privado</div>} />
          </Route>
        </Routes>
      </MemoryRouter>)
    );

    expect(screen.getByText('Pantalla de Login')).toBeInTheDocument();
    expect(screen.queryByText('Contenido Privado')).not.toBeInTheDocument();
  });

  it('RoleProtectedRoute bloquea con 403 Forbidden a OPERADOR_ADUANAS en rutas contables', () => {
    useAuthStore.getState().setSession('token-valido', {
      id: 'user-1',
      email: 'aduanas@mype.pe',
      role: 'OPERADOR_ADUANAS',
      fullName: 'Operador Aduanas',
    });

    render(
      wrap(<MemoryRouter initialEntries={['/accounting']}>
        <Routes>
          <Route
            path="/accounting"
            element={
              <RoleProtectedRoute allowedRoles={['ADMIN', 'CONTADOR']}>
                <div>Libros Contables PLE</div>
              </RoleProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>)
    );

    expect(screen.getByText('Módulo Restringido')).toBeInTheDocument();
    expect(screen.getByText(/Código 403/i)).toBeInTheDocument();
    expect(screen.getByText(/OPERADOR_ADUANAS/i)).toBeInTheDocument();
    expect(screen.queryByText('Libros Contables PLE')).not.toBeInTheDocument();
  });

  it('RoleProtectedRoute permite acceso a ADMIN en cualquier ruta protegida', () => {
    useAuthStore.getState().setSession('token-valido', {
      id: 'admin-1',
      email: 'admin@mype.pe',
      role: 'ADMIN',
      fullName: 'Administrador General',
    });

    render(
      wrap(<MemoryRouter initialEntries={['/accounting']}>
        <Routes>
          <Route
            path="/accounting"
            element={
              <RoleProtectedRoute allowedRoles={['CONTADOR']}>
                <div>Libros Contables PLE</div>
              </RoleProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>)
    );

    expect(screen.getByText('Libros Contables PLE')).toBeInTheDocument();
    expect(screen.queryByText('Módulo Restringido')).not.toBeInTheDocument();
  });
});

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { normalizeRoleCode } from '@/modules/auth/lib/roleCode';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

afterEach(() => {
  useAuthStore.setState({ token: null, user: null, activeCompany: null });
});

describe('normalización de roles', () => {
  it.each([
    ['admin', 'ADMIN'],
    ['Administrador', 'ADMIN'],
    [' ADMINISTRADOR ', 'ADMIN'],
    ['ACCOUNTANT', 'CONTADOR'],
    ['operator', 'OPERADOR_FACTURACION'],
    ['CONTADOR', 'CONTADOR'],
    ['AUDITOR', 'AUDITOR'],
  ])('normaliza %s a %s', (entrada, esperado) => {
    expect(normalizeRoleCode(entrada)).toBe(esperado);
  });

  it('normaliza el rol al guardar la sesión', () => {
    useAuthStore.getState().setSession('token', {
      id: 'admin',
      email: 'admin@example.invalid',
      role: 'administrador',
    });

    expect(useAuthStore.getState().user?.role).toBe('ADMIN');
  });

  it('useAuth acepta ADMINISTRADOR como ADMIN', () => {
    useAuthStore.setState({
      token: 'token',
      user: {
        id: 'admin',
        email: 'admin@example.invalid',
        role: 'ADMINISTRADOR',
      },
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.role).toBe('ADMIN');
    expect(result.current.isAdmin).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { destinoSeguro } from '@/modules/auth/hooks/useLogin';

/**
 * El login vuelve a la página que el usuario intentaba abrir (`state.from` de
 * `ProtectedRoute`). Solo se aceptan rutas internas: una ruta externa o
 * ausente cae al inicio.
 */
describe('destinoSeguro', () => {
  it('devuelve la ruta interna que se intentaba abrir', () => {
    expect(destinoSeguro({ pathname: '/invoices/facturas' })).toBe('/invoices/facturas');
  });

  it('cae al inicio cuando no hay origen', () => {
    expect(destinoSeguro(undefined)).toBe('/');
    expect(destinoSeguro(null)).toBe('/');
    expect(destinoSeguro({})).toBe('/');
  });

  it('no acepta destinos externos ni rutas protocol-relative', () => {
    expect(destinoSeguro({ pathname: 'https://evil.example/login' })).toBe('/');
    expect(destinoSeguro({ pathname: '//evil.example/login' })).toBe('/');
  });
});

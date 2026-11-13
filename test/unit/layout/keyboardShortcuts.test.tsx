import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts';
import { useAuthStore } from '@/stores/authStore';

beforeEach(() => {
  useAuthStore.getState().setSession('token', { id: 'u1', email: 'admin@mype.pe', fullName: 'Admin', role: 'ADMIN' });
});
afterEach(cleanup);

it('abre la ayuda con ? y con Shift+Slash', async () => {
  render(<MemoryRouter><KeyboardShortcuts /></MemoryRouter>);
  fireEvent.keyDown(window, { key: '?', code: 'Slash', shiftKey: true });
  expect(await screen.findByText('Atajos de teclado')).toBeInTheDocument();
});

it('no abre la ayuda mientras se escribe', () => {
  render(<MemoryRouter><KeyboardShortcuts /><input aria-label="campo" /></MemoryRouter>);
  const input = screen.getByLabelText('campo');
  input.focus();
  fireEvent.keyDown(input, { key: '?', code: 'Slash', shiftKey: true });
  expect(screen.queryByText('Atajos de teclado')).toBeNull();
});

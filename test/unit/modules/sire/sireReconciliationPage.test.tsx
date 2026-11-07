import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SireReconciliationPage from '@/modules/sire/pages/SireReconciliationPage';
import { sireApi, SireApiError } from '@/modules/sire/services/sireApi';
import { useAuthStore } from '@/stores/authStore';
import type { ReconcileResponse } from '@/modules/sire/types/sire.types';

const result: ReconcileResponse = {
  period: '202611',
  bookType: 'RVIE_VENTAS',
  summary: {
    total: 1,
    coincidenciaExacta: 1,
    diferenciaMontos: 0,
    omisionLocal: 0,
    omisionSunat: 0,
    duplicadoLlave: 0,
    porcentajeCumplimiento: 100,
  },
  results: [],
};

const enterVoucher = () => {
  fireEvent.change(screen.getByLabelText('Serie 1'), { target: { value: 'F001' } });
  fireEvent.change(screen.getByLabelText('Correlativo 1'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Base imponible 1'), { target: { value: '100' } });
  fireEvent.change(screen.getByLabelText('IGV 1'), { target: { value: '18' } });
  fireEvent.change(screen.getByLabelText('Total 1'), { target: { value: '118' } });
};

beforeEach(() => {
  useAuthStore.setState({
    token: 'test-access-token',
    activeCompany: { tenantId: 'company-session', ruc: '20100070970', razonSocial: 'Empresa fixture' },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SireReconciliationPage', () => {
  it('solo muestra el RUC de sesión y no solicita ni muestra contraseñas SOL', () => {
    render(<SireReconciliationPage />);

    expect(screen.getByText('20100070970')).toBeInTheDocument();
    expect(screen.queryByLabelText('RUC')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/SOL|contraseña|clave/i)).not.toBeInTheDocument();
    expect(JSON.stringify(useAuthStore.getState().user)).not.toContain('solPassword');
    expect(window.localStorage.getItem('sync-sunat-auth') ?? '').not.toContain('solPassword');
    expect(window.sessionStorage.length).toBe(0);
  });

  it('mantiene la conciliación pendiente hasta la respuesta del backend', async () => {
    let finishReconcile: (value: ReconcileResponse) => void = () => undefined;
    vi.spyOn(sireApi, 'reconcile').mockImplementation(
      () => new Promise((resolve) => { finishReconcile = resolve; }),
    );
    render(<SireReconciliationPage />);
    enterVoucher();
    fireEvent.click(screen.getByRole('button', { name: 'Conciliar' }));

    expect(await screen.findByRole('button', { name: /Conciliando/ })).toBeDisabled();
    expect(screen.queryByText('Resultados de conciliación')).not.toBeInTheDocument();
    await act(async () => finishReconcile(result));
    expect(await screen.findByText('Resultados de conciliación')).toBeInTheDocument();
  });

  it('presenta HTTP 409 como conflicto y no como conciliación exitosa', async () => {
    vi.spyOn(sireApi, 'reconcile').mockRejectedValue(
      new SireApiError('Conflicto al procesar la propuesta SIRE (HTTP 409). CAR incompatible.', 409),
    );
    render(<SireReconciliationPage />);
    enterVoucher();
    fireEvent.click(screen.getByRole('button', { name: 'Conciliar' }));

    expect(await screen.findByText(/Conflicto al procesar la propuesta SIRE/)).toBeInTheDocument();
    expect(screen.queryByText('Resultados de conciliación')).not.toBeInTheDocument();
  });
});

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SireProposalPanel } from '@/modules/sire/components/SireProposalPanel';
import { sireApi } from '@/modules/sire/services/sireApi';
import type { SireProposalResponse } from '@/modules/sire/types/sire.types';

const proposal: SireProposalResponse = {
  period: '202610',
  bookType: 'RVIE_VENTAS',
  proposals: [{
    id: 'proposal-fixture-1',
    period: '202610',
    bookType: 'RVIE',
    carSunat: 'CAR-FIXTURE-1',
    emitterRuc: '20100070970',
    documentType: '01',
    series: 'F001',
    correlative: '00000001',
    issueDate: '2026-10-01',
    taxableBase: 100,
    igvAmount: 18,
    totalAmount: 118,
    origin: 'SUNAT',
  }],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SireProposalPanel', () => {
  it('carga y muestra registros solo al completar la consulta', async () => {
    const getProposal = vi.spyOn(sireApi, 'getProposal').mockResolvedValue(proposal);
    render(<SireProposalPanel period="202610" bookType="RVIE_VENTAS" />);

    fireEvent.click(screen.getByRole('button', { name: 'Cargar propuesta' }));

    expect(await screen.findByRole('row', { name: /F001-00000001/ })).toBeInTheDocument();
    expect(screen.getByText('Propuesta cargada: 1 comprobantes.')).toBeInTheDocument();
    expect(getProposal).toHaveBeenCalledWith('202610', 'RVIE_VENTAS');
  });

  it('mantiene la consulta pendiente sin mostrar resultado', async () => {
    let finishRequest: (value: SireProposalResponse) => void = () => undefined;
    vi.spyOn(sireApi, 'getProposal').mockImplementation(
      () => new Promise((resolve) => { finishRequest = resolve; }),
    );
    render(<SireProposalPanel period="202610" bookType="RVIE_VENTAS" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cargar propuesta' }));

    expect(screen.getByRole('status')).toHaveTextContent('sigue pendiente');
    expect(screen.queryByText(/Propuesta cargada:/)).not.toBeInTheDocument();
    await act(async () => finishRequest(proposal));
    expect(await screen.findByText('Propuesta cargada: 1 comprobantes.')).toBeInTheDocument();
  });

  it('muestra errores de conflicto sin presentar la propuesta como cargada', async () => {
    vi.spyOn(sireApi, 'getProposal').mockRejectedValue(new Error('Conflicto al procesar la propuesta SIRE (HTTP 409). CAR incompatible.'));
    render(<SireProposalPanel period="202610" bookType="RVIE_VENTAS" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cargar propuesta' }));

    expect(await screen.findByText(/Conflicto al procesar la propuesta SIRE/)).toBeInTheDocument();
    expect(screen.queryByText(/Propuesta cargada:/)).not.toBeInTheDocument();
  });
});

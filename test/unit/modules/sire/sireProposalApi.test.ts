import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENV } from '@/config/env.config';
import { sireApi } from '@/modules/sire/services/sireApi';
import { useAuthStore } from '@/stores/authStore';
import type { SireProposalResponse } from '@/modules/sire/types/sire.types';

const response: SireProposalResponse = {
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sireApi.getProposal', () => {
  it('consulta la propuesta usando solo el periodo y el libro', async () => {
    useAuthStore.setState({
      token: 'test-access-token',
      activeCompany: { tenantId: 'company-session', ruc: '20100070970', razonSocial: 'Empresa fixture' },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(response),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(sireApi.getProposal('202610', 'RVIE_VENTAS')).resolves.toEqual(response);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ENV.VITE_API_URL}/sire/proposal`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({ period: '202610', bookType: 'RVIE_VENTAS' });
    expect(options.body).not.toContain('companyId');
    expect(options.body).not.toContain('ruc');
    expect(options.body).not.toContain('password');
    expect(options.body).not.toContain('solPassword');
  });

  it('rechaza respuestas de propuesta con registros inválidos', async () => {
    useAuthStore.setState({ token: 'test-access-token' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ...response, proposals: [{ id: 'invalid' }] }),
    }));

    await expect(sireApi.getProposal('202610', 'RVIE_VENTAS')).rejects.toThrow('formato inválido');
  });
});

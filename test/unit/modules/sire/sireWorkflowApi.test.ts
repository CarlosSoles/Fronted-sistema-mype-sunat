import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENV } from '@/config/env.config';
import { useAuthStore } from '@/stores/authStore';
import { sireApi } from '@/modules/sire/services/sireApi';

const request = {
  ruc: '20123456789',
  period: '202611',
  bookType: 'RCE_COMPRAS' as const,
  proposalId: 'proposal-001',
  carSunat: 'CAR-MOCK-001',
  reason: 'Duplicado',
};

const response = {
  period: request.period,
  bookType: request.bookType,
  state: 'PROCESANDO_PRELIMINAR' as const,
  ticket: 'TICKET-MOCK-001',
  status: 'PENDIENTE' as const,
  records: [],
  error: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sireApi workflow actions', () => {
  it('sends only proposalId, carSunat and reason in exclusion actions', async () => {
    useAuthStore.setState({ token: 'session-token' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(response),
    });
    vi.stubGlobal('fetch', fetchMock);

    await sireApi.exclude(request);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ENV.VITE_API_URL}/sire/excluir?ruc=${request.ruc}&period=${request.period}&bookType=${request.bookType}`);
    expect(JSON.parse(options.body as string)).toEqual({
      proposalId: request.proposalId,
      carSunat: request.carSunat,
      reason: request.reason,
    });
  });

  it('queries ticket status with the ticket and accepts terminal ERROR status', async () => {
    useAuthStore.setState({ token: 'session-token' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        ...response,
        state: 'ERROR',
        status: 'ERROR',
        error: { code: 'SUNAT_ERROR', message: 'SUNAT rechazó la operación' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sireApi.getStatus({
      ruc: request.ruc,
      period: request.period,
      bookType: request.bookType,
      ticket: response.ticket,
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsedUrl = new URL(url, 'http://localhost');
    expect(url.startsWith(`${ENV.VITE_API_URL}/sire/status`)).toBe(true);
    expect(parsedUrl.searchParams.get('ticket')).toBe(response.ticket);
    expect(result.status).toBe('ERROR');
  });
});

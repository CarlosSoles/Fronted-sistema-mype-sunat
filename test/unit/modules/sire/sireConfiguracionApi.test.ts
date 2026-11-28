import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sireApi } from '@/modules/sire/services/sireApi';
import { useAuthStore } from '@/stores/authStore';

const response = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

beforeEach(() => {
  useAuthStore.setState({ token: 'test-access-token' });
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sireApi.saveConfiguracion', () => {
  it('interpreta el 200 real del backend y registra la respuesta', async () => {
    const backendResponse = {
      success: true,
      message: 'Credenciales guardadas',
      configured: true,
      companyId: 'company-1',
    };
    const fetchMock = vi.fn().mockResolvedValue(response(200, backendResponse));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sireApi.saveConfiguracion(
        {
          clientId: 'client',
          clientSecret: 'secret',
          solUser: 'SOLUSER',
          solPassword: 'solpass',
        },
        'company-1',
      ),
    ).resolves.toEqual({
      configured: true,
      message: 'Credenciales guardadas',
    });

    expect(vi.mocked(console.log)).toHaveBeenCalledWith(
      '[SIRE] Respuesta al guardar credenciales:',
      backendResponse,
    );
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/sire/configuracion');
  });

  it('trata un 201 con success como guardado exitoso aunque no traiga configured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(201, { success: true, message: 'Credenciales guardadas' }),
      ),
    );

    await expect(
      sireApi.saveConfiguracion({ clientId: 'client' }),
    ).resolves.toEqual({
      configured: true,
      message: 'Credenciales guardadas',
    });
  });

  it('propaga el mensaje del JSON cuando el backend responde 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(400, { message: 'Dato inválido para SUNAT' }),
      ),
    );

    await expect(
      sireApi.saveConfiguracion({ clientId: 'client' }),
    ).rejects.toMatchObject({
      name: 'SireApiError',
      status: 400,
      message: expect.stringContaining('Dato inválido para SUNAT'),
    });
  });
});

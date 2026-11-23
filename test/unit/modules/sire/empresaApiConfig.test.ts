import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { empresaApi } from '@/modules/sire/services/empresaApi';
import { useAuthStore } from '@/stores/authStore';

const okResponse = (data: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => data,
  }) as unknown as Response;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  useAuthStore.setState({ token: 'test-access-token' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('empresaApi empresa/configuracion', () => {
  it('lista las empresas del selector Multi-RUC', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse([
        {
          id: 'company-1',
          ruc: '20614142503',
          legalName: 'DEMO SAC',
          tradeName: 'DEMO',
          activa: true,
        },
        {
          id: 'company-2',
          ruc: '20100070970',
          razonSocial: 'EMPRESA DOS SAC',
          nombreComercial: 'EMPRESA DOS',
          activa: true,
        },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(empresaApi.listarEmpresas()).resolves.toEqual([
      {
        id: 'company-1',
        ruc: '20614142503',
        razonSocial: 'DEMO SAC',
        nombreComercial: 'DEMO',
        activa: true,
      },
      {
        id: 'company-2',
        ruc: '20100070970',
        razonSocial: 'EMPRESA DOS SAC',
        nombreComercial: 'EMPRESA DOS',
        activa: true,
      },
    ]);
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain('/empresa/listar');
  });

  it('envía el contrato del backend y no envía el RUC de la sesión', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await empresaApi.saveConfiguracion({
      razonSocial: 'EMPRESA NUEVA SAC',
      nombreComercial: 'EMPRESA NUEVA',
      direccion: 'AV. PRINCIPAL 123',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
      series: [' f001 ', 'F001', 'b001'],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/empresa/configuracion');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({
      businessName: 'EMPRESA NUEVA SAC',
      tradeName: 'EMPRESA NUEVA',
      direccion: 'AV. PRINCIPAL 123',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
      series: ['F001', 'B001'],
    });
  });

  it('envía companyId al guardar y al consultar la empresa seleccionada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await empresaApi.saveConfiguracion({ razonSocial: 'Otra' }, 'company-2');
    const saveBody = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(saveBody.companyId).toBe('company-2');

    fetchMock.mockResolvedValueOnce(
      okResponse({
        ruc: '20100070970',
        businessName: 'EMPRESA DOS',
        tradeName: null,
        direccion: null,
        estado: null,
        condicion: null,
        series: [],
      }),
    );
    await empresaApi.getConfiguracion('company-2');
    expect((fetchMock.mock.calls[1] as [string])[0]).toContain('companyId=company-2');
  });

  it('normaliza la respuesta GET a los nombres de la UI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okResponse({
          ruc: '20614142503',
          businessName: 'SYNC-SUNAT DEMO MYPE S.A.C.',
          tradeName: 'DEMO MYPE',
          direccion: 'Domicilio ficticio 123',
          estado: 'ACTIVO',
          condicion: 'HABIDO',
          series: ['F001', 'B001'],
        }),
      ),
    );

    await expect(empresaApi.getConfiguracion()).resolves.toEqual({
      ruc: '20614142503',
      razonSocial: 'SYNC-SUNAT DEMO MYPE S.A.C.',
      nombreComercial: 'DEMO MYPE',
      direccion: 'Domicilio ficticio 123',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
      series: ['F001', 'B001'],
    });
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENV } from '@/config/env.config';
import { MatchStatusBadge } from '@/modules/sire/components/MatchStatusBadge';
import { scenarioPresentation } from '@/modules/sire/lib/sireScenarios';
import { SireComprobantesTable } from '@/modules/sire/components/SireComprobantesTable';
import { SirePeriodFilter } from '@/modules/sire/components/SirePeriodFilter';
import { SireVouchersTable } from '@/modules/sire/components/SireVouchersTable';
import { sireApi, SireApiError } from '@/modules/sire/services/sireApi';
import { useAuthStore } from '@/stores/authStore';
import { getAmountFeedback, getPeriodFeedback, getRucFeedback } from '@/modules/sire/validators/sireSchema';
import type { ReconcileRequest, ReconcileResponse, ReconcileScenario } from '@/modules/sire/types/sire.types';

const sessionRuc = '20100070970';
const payload: ReconcileRequest = {
  period: '202610',
  bookType: 'RVIE_VENTAS',
  comprobantes: [{
    tipoComprobante: '01',
    serie: 'F001',
    correlativo: '00001234',
    baseImponible: 100,
    igv: 18,
    total: 118,
  }],
};

const response: ReconcileResponse = {
  period: payload.period,
  bookType: payload.bookType,
  summary: {
    total: 1,
    coincidenciaExacta: 0,
    diferenciaMontos: 0,
    omisionLocal: 0,
    omisionSunat: 0,
    duplicadoLlave: 1,
    porcentajeCumplimiento: 72.35,
  },
  results: [{
    llave: `${sessionRuc}-01-F001-00001234`,
    tipoComprobante: '01',
    serie: 'F001',
    correlativo: '00001234',
    escenario: 'DUPLICADO_LLAVE',
    totalLocal: 118,
    totalSire: 118,
    diferenciaTotal: 0,
    diferenciaBase: 0,
    diferenciaIgv: 0,
    duplicateSource: 'AMBOS',
  }],
};

const backendResponse = {
  period: payload.period,
  bookType: payload.bookType,
  totalLocalRecords: 1,
  totalSireRecords: 1,
  exactMatchesCount: 0,
  discrepanciesCount: 1,
  complianceRate: 72.35,
  discrepancies: [{
    discrepancyType: 'DUPLICADO_LLAVE',
    emitterRuc: sessionRuc,
    documentType: '01',
    series: 'F001',
    correlative: '00001234',
    localTotalAmount: 118,
    sireTotalAmount: 118,
    amountDifference: 0,
    taxableBaseDifference: 0,
    igvDifference: 0,
    duplicateSource: 'AMBOS',
  }],
};

beforeEach(() => {
  useAuthStore.setState({
    token: 'test-access-token',
    activeCompany: { tenantId: 'company-session', ruc: sessionRuc, razonSocial: 'Empresa de prueba' },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sireApi.reconcile', () => {
  it('envía el contrato exacto con Bearer token y sin companyId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(backendResponse),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(sireApi.reconcile(payload)).resolves.toEqual(response);

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ENV.VITE_API_URL}/sire/reconcile`);
    expect(request.method).toBe('POST');
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer test-access-token');
    expect(JSON.parse(request.body as string)).toEqual({
      period: '202610',
      bookType: 'RVIE_VENTAS',
      localRecords: [{
        emitterRuc: sessionRuc,
        documentType: '01',
        series: 'F001',
        correlative: '00001234',
        taxableBase: 100,
        igvAmount: 18,
        totalAmount: 118,
      }],
    });
    expect(JSON.parse(request.body as string)).not.toHaveProperty('companyId');
    expect(request.body).not.toContain('password');
    expect(request.body).not.toContain('solPassword');
  });

  it.each([
    [400, 'Los datos enviados no son válidos'],
    [401, 'Tu sesión venció'],
    [403, 'No tienes permisos'],
    [409, 'Conflicto al procesar'],
    [500, 'error en el servidor'],
  ])('muestra un mensaje en español para HTTP %s', async (status, expectedMessage) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: vi.fn().mockResolvedValue({ message: 'Error de validación' }),
    }));

    await expect(sireApi.reconcile(payload)).rejects.toMatchObject({
      name: 'SireApiError',
      status,
      message: expect.stringContaining(expectedMessage),
    });
  });

  it('informa cuando la sesión no tiene token', async () => {
    useAuthStore.setState({ token: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sireApi.reconcile(payload)).rejects.toBeInstanceOf(SireApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the RUC from the authenticated company and refuses reconciliation without it', async () => {
    useAuthStore.setState({ activeCompany: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sireApi.reconcile(payload)).rejects.toThrow('No se encontró el RUC de la empresa autenticada.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows HTTP 409 as a CAR conflict without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: vi.fn().mockResolvedValue({ message: 'CAR incompatible con la propuesta existente.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const error = await sireApi.reconcile(payload).then(
      () => null,
      (cause: unknown) => cause,
    );
    expect(error).toBeInstanceOf(SireApiError);
    if (!(error instanceof SireApiError)) throw new Error('Se esperaba un conflicto HTTP 409.');
    expect(error.status).toBe(409);
    expect(error.message).toContain('Conflicto');
    expect(error.message).toContain('CAR incompatible');
    expect(error.message).not.toMatch(/borrar|reemplazar/i);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${ENV.VITE_API_URL}/sire/reconcile`);
  });

  it('expone el detalle de errores de validación del backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({
        message: [{ field: 'period', rule: 'debe tener formato YYYYMM' }],
      }),
    }));

    await expect(sireApi.reconcile(payload)).rejects.toThrow('período: debe tener formato YYYYMM');
  });
});

describe('escenarios de conciliación', () => {
  it.each(Object.entries(scenarioPresentation))('%s tiene etiqueta y color', (scenario, presentation) => {
    render(<MatchStatusBadge status={scenario as ReconcileScenario} />);
    expect(screen.getByText(presentation.label)).toHaveClass(presentation.className.split(' ')[0]);
  });

  it('muestra el origen duplicado para revisión manual', () => {
    render(<SireVouchersTable results={response.results} />);
    expect(screen.getByText('AMBOS')).toBeInTheDocument();
    expect(screen.getByText('AMBOS').closest('tr')).toHaveTextContent('Llave duplicada · acción manual');
  });
});

describe('retroalimentación de validación del formulario', () => {
  it('comprueba formato y rango del período y el RUC', () => {
    expect(getPeriodFeedback('202613')).toContain('01 y 12');
    expect(getPeriodFeedback('202610')).toBeNull();
    expect(getRucFeedback('123')).toContain('11 dígitos');
    expect(getRucFeedback('20100070970')).toBeNull();
    expect(getRucFeedback('20100070971')).toContain('dígito verificador');
  });

  it('advierte importes con más de dos decimales', () => {
    expect(getAmountFeedback('18.123')).toContain('hasta 2 decimales');
    expect(getAmountFeedback('18.12')).toBeNull();
  });

  it('mantiene ocultos los avisos hasta que se inicie la conciliación', () => {
    render(
      <>
        <SirePeriodFilter
          period="202613"
          companyRuc=""
          disabled={false}
          showFeedback={false}
          onPeriodChange={vi.fn()}
        />
        <SireComprobantesTable
          comprobantes={[{
            tipoComprobante: '01',
            serie: '',
            correlativo: '',
            baseImponible: '',
            igv: '',
            total: '',
          }]}
          showFeedback={false}
          onChange={vi.fn()}
        />
      </>,
    );
    expect(screen.queryByText(/mes debe estar entre/)).not.toBeInTheDocument();
    expect(screen.queryByText(/RUC debe contener/)).not.toBeInTheDocument();
    expect(screen.queryByText('Ingrese un importe numérico.')).not.toBeInTheDocument();
  });

  it('muestra los avisos después de iniciar la conciliación', () => {
    render(
      <>
        <SirePeriodFilter
          period="202613"
          companyRuc=""
          disabled={false}
          showFeedback
          onPeriodChange={vi.fn()}
        />
        <SireComprobantesTable
          comprobantes={[{
            tipoComprobante: '01',
            serie: '',
            correlativo: '',
            baseImponible: '',
            igv: '',
            total: '',
          }]}
          showFeedback
          onChange={vi.fn()}
        />
      </>,
    );
    expect(screen.getByText(/mes debe estar entre/)).toBeInTheDocument();
    expect(screen.getByText('Ingrese el RUC de 11 dígitos.')).toBeInTheDocument();
    expect(screen.getAllByText('Ingrese un importe numérico.')).toHaveLength(3);
  });
});

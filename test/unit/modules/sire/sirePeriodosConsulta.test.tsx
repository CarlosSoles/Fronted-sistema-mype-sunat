import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENV } from '@/config/env.config';
import SirePeriodosPage from '@/modules/sire/pages/SirePeriodosPage';
import { sireApi } from '@/modules/sire/services/sireApi';
import {
  SIRE_POLL_INTERVAL_MS,
  SIRE_POLL_MAX_ATTEMPTS,
} from '@/modules/sire/hooks/useSireConsultation';
import { useAuthStore } from '@/stores/authStore';
import type { SirePeriodosStatus } from '@/modules/sire/types/sire.types';

const bookCode = '140000';

/** Payload crudo que el backend guarda y devuelve (respuesta literal de SUNAT). */
const rawPeriods = { periodos: ['202601', '202602'] };

const selectBookCode = (code: string) => {
  const trigger = screen.getByLabelText('Código de libro');
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('option', { name: new RegExp(code) }));
};

const fillForm = () => {
  selectBookCode(bookCode);
};

const status = (partial: Partial<SirePeriodosStatus>): SirePeriodosStatus => ({
  status: 'PENDING',
  periods: [],
  ...partial,
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  useAuthStore.setState({ token: 'test-access-token' });
  Object.assign(HTMLElement.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    scrollIntoView: () => {},
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sireApi.requestPeriodos', () => {
  it('encola el trabajo con el contrato documentado y autenticación Bearer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: vi.fn().mockResolvedValue({ messageId: 'msg-123', status: 'PENDING' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sireApi.requestPeriodos({ bookCode }),
    ).resolves.toEqual({ messageId: 'msg-123', status: 'PENDING' });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ENV.VITE_API_URL}/sire/periodos`);
    expect(options.method).toBe('POST');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-access-token');
    expect(JSON.parse(options.body as string)).toEqual({ bookCode });
    // La petición lleva tope de espera: una cola lenta no debe colgar la UI.
    expect(options.signal).toBeDefined();
  });

  it('propaga el mensaje accionable cuando la cola no pudo encolar el trabajo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: vi.fn().mockResolvedValue({
        messageId: 'msg-123',
        status: 'FAILED',
        errorCode: 'QUEUE_ENQUEUE_FAILED',
        message: 'El servicio de colas no está disponible, por favor reintenta.',
        error: 'El servicio de colas no está disponible, por favor reintenta.',
      }),
    }));

    await expect(
      sireApi.requestPeriodos({ bookCode }),
    ).rejects.toThrow('El servicio de colas no está disponible');
  });

  it('exige código de libro antes de llamar al backend', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sireApi.requestPeriodos({ bookCode: '' as never }),
    ).rejects.toThrow('código de libro es obligatorio');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza una respuesta 202 sin messageId válido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: vi.fn().mockResolvedValue({ status: 'PENDING' }),
    }));

    await expect(
      sireApi.requestPeriodos({ bookCode }),
    ).rejects.toThrow('formato válido');
  });
});

describe('sireApi.getPeriodosStatus', () => {
  it('consulta el estado del trabajo con el messageId y normaliza los periodos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        messageId: 'msg-123',
        status: 'COMPLETED',
        bookCode,
        periods: rawPeriods,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await sireApi.getPeriodosStatus('msg-123');
    expect(response.status).toBe('COMPLETED');
    expect(response.periods).toEqual([{ period: '202601' }, { period: '202602' }]);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ENV.VITE_API_URL}/sire/periodos/status/msg-123`);
    expect(options.method).toBe('GET');
    expect(options.signal).toBeDefined();
  });

  it('normaliza un payload de SUNAT con objetos y nombres en español', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        status: 'COMPLETED',
        periods: [{ codigoPeriodo: '202601', estado: 'OK', cantidadRegistros: 12 }],
      }),
    }));

    const response = await sireApi.getPeriodosStatus('msg-123');
    expect(response.periods).toEqual([{ period: '202601', status: 'OK', recordCount: 12 }]);
  });

  it('acepta PROCESSING como estado en curso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ status: 'PROCESSING' }),
    }));

    await expect(sireApi.getPeriodosStatus('msg-123')).resolves.toMatchObject({
      status: 'PROCESSING',
    });
  });

  it('rechaza estados o resultados con formato inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ status: 'UNKNOWN' }),
    }));
    await expect(sireApi.getPeriodosStatus('msg-123')).rejects.toThrow('formato inválido');
  });
});

describe('SirePeriodosPage', () => {
  it('muestra el estado pendiente y solo publica la tabla cuando el trabajo se completa', async () => {
    vi.useFakeTimers();
    const statusMock = vi.spyOn(sireApi, 'getPeriodosStatus')
      .mockResolvedValueOnce(status({ status: 'PENDING' }))
      .mockResolvedValueOnce(status({ status: 'COMPLETED', periods: [{ period: '202601' }] }));
    vi.spyOn(sireApi, 'requestPeriodos').mockResolvedValue({ messageId: 'msg-123', status: 'PENDING' });

    render(<SirePeriodosPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Consultando a SUNAT...');
    expect(screen.getByRole('button', { name: /Consultando/ })).toBeDisabled();
    expect(screen.queryByText('202601')).not.toBeInTheDocument();
    expect(statusMock).toHaveBeenCalledTimes(1);
    expect(statusMock).toHaveBeenCalledWith('msg-123');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIRE_POLL_INTERVAL_MS);
    });

    expect(statusMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('202601')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultar' })).not.toBeDisabled();

    // El sondeo se detiene al concluir el trabajo.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIRE_POLL_INTERVAL_MS * 3);
    });
    expect(statusMock).toHaveBeenCalledTimes(2);
  });

  it('sigue sondeando mientras el worker procesa la consulta', async () => {
    vi.useFakeTimers();
    const statusMock = vi.spyOn(sireApi, 'getPeriodosStatus')
      .mockResolvedValueOnce(status({ status: 'PROCESSING' }))
      .mockResolvedValueOnce(status({ status: 'PROCESSING' }))
      .mockResolvedValueOnce(status({ status: 'COMPLETED', periods: [{ period: '202601' }] }));
    vi.spyOn(sireApi, 'requestPeriodos').mockResolvedValue({ messageId: 'msg-123', status: 'PENDING' });

    render(<SirePeriodosPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIRE_POLL_INTERVAL_MS);
    });

    expect(statusMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('Consultando a SUNAT...');
    expect(screen.queryByText(/formato inválido/)).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIRE_POLL_INTERVAL_MS);
    });

    expect(statusMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText('202601')).toBeInTheDocument();
  });

  it('presenta el error informado por el backend sin renderizar la tabla', async () => {
    vi.useFakeTimers();
    vi.spyOn(sireApi, 'requestPeriodos').mockResolvedValue({ messageId: 'msg-123', status: 'PENDING' });
    vi.spyOn(sireApi, 'getPeriodosStatus').mockResolvedValue(
      status({
        status: 'FAILED',
        error: 'El servicio de SUNAT no está disponible temporalmente. Inténtalo más tarde.',
        errorCode: 'SUNAT_HTTP_502',
      }),
    );

    render(<SirePeriodosPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(
      screen.getByText('El servicio de SUNAT no está disponible temporalmente. Inténtalo más tarde.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('202601')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultar' })).not.toBeDisabled();
  });

  it('muestra el mensaje del backend cuando la consulta culmina sin resultado legible', async () => {
    vi.useFakeTimers();
    vi.spyOn(sireApi, 'requestPeriodos').mockResolvedValue({ messageId: 'msg-123', status: 'PENDING' });
    vi.spyOn(sireApi, 'getPeriodosStatus').mockResolvedValue(
      status({
        status: 'COMPLETED',
        periods: [],
        message: 'La consulta se completó, pero no fue posible leer el resultado almacenado.',
      }),
    );

    render(<SirePeriodosPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(
      screen.getByText('La consulta se completó, pero no fue posible leer el resultado almacenado.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('mantiene un solo sondeo activo si se lanzan dos consultas seguidas', async () => {
    vi.useFakeTimers();
    const statusMock = vi.spyOn(sireApi, 'getPeriodosStatus').mockResolvedValue(status({ status: 'PENDING' }));
    vi.spyOn(sireApi, 'requestPeriodos').mockResolvedValue({ messageId: 'msg-123', status: 'PENDING' });

    render(<SirePeriodosPage />);
    fillForm();
    const button = screen.getByRole('button', { name: 'Consultar' });
    fireEvent.click(button);
    fireEvent.click(button);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIRE_POLL_INTERVAL_MS);
    });

    // Un único intervalo: la segunda consulta cancela el intervalo anterior.
    expect(statusMock).toHaveBeenCalledTimes(2);
  });

  it('cancela el sondeo al desmontar la pantalla con su clearInterval', async () => {
    vi.useFakeTimers();
    const statusMock = vi.spyOn(sireApi, 'getPeriodosStatus').mockResolvedValue(status({ status: 'PENDING' }));
    vi.spyOn(sireApi, 'requestPeriodos').mockResolvedValue({ messageId: 'msg-123', status: 'PENDING' });

    const { unmount } = render(<SirePeriodosPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(statusMock).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIRE_POLL_INTERVAL_MS * 3);
    });
    expect(statusMock).toHaveBeenCalledTimes(1);
  });

  it('cierra la consulta con error si el trabajo no termina a tiempo', async () => {
    vi.useFakeTimers();
    vi.spyOn(sireApi, 'requestPeriodos').mockResolvedValue({ messageId: 'msg-123', status: 'PENDING' });
    vi.spyOn(sireApi, 'getPeriodosStatus').mockResolvedValue(status({ status: 'PENDING' }));

    render(<SirePeriodosPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIRE_POLL_INTERVAL_MS * (SIRE_POLL_MAX_ATTEMPTS + 1));
    });

    expect(screen.getByText(/superó el tiempo de espera esperado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultar' })).not.toBeDisabled();
  });

  it('valida que el código de libro sea obligatorio', async () => {
    const request = vi.spyOn(sireApi, 'requestPeriodos');
    render(<SirePeriodosPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(await screen.findByText('El código de libro es obligatorio.')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('presenta el error de autenticación sin resultado', async () => {
    useAuthStore.setState({ token: null });
    render(<SirePeriodosPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(await screen.findByText(/sesión venció o no es válida/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('202601')).not.toBeInTheDocument());
  });
});

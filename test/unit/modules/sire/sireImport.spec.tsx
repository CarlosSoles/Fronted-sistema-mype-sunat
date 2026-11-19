import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ENV } from '@/config/env.config';
import SireImportPage from '@/modules/sire/pages/SireImportPage';
import { sireApi, SireApiError } from '@/modules/sire/services/sireApi';
import { useAuthStore } from '@/stores/authStore';
import type { SireImportacionRespuesta } from '@/modules/sire/types/sire.types';

const importResult: SireImportacionRespuesta = {
  messageId: '11111111-1111-4111-8111-111111111111',
  importacionId: 'importacion-1',
  periodo: '202610',
  libro: 'RCE_COMPRAS',
  nombreArchivo: 'LE20614142503-RCE-202610.zip',
  estado: 'PENDING',
  rutaArchivo: 'sire/importaciones/archivo.zip',
  backendAlmacen: 'SUPABASE',
  hashArchivo: 'abc123',
  bytes: 1234,
  createdAt: '2026-11-19T10:00:00.000Z',
};

beforeEach(() => {
  useAuthStore.setState({ token: 'test-access-token' });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sireApi.importProposal', () => {
  it('envía archivo, periodo y libro a /sire/importar como multipart', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: vi.fn().mockResolvedValue(importResult),
    });
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['row'], 'LE20614142503-RCE-202610.zip', {
      type: 'application/zip',
    });

    await expect(sireApi.importProposal('202610', 'RCE_COMPRAS', file)).resolves.toEqual(
      importResult,
    );

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ENV.VITE_API_URL}/sire/importar`);
    expect(request.method).toBe('POST');
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer test-access-token');
    expect(new Headers(request.headers).has('Content-Type')).toBe(false);
    expect(Array.from((request.body as FormData).keys())).toEqual(['file', 'periodo', 'libro']);
    expect((request.body as FormData).get('file')).toBe(file);
    expect((request.body as FormData).get('periodo')).toBe('202610');
    expect((request.body as FormData).get('libro')).toBe('RCE_COMPRAS');
  });

  it('muestra errores HTTP y no reintenta', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ message: 'Error del servidor.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sireApi.importProposal(
        '202610',
        'RCE_COMPRAS',
        new File(['row'], 'LE20614142503-RCE-202610.zip'),
      ),
    ).rejects.toMatchObject({
      name: 'SireApiError',
      status: 500,
      message: expect.stringContaining('Error del servidor.'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rechaza extensiones distintas de .txt/.zip sin llamar al backend', async () => {
    useAuthStore.setState({ token: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sireApi.importProposal('202610', 'RVIE_VENTAS', new File(['x'], 'records.csv')),
    ).rejects.toThrow('archivo .txt o .zip');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('SireImportPage', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <SireImportPage />
      </MemoryRouter>,
    );
  const selectFile = () =>
    fireEvent.change(screen.getByLabelText('Archivo SIRE (.txt o .zip)'), {
      target: {
        files: [new File(['row'], 'LE20614142503-RCE-202610.zip', { type: 'application/zip' })],
      },
    });

  it('muestra el éxito real de la importación encolada', async () => {
    const importSpy = vi.spyOn(sireApi, 'importProposal').mockResolvedValue(importResult);
    renderPage();
    fireEvent.change(screen.getByLabelText('Periodo fiscal (YYYYMM)'), {
      target: { value: '202610' },
    });
    fireEvent.change(screen.getByLabelText('Libro'), { target: { value: 'RCE_COMPRAS' } });
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));

    expect(importSpy).toHaveBeenCalledWith('202610', 'RCE_COMPRAS', expect.any(File));
    expect(await screen.findByText('Importación recibida')).toBeInTheDocument();
    expect(screen.getByText(/LE20614142503-RCE-202610.zip quedó registrado/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(importResult.messageId))).toBeInTheDocument();
  });

  it('valida el periodo antes de llamar al backend', async () => {
    const importSpy = vi.spyOn(sireApi, 'importProposal');
    renderPage();
    fireEvent.change(screen.getByLabelText('Periodo fiscal (YYYYMM)'), {
      target: { value: '202613' },
    });
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));

    expect(await screen.findByText('Ingresa un periodo válido con formato YYYYMM.')).toBeInTheDocument();
    expect(importSpy).not.toHaveBeenCalled();
  });

  it('mantiene el spinner y no muestra éxito antes de la respuesta', async () => {
    let finishImport: (value: SireImportacionRespuesta) => void = () => undefined;
    vi.spyOn(sireApi, 'importProposal').mockImplementation(
      () => new Promise((resolve) => {
        finishImport = resolve;
      }),
    );
    renderPage();
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));

    expect(screen.getByRole('status')).toHaveTextContent('Enviando el archivo al backend');
    expect(screen.queryByText('Importación recibida')).not.toBeInTheDocument();
    await act(async () => finishImport(importResult));
    expect(await screen.findByText('Importación recibida')).toBeInTheDocument();
  });

  it('muestra el fallo real sin éxito', async () => {
    vi.spyOn(sireApi, 'importProposal').mockRejectedValue(
      new SireApiError('Error del servidor', 500),
    );
    renderPage();
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));

    expect(await screen.findByText('Error del servidor')).toBeInTheDocument();
    expect(screen.queryByText('Importación recibida')).not.toBeInTheDocument();
  });
});

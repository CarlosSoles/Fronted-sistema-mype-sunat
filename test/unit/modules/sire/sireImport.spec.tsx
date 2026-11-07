import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ENV } from '@/config/env.config';
import SireImportPage from '@/modules/sire/pages/SireImportPage';
import { sireApi, SireApiError } from '@/modules/sire/services/sireApi';
import { useAuthStore } from '@/stores/authStore';
import type { ImportSireProposalResponse } from '@/modules/sire/types/sire.types';

const importResult: ImportSireProposalResponse = {
  imported: 2,
  rejected: 1,
  errors: [{ line: 3, reason: 'Fecha, monto o CAR inválido.' }],
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
  it('envía archivo, periodo y libro como multipart sin datos adicionales', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue(importResult),
    });
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['row'], 'proposal.txt', { type: 'text/plain' });

    await expect(sireApi.importProposal('202610', 'RVIE_VENTAS', file)).resolves.toEqual(importResult);

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ENV.VITE_API_URL}/sire/import`);
    expect(request.method).toBe('POST');
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer test-access-token');
    expect(new Headers(request.headers).has('Content-Type')).toBe(false);
    expect(Array.from((request.body as FormData).keys())).toEqual(['file', 'period', 'bookType']);
    expect((request.body as FormData).get('file')).toBe(file);
    expect((request.body as FormData).get('period')).toBe('202610');
    expect((request.body as FormData).get('bookType')).toBe('RVIE_VENTAS');
  });

  it('muestra errores HTTP y no reintenta', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ message: 'Error del servidor.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sireApi.importProposal('202610', 'RCE_COMPRAS', new File(['row'], 'proposal.txt')),
    ).rejects.toMatchObject({
      name: 'SireApiError',
      status: 500,
      message: expect.stringContaining('Error del servidor.'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no hace la petición si falta sesión y rechaza el formato TXT inválido', async () => {
    useAuthStore.setState({ token: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sireApi.importProposal('202610', 'RVIE_VENTAS', new File(['x'], 'records.csv'))).rejects.toBeInstanceOf(SireApiError);
    expect(fetchMock).not.toHaveBeenCalled();

    useAuthStore.setState({ token: 'test-access-token' });
    await expect(sireApi.importProposal('202610', 'RVIE_VENTAS', new File(['x'], 'records.csv'))).rejects.toThrow('archivo TXT');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('SireImportPage', () => {
  const renderPage = () => render(<MemoryRouter><SireImportPage /></MemoryRouter>);
  const selectFile = () => fireEvent.change(screen.getByLabelText('Archivo TXT provisional'), {
    target: { files: [new File(['row'], 'proposal.txt', { type: 'text/plain' })] },
  });

  it('muestra el resultado parcial de la importación y advierte que el formato no es oficial', async () => {
    const importSpy = vi.spyOn(sireApi, 'importProposal').mockResolvedValue(importResult);
    renderPage();
    fireEvent.change(screen.getByLabelText('Periodo fiscal (YYYYMM)'), { target: { value: '202610' } });
    fireEvent.change(screen.getByLabelText('Libro'), { target: { value: 'RCE_COMPRAS' } });
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: 'Importar propuesta' }));

    expect(importSpy).toHaveBeenCalledWith('202610', 'RCE_COMPRAS', expect.any(File));
    expect(await screen.findByText('Importación parcial')).toBeInTheDocument();
    expect(screen.getByText(/Se importaron 2 filas y se rechazaron 1/)).toBeInTheDocument();
    expect(screen.getByText('Línea 3: Fecha, monto o CAR inválido.')).toBeInTheDocument();
    expect(screen.getByText(/no el layout oficial SUNAT/)).toBeInTheDocument();
  });

  it('valida el periodo antes de llamar al backend', async () => {
    const importSpy = vi.spyOn(sireApi, 'importProposal');
    renderPage();
    fireEvent.change(screen.getByLabelText('Periodo fiscal (YYYYMM)'), { target: { value: '202613' } });
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: 'Importar propuesta' }));

    expect(await screen.findByText('Ingresa un periodo válido con formato YYYYMM.')).toBeInTheDocument();
    expect(importSpy).not.toHaveBeenCalled();
  });

  it('mantiene la operación pendiente y no muestra éxito antes de la respuesta', async () => {
    let finishImport: (value: ImportSireProposalResponse) => void = () => undefined;
    vi.spyOn(sireApi, 'importProposal').mockImplementation(
      () => new Promise((resolve) => { finishImport = resolve; }),
    );
    renderPage();
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: 'Importar propuesta' }));

    expect(screen.getByRole('status')).toHaveTextContent('pendiente de respuesta');
    expect(screen.queryByText(/Importación completada/)).not.toBeInTheDocument();
    await act(async () => finishImport({ imported: 1, rejected: 0, errors: [] }));
    expect(await screen.findByText('Importación completada')).toBeInTheDocument();
  });

  it('muestra el fallo sin éxito y no solicita ni muestra contraseñas SOL', async () => {
    vi.spyOn(sireApi, 'importProposal').mockRejectedValue(new SireApiError('Error del servidor', 500));
    renderPage();
    expect(screen.queryByLabelText(/SOL|contraseña|clave/i)).not.toBeInTheDocument();
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: 'Importar propuesta' }));

    expect(await screen.findByText('Error del servidor')).toBeInTheDocument();
    expect(screen.queryByText(/Importación completada/)).not.toBeInTheDocument();
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/axios';
import { MatchStatusBadge } from '@/modules/sire/components/MatchStatusBadge';
import { SireMetricsCards } from '@/modules/sire/components/SireMetricsCards';
import { sireApi } from '@/modules/sire/services/sireApi';
import { sireSchema } from '@/modules/sire/validators/sireSchema';
import {
  type SireReconciliationRequest,
  type SireReconciliationSummary,
} from '@/modules/sire/types/sire.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const summary: SireReconciliationSummary = {
  totalPropuestaSunat: 1234.5,
  totalRegistroLocal: 1200,
  comprobantesConciliados: 8,
  comprobantesConDiscrepancia: 2,
  diferenciaNeta: 34.5,
};

describe('SireMetricsCards', () => {
  it('renders SUNAT and ERP totals formatted in soles', () => {
    render(<SireMetricsCards summary={summary} />);

    expect(screen.getByText('S/ 1,234.50')).toBeInTheDocument();
    expect(screen.getByText('S/ 1,200.00')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

describe('MatchStatusBadge', () => {
  it('uses the outline semantic variant for reconciled vouchers', () => {
    render(<MatchStatusBadge status="CONCILIADO" />);

    expect(screen.getByText('Conciliado')).toHaveAttribute('data-variant', 'outline');
  });

  it('uses the destructive semantic variant for discrepancies', () => {
    render(<MatchStatusBadge status="DISCREPANCIA" />);

    expect(screen.getByText('Discrepancia')).toHaveAttribute('data-variant', 'destructive');
  });
});

describe('sireSchema', () => {
  it.each(['20261', '2026101', '20A610', '202600', '202613'])(
    'rejects invalid fiscal period %s',
    (period) => {
      expect(sireSchema.safeParse({ period, bookType: 'RVIE_VENTAS' }).success).toBe(false);
    },
  );

  it('accepts a valid YYYYMM period and book type', () => {
    expect(sireSchema.safeParse({ period: '202610', bookType: 'RCE_COMPRAS' }).success).toBe(true);
  });
});

describe('sireApi.reconcile', () => {
  const request: SireReconciliationRequest = {
    period: '202610',
    bookType: 'RVIE_VENTAS',
    localRecords: [],
  };

  it('posts the typed reconciliation request to the backend endpoint', async () => {
    const response: AxiosResponse<{ vouchers: []; summary: SireReconciliationSummary }> = {
      data: { vouchers: [], summary },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(response);

    await expect(sireApi.reconcile(request)).resolves.toMatchObject({ source: 'api' });
    expect(post).toHaveBeenCalledWith('/sire/reconcile', request);
  });

  it('returns clearly marked mock data when the backend is unreachable', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await sireApi.reconcile(request);

    expect(result.source).toBe('mock');
    expect(result.vouchers.length).toBeGreaterThan(0);
    expect(console.warn).toHaveBeenCalled();
  });
});

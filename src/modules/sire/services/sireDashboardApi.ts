import { ENV } from '@/config/env.config';
import { useAuthStore } from '@/stores/authStore';
import { SireApiError } from './sireApi';
import type {
  SireDashboardHistoryRequest,
  SireDashboardHistoryResponse,
  SireDashboardHistoryPoint,
  SireDashboardMetrics,
} from '../types/sire.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNullableNumber = (value: unknown): value is number | null => value === null || isNumber(value);

const isHistoryPoint = (value: unknown): value is SireDashboardHistoryPoint =>
  isRecord(value) &&
  typeof value.timestamp === 'string' &&
  isNumber(value.retries) &&
  isNullableNumber(value.availabilityPercent);

const validateMetrics = (value: unknown): SireDashboardMetrics => {
  if (
    !isRecord(value) ||
    (value.state !== 'CLOSED' && value.state !== 'OPEN' && value.state !== 'HALF_OPEN') ||
    !isNumber(value.recentFailedCalls) ||
    !isNumber(value.failureRate) ||
    !isNumber(value.slowCallRate) ||
    !isNumber(value.bufferedInvoicesCount) ||
    !isNumber(value.totalCalls) ||
    !isNumber(value.successfulCalls) ||
    !isNumber(value.failedCalls) ||
    !isNumber(value.totalRetries) ||
    typeof value.lastStateChange !== 'string' ||
    !isNullableNumber(value.mttd) ||
    !isNullableNumber(value.mttr) ||
    !isNullableNumber(value.mtbf)
  ) {
    throw new SireApiError('El servidor devolvió métricas SIRE con un formato inválido.', null);
  }
  return {
    state: value.state,
    recentFailedCalls: value.recentFailedCalls,
    failureRate: value.failureRate,
    slowCallRate: value.slowCallRate,
    bufferedInvoicesCount: value.bufferedInvoicesCount,
    totalCalls: value.totalCalls,
    successfulCalls: value.successfulCalls,
    failedCalls: value.failedCalls,
    totalRetries: value.totalRetries,
    lastStateChange: value.lastStateChange,
    mttd: value.mttd,
    mttr: value.mttr,
    mtbf: value.mtbf,
  };
};

const validateHistory = (value: unknown): SireDashboardHistoryResponse => {
  const points = isRecord(value) && Array.isArray(value.points)
    ? value.points.filter(isHistoryPoint)
    : [];
  if (
    !isRecord(value) ||
    !Array.isArray(value.points) ||
    points.length !== value.points.length ||
    !isNumber(value.limit) ||
    !isNumber(value.offset) ||
    typeof value.hasMore !== 'boolean'
  ) {
    throw new SireApiError('El servidor devolvió un historial SIRE con un formato inválido.', null);
  }
  return { points, limit: value.limit, offset: value.offset, hasMore: value.hasMore };
};

const request = async (path: string): Promise<unknown> => {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new SireApiError('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 401);
  }

  let response: Response;
  try {
    response = await fetch(`${ENV.VITE_API_URL}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new SireApiError('No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.', null);
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    if (response.ok) {
      throw new SireApiError('El servidor devolvió una respuesta con formato inválido.', response.status);
    }
  }

  if (!response.ok) {
    const detail =
      typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
        ? ` ${body.message}`
        : '';
    throw new SireApiError(`No se pudo consultar el dashboard SIRE (HTTP ${response.status}).${detail}`, response.status);
  }

  return body;
};

export const sireDashboardApi = {
  async getMetrics(): Promise<SireDashboardMetrics> {
    return validateMetrics(await request('/sire/dashboard/metrics'));
  },

  async getHistory(params: SireDashboardHistoryRequest): Promise<SireDashboardHistoryResponse> {
    const query = new URLSearchParams({
      start: params.start,
      end: params.end,
      granularity: params.granularity,
      limit: String(params.limit),
      offset: String(params.offset),
    });
    return validateHistory(await request(`/sire/dashboard/history?${query.toString()}`));
  },
};

import { useAuthStore } from '@/stores/authStore';
import { getRucFeedback } from '../validators/sireSchema';
import type {
  ImportSireProposalResponse,
  CloseSirePeriodResponse,
  ReconcileRequest,
  ReconcileResponse,
  ReconcileScenario,
  SireHistoryResponse,
  SirePeriodosAcceptedResponse,
  SirePeriodosRequest,
  SirePeriodosStatus,
  SireBookType,
  SireProposalResponse,
} from '../types/sire.types';
import {
  assertAllowedProposalFile,
  assertValidPeriod,
  redactSireSecret,
  requestSireApi,
  SireApiError,
} from './sireApiHttp';
import {
  isBackendReconciliation,
  isImportResponse,
  isPeriodosAcceptedResponse,
  isPeriodosStatusResponse,
  isProposalResponse,
  mapPeriodosStatus,
  mapReconciliation,
} from './sireApiMappers';

export { SireApiError } from './sireApiHttp';

/**
 * Tope del POST /sire/periodos. El backend encola el trabajo y responde 202;
 * si la cola está saturada la respuesta no debe tardar indefinidamente.
 */
const SIRE_PERIODOS_REQUEST_TIMEOUT_MS = 20_000;

/** El GET de estado solo lee la base de datos: debe ser rápido. */
const SIRE_PERIODOS_STATUS_TIMEOUT_MS = 15_000;


export const sireApi = {
  async closePeriod(period: string, bookType: SireBookType): Promise<CloseSirePeriodResponse> {
    assertValidPeriod(period);
    const response = await requestSireApi<unknown>('/sire/close', {
      method: 'POST',
      body: JSON.stringify({ period, bookType }),
    });
    if (
      typeof response !== 'object' ||
      response === null ||
      !('period' in response) ||
      response.period !== period ||
      !('bookType' in response) ||
      response.bookType !== bookType ||
      !('status' in response) ||
      response.status !== 'CERRADO'
    ) {
      throw new SireApiError('El servidor no confirmó el cierre con un resultado válido.', null);
    }
    return { period, bookType, status: 'CERRADO' };
  },

  async getHistory(page = 1, limit = 20): Promise<SireHistoryResponse> {
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
      throw new SireApiError('La paginación del historial SIRE no es válida.', 400);
    }
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    const response = await requestSireApi<unknown>(`/sire/history?${query}`, { method: 'GET' });
    if (
      typeof response !== 'object' ||
      response === null ||
      !('page' in response) ||
      response.page !== page ||
      !('limit' in response) ||
      response.limit !== limit ||
      !('total' in response) ||
      typeof response.total !== 'number' ||
      !Number.isInteger(response.total) ||
      response.total < 0 ||
      !('items' in response) ||
      !Array.isArray(response.items) ||
      !response.items.every(isSireHistoryItem)
    ) {
      throw new SireApiError('El servidor devolvió un historial SIRE con un formato inválido.', null);
    }
    return {
      page,
      limit,
      total: response.total,
      items: response.items,
    };
  },

  /**
   * Encola la consulta de periodos en SUNAT.
   * El backend responde HTTP 202 con `{ messageId, status: "PENDING" }`; el
   * seguimiento del trabajo se hace con `getPeriodosStatus(messageId)`.
   *
   * Si la cola no pudo publicar el trabajo el backend responde el mismo 202 con
   * `status: "FAILED"` y un mensaje accionable: aquí se convierte en error para
   * que la pantalla muestre ese texto y no uno genérico.
   */
  async requestPeriodos(payload: SirePeriodosRequest): Promise<SirePeriodosAcceptedResponse> {
    const bookCode = payload.bookCode.trim();
    const solUser = payload.solUser.trim();
    const solPassword = payload.solPassword;

    if (!bookCode) throw new SireApiError('El código de libro es obligatorio.', 400);
    if (!solUser) throw new SireApiError('El usuario SOL es obligatorio.', 400);
    if (!solPassword.trim()) throw new SireApiError('La clave SOL es obligatoria.', 400);

    try {
      const response = await requestSireApi<unknown>(
        '/sire/periodos',
        {
          method: 'POST',
          body: JSON.stringify({ bookCode, solUser, solPassword }),
        },
        { timeoutMs: SIRE_PERIODOS_REQUEST_TIMEOUT_MS },
      );
      if (!isPeriodosAcceptedResponse(response)) {
        throw new SireApiError(
          'El servidor no confirmó el encolado de la consulta de periodos con un formato válido.',
          null,
        );
      }
      if (response.status === 'FAILED') {
        throw new SireApiError(
          response.message?.trim() ||
            response.error?.trim() ||
            'No se pudo encolar la consulta de periodos. Inténtalo nuevamente.',
          null,
        );
      }
      return { messageId: response.messageId, status: 'PENDING' };
    } catch (cause) {
      const status = cause instanceof SireApiError ? cause.status : null;
      const message = cause instanceof Error ? redactSireSecret(cause.message, solPassword) : '';
      throw new SireApiError(message || 'No se pudo encolar la consulta de periodos SIRE.', status);
    }
  },

  /** Consulta el avance del trabajo encolado en SUNAT. */
  async getPeriodosStatus(messageId: string): Promise<SirePeriodosStatus> {
    const id = messageId.trim();
    if (!id) throw new SireApiError('El identificador de la consulta SIRE es obligatorio.', 400);
    const response = await requestSireApi<unknown>(
      `/sire/periodos/status/${encodeURIComponent(id)}`,
      { method: 'GET' },
      { timeoutMs: SIRE_PERIODOS_STATUS_TIMEOUT_MS },
    );
    if (!isPeriodosStatusResponse(response)) {
      throw new SireApiError('El servidor devolvió un estado de consulta SIRE con un formato inválido.', null);
    }
    return mapPeriodosStatus(response);
  },

  async getProposal(period: string, bookType: SireBookType): Promise<SireProposalResponse> {
    assertValidPeriod(period);
    const response = await requestSireApi<unknown>('/sire/proposal', {
      method: 'POST',
      body: JSON.stringify({ period, bookType }),
    });
    if (!isProposalResponse(response)) {
      throw new SireApiError('El servidor devolvió propuestas SIRE con un formato inválido.', null);
    }
    return response;
  },

  async importProposal(
    period: string,
    bookType: SireBookType,
    file: File,
  ): Promise<ImportSireProposalResponse> {
    assertValidPeriod(period);
    assertAllowedProposalFile(file);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('period', period);
    formData.append('bookType', bookType);
    const response = await requestSireApi<unknown>('/sire/import', {
      method: 'POST',
      body: formData,
    });
    if (!isImportResponse(response)) {
      throw new SireApiError('El servidor devolvió un resultado de importación con formato inválido.', null);
    }
    return response;
  },

  async reconcile(payload: ReconcileRequest): Promise<ReconcileResponse> {
    assertValidPeriod(payload.period);
    if (!payload.comprobantes) {
      throw new SireApiError('No se encontraron comprobantes locales para conciliar.', 400);
    }
    if (!useAuthStore.getState().token) {
      throw new SireApiError('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 401);
    }
    const companyRuc = useAuthStore.getState().activeCompany?.ruc;
    if (!companyRuc) {
      throw new SireApiError('No se encontró el RUC de la empresa autenticada.', 400);
    }
    const rucFeedback = getRucFeedback(companyRuc);
    if (rucFeedback) throw new SireApiError(rucFeedback, 400);

    const response = await requestSireApi<unknown>('/sire/reconcile', {
      method: 'POST',
      body: JSON.stringify({
        period: payload.period,
        bookType: payload.bookType,
        localRecords: payload.comprobantes.map((item) => ({
          emitterRuc: companyRuc,
          documentType: item.tipoComprobante,
          series: item.serie,
          correlative: item.correlativo,
          taxableBase: item.baseImponible,
          igvAmount: item.igv,
          totalAmount: item.total,
        })),
      }),
    });
    if (!isBackendReconciliation(response)) {
      throw new SireApiError('El servidor devolvió una respuesta de conciliación con formato inválido.', null);
    }
    return mapReconciliation(response);
  },
};

const isSireHistoryItem = (value: unknown): value is SireHistoryResponse['items'][number] => {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  const totals = item.totalsByScenario;
  const scenarios: ReconcileScenario[] = [
    'COINCIDENCIA_EXACTA',
    'DIFERENCIA_MONTOS',
    'OMISION_LOCAL',
    'OMISION_SUNAT',
    'DUPLICADO_LLAVE',
  ];
  return (
    typeof item.id === 'string' &&
    typeof item.period === 'string' &&
    (item.bookType === 'RVIE' || item.bookType === 'RCE') &&
    (item.status === 'EN_REVISION' || item.status === 'CONCILIADO' || item.status === 'CERRADO') &&
    typeof item.createdAt === 'string' &&
    typeof item.complianceRate === 'number' &&
    Number.isFinite(item.complianceRate) &&
    typeof totals === 'object' &&
    totals !== null &&
    scenarios.every((scenario) => typeof (totals as Record<string, unknown>)[scenario] === 'number')
  );
};

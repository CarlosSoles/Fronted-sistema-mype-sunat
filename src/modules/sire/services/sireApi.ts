import { useAuthStore } from '@/stores/authStore';
import { getRucFeedback } from '../validators/sireSchema';
import {
  SIRE_MAPEO_TIPOS,
  type CloseSirePeriodResponse,
  type ReconcileRequest,
  type ReconcileResponse,
  type ReconcileScenario,
  type SireAsientoPreview,
  type SireConfiguracionPayload,
  type SireConfiguracionStatus,
  type SireHistoryResponse,
  type SireImportacionEstado,
  type SireImportacionRespuesta,
  type SireMapeoContable,
  type SireMapeoTipoOperacion,
  type SirePeriodosAcceptedResponse,
  type SirePeriodosRequest,
  type SirePeriodosStatus,
  type SireBookType,
  type SireProposalResponse,
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
  isConfiguracionStatusResponse,
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
  /**
   * Estado de la configuración SIRE de la empresa.
   *
   * El backend solo devuelve `{ configured: boolean }`: nunca las credenciales
   * ni parte de ellas, por eso la pantalla puede mostrar "Ya configurado"
   * sin exponer ningún secreto.
   */
  async getConfiguracionStatus(companyId?: string): Promise<SireConfiguracionStatus> {
    const query = companyId
      ? `?companyId=${encodeURIComponent(companyId)}`
      : '';
    const response = await requestSireApi<unknown>(
      `/sire/configuracion/status${query}`,
      { method: 'GET' },
    );
    if (!isConfiguracionStatusResponse(response)) {
      throw new SireApiError(
        'El servidor devolvió el estado de la configuración SIRE con un formato inválido.',
        null,
      );
    }
    return { configured: response.configured };
  },

  /**
   * Guarda (o actualiza) las credenciales SIRE de la empresa.
   *
   * Los campos que no se envían se conservan tal como estaban en el backend,
   * así que se puede enviar solo lo que cambió. El RUC nunca se envía: la
   * empresa sale de la sesión.
   */
  async saveConfiguracion(
    payload: SireConfiguracionPayload,
    companyId?: string,
  ): Promise<SireConfiguracionStatus> {
    const body: Record<string, string> = {};
    if (companyId) body.companyId = companyId;
    if (payload.clientId !== undefined) body.clientId = payload.clientId;
    if (payload.clientSecret !== undefined) body.clientSecret = payload.clientSecret;
    if (payload.solUser !== undefined) body.solUser = payload.solUser;
    if (payload.solPassword !== undefined) body.solPassword = payload.solPassword;

    if (!payload.clientId && !payload.clientSecret && !payload.solUser && !payload.solPassword) {
      throw new SireApiError('No se recibió ninguna credencial SIRE para guardar.', 400);
    }

    try {
      const response = await requestSireApi<unknown>('/sire/configuracion', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      // El backend devuelve 200/201 con { success, message, configured, companyId }.
      // Nunca se registra el payload enviado para no exponer secretos.
      console.log('[SIRE] Respuesta al guardar credenciales:', response);

      if (isConfiguracionStatusResponse(response)) {
        return {
          configured: response.configured,
          message: response.message,
        };
      }

      // Compatibilidad con respuestas 200/201 que solo confirman éxito.
      if (typeof response === 'object' && response !== null) {
        const record = response as Record<string, unknown>;
        if (record.success === true || record.configured === undefined) {
          return {
            configured: typeof record.configured === 'boolean' ? record.configured : true,
            message: typeof record.message === 'string' ? record.message : undefined,
          };
        }
      }

      throw new SireApiError(
        'El servidor devolvió el resultado de la configuración SIRE con un formato inválido.',
        null,
      );
    } catch (cause) {
      const status = cause instanceof SireApiError ? cause.status : null;
      const message = cause instanceof Error ? cause.message : '';
      const redacted = redactSireSecret(
        redactSireSecret(message, payload.clientSecret ?? ''),
        payload.solPassword ?? '',
      );
      throw new SireApiError(
        redacted || 'No se pudo guardar la configuración SIRE de la empresa.',
        status,
      );
    }
  },

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
   * Las credenciales SOL ya no se envían: el backend las resuelve desde la
   * configuración SIRE de la empresa (`POST /sire/configuracion`), por eso el
   * cuerpo solo lleva el libro consultado.
   *
   * Si la cola no pudo publicar el trabajo el backend responde el mismo 202 con
   * `status: "FAILED"` y un mensaje accionable: aquí se convierte en error para
   * que la pantalla muestre ese texto y no uno genérico.
   */
  async requestPeriodos(payload: SirePeriodosRequest): Promise<SirePeriodosAcceptedResponse> {
    const bookCode = payload.bookCode?.trim() ?? '';

    if (!bookCode) throw new SireApiError('El código de libro es obligatorio.', 400);

    try {
      const response = await requestSireApi<unknown>(
        '/sire/periodos',
        {
          method: 'POST',
          body: JSON.stringify({ bookCode }),
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
      const message = cause instanceof Error ? cause.message : '';
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
  ): Promise<SireImportacionRespuesta> {
    assertValidPeriod(period);
    assertAllowedProposalFile(file);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('periodo', period);
    formData.append('libro', bookType);
    const response = await requestSireApi<unknown>('/sire/importar', {
      method: 'POST',
      body: formData,
    });
    if (!isImportacionResponse(response)) {
      throw new SireApiError('El servidor devolvió un resultado de importación con formato inválido.', null);
    }
    return response;
  },

  /** Estado del trabajo asíncrono de importación. */
  async getImportacionEstado(messageId: string): Promise<SireImportacionEstado> {
    const response = await requestSireApi<unknown>(
      `/sire/importar/estado/${encodeURIComponent(messageId)}`,
      { method: 'GET' },
    );
    if (!isImportacionEstado(response)) {
      throw new SireApiError(
        'El servidor devolvió el estado de importación con formato inválido.',
        null,
      );
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

  /**
   * Previsualiza los asientos contables que el backend generaría para un periodo.
   *
   * Es una consulta de solo lectura: no contabiliza ni crea asientos. El
   * backend puede devolver la lista en la raíz o dentro de `asientos`, `items`
   * o `data`; la pantalla tolera ambas formas.
   */
  async getAsientosPreview(period: string): Promise<SireAsientoPreview[]> {
    assertValidPeriod(period);
    const query = new URLSearchParams({ periodo: period });
    const response = await requestSireApi<unknown>(`/sire/asientos-preview?${query}`, {
      method: 'GET',
    });
    return extractAsientoItems(response)
      .map(mapAsientoPreview)
      .filter((item): item is SireAsientoPreview => item !== null);
  },

  /** Carga los mapeos contables guardados para la empresa de la sesión. */
  async getMapeoContable(companyId?: string): Promise<SireMapeoContable[]> {
    const query = companyId
      ? `?companyId=${encodeURIComponent(companyId)}`
      : '';
    const response = await requestSireApi<unknown>(
      `/sire/mapeo-contable${query}`,
      { method: 'GET' },
    );
    return extractMapeoItems(response)
      .map(mapMapeoContable)
      .filter((item): item is SireMapeoContable => item !== null);
  },

  /**
   * Reemplaza el mapeo contable de la empresa.
   *
   * El backend recibe un arreglo con las cuatro operaciones y guarda la última
   * versión enviada.
   */
  async saveMapeoContable(
    mapeos: SireMapeoContable[],
    companyId?: string,
  ): Promise<void> {
    const normalized = mapeos.map((item) => ({
      tipoOperacion: item.tipoOperacion,
      cuentaContable: item.cuentaContable.trim(),
    }));
    if (normalized.some((item) => !item.cuentaContable)) {
      throw new SireApiError('Completa la cuenta contable de todas las operaciones.', 400);
    }
    const body = companyId
      ? { companyId, mappings: normalized }
      : normalized;
    await requestSireApi<unknown>('/sire/mapeo-contable', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

const extractAsientoItems = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'object' || value === null) return [];
  const record = value as Record<string, unknown>;
  for (const key of ['asientos', 'preview', 'previews', 'items', 'detalles', 'data']) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
    if (typeof candidate === 'object' && candidate !== null) {
      const nested = extractAsientoItems(candidate);
      if (nested.length > 0) return nested;
    }
  }
  return [];
};

const toAsientoAmount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const amount = Number(value.replace(/\s/g, '').replace(/,/g, ''));
    if (Number.isFinite(amount)) return amount;
  }
  return 0;
};

const mapAsientoPreview = (value: unknown): SireAsientoPreview | null => {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;
  const cuenta =
    item.cuentaContable ??
    item.cuenta_contable ??
    item.cuenta ??
    item.accountCode ??
    item.account ??
    item.codigoCuenta ??
    item.codigo_cuenta;
  if (typeof cuenta !== 'string' || !cuenta.trim()) return null;
  const descripcion = item.descripcion ?? item.description ?? item.glosa ?? item.detalle;
  return {
    cuentaContable: cuenta.trim(),
    debe: toAsientoAmount(item.debe ?? item.debit ?? item.debeSoles ?? item.debe_soles),
    haber: toAsientoAmount(item.haber ?? item.credit ?? item.haberSoles ?? item.haber_soles),
    descripcion: typeof descripcion === 'string' ? descripcion.trim() : '',
  };
};

const extractMapeoItems = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    for (const key of ['mapeos', 'mappings', 'items', 'data']) {
      if (Array.isArray(record[key])) return record[key];
    }
  }
  return [];
};

const toMapeoTipoOperacion = (value: unknown): SireMapeoTipoOperacion | null => {
  if (typeof value !== 'string') return null;
  const tipo = value.trim().toUpperCase();
  return (SIRE_MAPEO_TIPOS as readonly string[]).includes(tipo)
    ? (tipo as SireMapeoTipoOperacion)
    : null;
};

const mapMapeoContable = (value: unknown): SireMapeoContable | null => {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;
  const tipo = toMapeoTipoOperacion(
    item.tipoOperacion ?? item.tipo_operacion ?? item.tipo ?? item.operationType ?? item.type,
  );
  const cuenta = item.cuentaContable ?? item.cuenta_contable ?? item.cuenta ?? item.accountCode ?? item.account;
  if (!tipo || typeof cuenta !== 'string') return null;
  return { tipoOperacion: tipo, cuentaContable: cuenta.trim() };
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

const isImportacionResponse = (value: unknown): value is SireImportacionRespuesta => {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.messageId === 'string' &&
    typeof item.importacionId === 'string' &&
    typeof item.periodo === 'string' &&
    (item.libro === 'RVIE_VENTAS' || item.libro === 'RCE_COMPRAS') &&
    typeof item.nombreArchivo === 'string' &&
    typeof item.estado === 'string' &&
    typeof item.createdAt === 'string'
  );
};

const isImportacionEstado = (value: unknown): value is SireImportacionEstado => {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.messageId === 'string' &&
    typeof item.estado === 'string' &&
    typeof item.periodo === 'string' &&
    (item.libro === 'RVIE_VENTAS' || item.libro === 'RCE_COMPRAS')
  );
};

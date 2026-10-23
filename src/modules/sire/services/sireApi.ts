import { ENV } from '@/config/env.config';
import { useAuthStore } from '@/stores/authStore';
import type {
  CloseSirePeriodResponse,
  ImportSireProposalRequest,
  ImportSireProposalResponse,
  ReconcileScenario,
  ReconcileRequest,
  ReconcileResponse,
  SireHistoryResponse,
  TipoComprobante,
} from '../types/sire.types';

export class SireApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'SireApiError';
    this.status = status;
  }
}

const getBackendMessage = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null) return undefined;
  const response = body as { message?: unknown; detail?: unknown };
  const formatItem = (item: unknown): string => {
    if (typeof item === 'string') return item;
    if (typeof item !== 'object' || item === null) return '';
    const validation = item as {
      field?: unknown;
      message?: unknown;
      rule?: unknown;
    };
    if (typeof validation.message === 'string') return validation.message;
    if (typeof validation.field === 'string') {
      const fields: Record<string, string> = {
        period: 'período',
        ruc: 'RUC',
        comprobantes: 'comprobantes',
        tipoComprobante: 'tipo de comprobante',
        baseImponible: 'base imponible',
        igv: 'IGV',
        total: 'total',
      };
      const field = fields[validation.field] ?? validation.field;
      return `${field}: ${typeof validation.rule === 'string' ? validation.rule : 'dato inválido'}`;
    }
    return '';
  };

  if (typeof response.message === 'string') return response.message;
  if (Array.isArray(response.message)) {
    const messages = response.message.map(formatItem).filter(Boolean);
    if (messages.length) return messages.join(' • ');
  }
  if (typeof response.message === 'object' && response.message !== null) {
    const message = formatItem(response.message);
    if (message) return message;
  }
  if (typeof response.detail === 'string') return response.detail;
  return undefined;
};

const getImportStatusMessage = (status: number, detail?: string): string => {
  const messages: Record<number, string> = {
    400: 'No se pudo importar la propuesta. Revisa el periodo, el libro y el formato del archivo.',
    401: 'Tu sesión venció o no es válida. Inicia sesión nuevamente.',
    403: 'No tienes permisos para importar propuestas SIRE.',
    404: 'El backend no encontró la ruta de importación SIRE. Verifica que esté desplegada la versión correcta del API.',
    409: 'El periodo fiscal está cerrado y no admite nuevas importaciones.',
    413: 'El archivo supera el límite de 5 MiB.',
    500: 'Ocurrió un error en el servidor al importar la propuesta. Inténtalo nuevamente.',
    502: 'El servidor del frontend no pudo comunicarse con el backend. Verifica que esté iniciado y accesible.',
    503: 'El backend no está disponible en este momento. Verifica que esté iniciado e inténtalo nuevamente.',
  };
  const message = messages[status] ?? 'No se pudo importar la propuesta SIRE.';
  return detail ? `${message} ${detail}` : message;
};

const getSireStatusMessage = (status: number, detail?: string): string => {
  const messages: Record<number, string> = {
    400: 'Los datos enviados no son válidos. Revisa el periodo y la información del libro.',
    401: 'Tu sesión venció o no es válida. Inicia sesión nuevamente.',
    403: 'No tienes permisos para realizar esta operación SIRE.',
    404: 'No se encontró la conciliación del periodo y libro indicados.',
    409: 'El periodo ya está cerrado y no admite cambios.',
    500: 'Ocurrió un error en el servidor al procesar la operación SIRE.',
  };
  const message = messages[status] ?? 'No se pudo completar la operación SIRE.';
  return detail ? `${message} ${detail}` : message;
};

interface BackendReconciliation {
  period: string;
  bookType: 'RVIE_VENTAS' | 'RCE_COMPRAS';
  totalLocalRecords: number;
  totalSireRecords: number;
  exactMatchesCount: number;
  discrepanciesCount: number;
  complianceRate: number;
  discrepancies: {
    discrepancyType: ReconcileScenario;
    emitterRuc: string;
    documentType: string;
    series: string;
    correlative: string;
    localTotalAmount?: number | null;
    sireTotalAmount?: number | null;
    amountDifference: number;
    taxableBaseDifference?: number | null;
    igvDifference?: number | null;
    duplicateSource?: 'LOCAL' | 'SIRE' | 'AMBOS' | null;
  }[];
}

const toTipoComprobante = (documentType: string): TipoComprobante => {
  if (documentType === '01' || documentType === '03' || documentType === '07' || documentType === '08') {
    return documentType;
  }
  throw new SireApiError('El servidor devolvió un tipo de comprobante desconocido.', null);
};

const mapReconciliation = (response: BackendReconciliation): ReconcileResponse => {
  const countByScenario = (scenario: ReconcileScenario) =>
    response.discrepancies.filter((item) => item.discrepancyType === scenario).length;

  return {
    period: response.period,
    bookType: response.bookType,
    summary: {
      total: Math.max(response.totalLocalRecords, response.totalSireRecords),
      coincidenciaExacta: response.exactMatchesCount,
      diferenciaMontos: countByScenario('DIFERENCIA_MONTOS'),
      omisionLocal: countByScenario('OMISION_LOCAL'),
      omisionSunat: countByScenario('OMISION_SUNAT'),
      duplicadoLlave: countByScenario('DUPLICADO_LLAVE'),
      porcentajeCumplimiento: response.complianceRate,
    },
    results: response.discrepancies.map((item) => ({
      llave: `${item.emitterRuc}-${item.documentType}-${item.series}-${item.correlative}`,
      tipoComprobante: toTipoComprobante(item.documentType),
      serie: item.series,
      correlativo: item.correlative,
      totalLocal: item.localTotalAmount ?? undefined,
      totalSire: item.sireTotalAmount ?? undefined,
      diferenciaTotal: item.amountDifference,
      diferenciaBase: item.taxableBaseDifference ?? 0,
      diferenciaIgv: item.igvDifference ?? 0,
      escenario: item.discrepancyType,
      duplicateSource: item.duplicateSource,
    })),
  };
};

const authenticatedHeaders = (token: string, json = false): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});

const readResponse = async <T>(response: Response, message: (status: number, detail?: string) => string): Promise<T> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      if (response.ok) {
        throw new SireApiError('El servidor devolvió una respuesta con formato inválido.', response.status);
      }
    } else {
      throw error;
    }
  }
  if (!response.ok) {
    throw new SireApiError(message(response.status, getBackendMessage(body)), response.status);
  }
  return body as T;
};

export const sireApi = {
  async importProposal(payload: ImportSireProposalRequest, file: File): Promise<ImportSireProposalResponse> {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new SireApiError('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 401);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('period', payload.period);
    formData.append('bookType', payload.bookType);

    let response: Response;
    try {
      response = await fetch(`${ENV.VITE_API_URL}/sire/import`, {
        method: 'POST',
        headers: authenticatedHeaders(token),
        body: formData,
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new SireApiError(
          'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.',
          null,
        );
      }
      throw error;
    }

    return readResponse<ImportSireProposalResponse>(response, getImportStatusMessage);
  },

  async reconcile(payload: ReconcileRequest): Promise<ReconcileResponse> {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new SireApiError('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 401);
    }

    let response: Response;
    try {
      response = await fetch(`${ENV.VITE_API_URL}/sire/reconcile`, {
        method: 'POST',
        headers: authenticatedHeaders(token, true),
        body: JSON.stringify({
          period: payload.period,
          bookType: payload.bookType,
          localRecords: payload.comprobantes.map((item) => ({
            emitterRuc: payload.ruc,
            documentType: item.tipoComprobante,
            series: item.serie,
            correlative: item.correlativo,
            taxableBase: item.baseImponible,
            igvAmount: item.igv,
            totalAmount: item.total,
          })),
        }),
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new SireApiError(
          'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.',
          null,
        );
      }
      throw error;
    }

    const body = await readResponse<BackendReconciliation>(response, getSireStatusMessage);
    return mapReconciliation(body);
  },

  async closePeriod(period: string, bookType: 'RVIE_VENTAS' | 'RCE_COMPRAS'): Promise<CloseSirePeriodResponse> {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new SireApiError('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 401);
    }
    let response: Response;
    try {
      response = await fetch(`${ENV.VITE_API_URL}/sire/close`, {
        method: 'POST',
        headers: authenticatedHeaders(token, true),
        body: JSON.stringify({ period, bookType }),
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new SireApiError('No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.', null);
      }
      throw error;
    }
    return readResponse<CloseSirePeriodResponse>(response, getSireStatusMessage);
  },

  async getHistory(page = 1, limit = 20): Promise<SireHistoryResponse> {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new SireApiError('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 401);
    }
    let response: Response;
    try {
      response = await fetch(`${ENV.VITE_API_URL}/sire/history?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: authenticatedHeaders(token),
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new SireApiError('No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.', null);
      }
      throw error;
    }
    return readResponse<SireHistoryResponse>(response, getSireStatusMessage);
  },
};

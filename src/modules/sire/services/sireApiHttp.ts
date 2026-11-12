import { API_BASE_URL } from '@/config/env.config';
import { useAuthStore } from '@/stores/authStore';

export class SireApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'SireApiError';
    this.status = status;
  }
}

export const redactSireSecret = (value: string, secret: string): string =>
  secret ? value.split(secret).join('[oculto]') : value;

const getBackendMessage = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null) return undefined;
  const response = body as { message?: unknown; detail?: unknown; error?: unknown };
  if (typeof response.message === 'string') return response.message;
  if (Array.isArray(response.message)) {
    const fields: Record<string, string> = {
      period: 'período',
      bookType: 'libro',
      localRecords: 'comprobantes locales',
      emitterRuc: 'RUC emisor',
      documentType: 'tipo de comprobante',
      taxableBase: 'base imponible',
      igvAmount: 'IGV',
      totalAmount: 'total',
    };
    const messages = response.message.map((item) => {
      if (typeof item === 'string') return item;
      if (typeof item !== 'object' || item === null) return '';
      const validation = item as { field?: unknown; message?: unknown; rule?: unknown };
      if (typeof validation.message === 'string') return validation.message;
      if (typeof validation.field !== 'string') return '';
      const field = fields[validation.field] ?? validation.field;
      const rule = typeof validation.rule === 'string' ? validation.rule : 'dato inválido';
      return `${field}: ${rule}`;
    }).filter(Boolean);
    if (messages.length) return messages.join(' • ');
  }
  if (typeof response.message === 'object' && response.message !== null) {
    const nestedMessage = response.message as { message?: unknown };
    if (typeof nestedMessage.message === 'string') return nestedMessage.message;
  }
  if (typeof response.detail === 'string') return response.detail;
  if (typeof response.error === 'string') return response.error;
  if (typeof response.error === 'object' && response.error !== null) {
    const nestedError = response.error as { message?: unknown };
    if (typeof nestedError.message === 'string') return nestedError.message;
  }
  return undefined;
};

const getStatusMessage = (status: number, detail?: string): string => {
  const messages: Record<number, string> = {
    400: 'Los datos enviados no son válidos. Revisa el periodo y la información del libro.',
    401: 'Tu sesión venció o no es válida. Inicia sesión nuevamente.',
    403: 'No tienes permisos para realizar esta operación SIRE.',
    404: 'No se encontró el recurso o periodo SIRE solicitado.',
    409: 'Conflicto al procesar la propuesta SIRE (HTTP 409).',
    422: 'El backend rechazó la operación por una regla de negocio.',
    500: 'Ocurrió un error en el servidor al procesar la operación SIRE.',
    503: 'Módulo en modo mantenimiento. Contacte a sistemas.',
  };
  const message = messages[status] ?? 'No se pudo completar la operación SIRE.';
  return detail ? `${message} ${detail}` : message;
};

export const assertValidPeriod = (period: string) => {
  if (!/^(?!0000)\d{4}(0[1-9]|1[0-2])$/.test(period)) {
    throw new SireApiError('Ingresa un periodo válido con formato YYYYMM.', 400);
  }
};

export const assertAllowedProposalFile = (file: File) => {
  if (!/\.txt$/i.test(file.name) || file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new SireApiError('Selecciona un archivo TXT no vacío de máximo 5 MiB.', 400);
  }
};

const authenticatedHeaders = (token: string, json = false): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});

const readResponse = async <T>(response: Response): Promise<T> => {
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
    if (response.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/login?reason=session-expired');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
    throw new SireApiError(
      getStatusMessage(response.status, getBackendMessage(body)),
      response.status,
    );
  }
  return body as T;
};

export interface SireApiRequestOptions {
  /**
   * Tope de espera de la respuesta. Sin tope, una petición colgada deja la
   * pantalla en estado "cargando" para siempre.
   */
  timeoutMs?: number;
}

/**
 * Ejecuta la petición con un tope de espera.
 *
 * `AbortSignal.timeout` cancela la petición cuando el servidor no responde: sin
 * esto el `fetch` puede quedarse colgado indefinidamente y la UI quedaría
 * bloqueada en "Consultando…" sin salida.
 */
export const requestSireApi = async <T>(
  path: string,
  init: RequestInit,
  options: SireApiRequestOptions = {},
): Promise<T> => {
  const token = useAuthStore.getState().token;
  if (!token) throw new SireApiError('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 401);
  const timeoutMs = options.timeoutMs;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
      headers: {
        ...authenticatedHeaders(token, Boolean(init.body) && !(init.body instanceof FormData)),
        ...init.headers,
      },
    });
    return await readResponse<T>(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new SireApiError(
        'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.',
        null,
      );
    }
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new SireApiError(
        'El servidor tardó demasiado en responder. Inténtalo nuevamente.',
        null,
      );
    }
    throw error;
  }
};

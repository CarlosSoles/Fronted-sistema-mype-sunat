import { ENV } from '@/config/env.config';
import { useAuthStore } from '@/stores/authStore';
import type { ReconcileRequest, ReconcileResponse } from '../types/sire.types';

export class SireApiError extends Error {
  readonly status: number | null;

  constructor(
    message: string,
    status: number | null,
  ) {
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
    const validation = item as { field?: unknown; message?: unknown; rule?: unknown };
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

const getStatusMessage = (status: number, detail?: string): string => {
  const messages: Record<number, string> = {
    400: 'Los datos enviados no son válidos. Revisa el período, el RUC y los comprobantes.',
    401: 'Tu sesión venció o no es válida. Inicia sesión nuevamente.',
    403: 'No tienes permisos para realizar la conciliación SIRE.',
    500: 'Ocurrió un error en el servidor al procesar la conciliación. Inténtalo nuevamente.',
  };
  const message = messages[status] ?? 'No se pudo completar la conciliación SIRE.';
  return detail ? `${message} ${detail}` : message;
};

export const sireApi = {
  async reconcile(payload: ReconcileRequest): Promise<ReconcileResponse> {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new SireApiError('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 401);
    }

    let response: Response;
    try {
      response = await fetch(`${ENV.VITE_API_URL}/sire/reconcile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
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
      if (error instanceof SyntaxError) {
        if (response.ok) {
          throw new SireApiError('El servidor devolvió una respuesta con formato inválido.', response.status);
        }
        body = undefined;
      } else {
        throw error;
      }
    }

    if (!response.ok) {
      throw new SireApiError(
        getStatusMessage(response.status, getBackendMessage(body)),
        response.status,
      );
    }

    return body as ReconcileResponse;
  },
};

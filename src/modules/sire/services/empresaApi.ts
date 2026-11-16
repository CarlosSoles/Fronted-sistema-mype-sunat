import type { EmpresaConfiguracionPayload, EmpresaRucValidacion } from '../types/sire.types';
import { requestSireApi, SireApiError } from './sireApiHttp';

/**
 * Normaliza las series escritas por el usuario como "F001, B001".
 *
 * Se recortan los espacios, se pasan a mayúsculas y se eliminan los duplicados
 * y las entradas vacías para no guardar series repetidas en el backend.
 */
export const normalizeSeries = (series: string[]): string[] => {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const value of series) {
    const serie = value.trim().toUpperCase();
    if (!serie || seen.has(serie)) continue;
    seen.add(serie);
    normalized.push(serie);
  }
  return normalized;
};

export const empresaApi = {
  /**
   * Valida un RUC contra la API de Decolecta (`GET /empresa/validar-ruc/:ruc`).
   *
   * Devuelve la razón social para autocompletar el nombre de la empresa. Si el
   * RUC no existe o el servicio lo rechaza, el error se deja tal cual para que
   * la pantalla muestre un mensaje amigable.
   */
  async validateRuc(ruc: string): Promise<EmpresaRucValidacion> {
    const value = ruc.trim();
    if (!/^\d{11}$/.test(value)) {
      throw new SireApiError('RUC no válido o no encontrado.', 400);
    }

    try {
      const response = await requestSireApi<unknown>(
        `/empresa/validar-ruc/${encodeURIComponent(value)}`,
        { method: 'GET' },
      );
      const razonSocial = extractRazonSocial(response);
      if (!razonSocial) {
        throw new SireApiError('El servidor no devolvió la razón social del RUC.', null);
      }
      return { ruc: value, razonSocial };
    } catch (cause) {
      if (cause instanceof SireApiError) throw cause;
      const message = cause instanceof Error ? cause.message : '';
      throw new SireApiError(message || 'RUC no válido o no encontrado.', null);
    }
  },

  /**
   * Guarda los datos globales de la empresa (`PUT /empresa/configuracion`).
   *
   * La empresa se identifica por la sesión autenticada; el RUC solo se envía
   * como confirmación de la empresa activa. El resto de campos se omite si
   * quedó vacío para no borrar datos ya configurados en el backend.
   */
  async saveConfiguracion(payload: EmpresaConfiguracionPayload): Promise<void> {
    const body: Record<string, unknown> = {
      series: normalizeSeries(payload.series),
    };
    const ruc = payload.ruc?.trim();
    if (ruc) body.ruc = ruc;
    const razonSocial = payload.razonSocial?.trim();
    if (razonSocial) body.razonSocial = razonSocial;

    try {
      await requestSireApi<unknown>('/empresa/configuracion', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    } catch (cause) {
      const status = cause instanceof SireApiError ? cause.status : null;
      const message = cause instanceof Error ? cause.message : '';
      throw new SireApiError(
        message || 'No se pudieron guardar los datos de la empresa.',
        status,
      );
    }
  },
};

const RAZON_SOCIAL_KEYS = [
  'razonSocial',
  'razon_social',
  'nombreORazonSocial',
  'nombre_o_razon_social',
  'nombre',
  'businessName',
  'companyName',
];

/**
 * Extrae la razón social de la respuesta de Decolecta.
 *
 * El backend puede devolver los datos en la raíz o anidados (`data`,
 * `contribuyente`, `result`), y Decolecta usa `nombre_o_razon_social`. Se
 * aceptan ambas convenciones para no depender de un único contrato.
 */
const extractRazonSocial = (value: unknown, depth = 0): string | null => {
  if (depth > 3 || typeof value !== 'object' || value === null) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const razonSocial = extractRazonSocial(item, depth + 1);
      if (razonSocial) return razonSocial;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of RAZON_SOCIAL_KEYS) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  for (const key of ['data', 'contribuyente', 'result', 'empresa']) {
    if (key in record) {
      const razonSocial = extractRazonSocial(record[key], depth + 1);
      if (razonSocial) return razonSocial;
    }
  }
  return null;
};

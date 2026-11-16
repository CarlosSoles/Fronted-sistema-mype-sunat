import type { EmpresaConfiguracionPayload } from '../types/sire.types';
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

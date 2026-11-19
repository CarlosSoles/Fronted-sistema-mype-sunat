import type {
  EmpresaConfiguracionActual,
  EmpresaConfiguracionPayload,
  EmpresaRucValidacion,
} from '../types/sire.types';
import { requestSireApi, SireApiError } from './sireApiHttp';

const NESTED_DATA_KEYS = [
  'data',
  'datos',
  'contribuyente',
  'result',
  'empresa',
  'company',
  'contributor',
  'payload',
];

const EMPRESA_FIELD_KEYS = {
  razonSocial: [
    'razonSocial',
    'razon_social',
    'nombreORazonSocial',
    'nombre_o_razon_social',
    'businessName',
    'companyName',
    'nombre',
  ],
  nombreComercial: [
    'nombreComercial',
    'nombre_comercial',
    'comercial',
    'nombreDeFantasia',
    'nombre_de_fantasia',
    'tradeName',
    'fantasyName',
  ],
  direccion: [
    'direccion',
    'direccionFiscal',
    'direccion_fiscal',
    'direccionCompleta',
    'direccion_completa',
    'domicilioFiscal',
    'domicilio_fiscal',
    'domicilio',
    'address',
    'fiscalAddress',
  ],
  estado: [
    'estado',
    'estadoContribuyente',
    'estado_contribuyente',
    'estadoDelContribuyente',
    'estado_del_contribuyente',
    'estadoRuc',
    'estado_ruc',
    'status',
  ],
  condicion: [
    'condicion',
    'condicionDomicilio',
    'condicion_domicilio',
    'condicionDeDomicilio',
    'condicion_de_domicilio',
    'condicionContribuyente',
    'condicion_contribuyente',
    'condition',
    'domicileCondition',
  ],
} as const;

const SERIES_KEYS = [
  'series',
  'seriesList',
  'series_list',
  'seriesAutorizadas',
  'series_autorizadas',
] as const;

type EmpresaField = keyof typeof EMPRESA_FIELD_KEYS;

const collectRecords = (
  value: unknown,
  depth = 0,
  records: Record<string, unknown>[] = [],
): Record<string, unknown>[] => {
  if (depth > 4 || typeof value !== 'object' || value === null) return records;

  if (Array.isArray(value)) {
    for (const item of value) collectRecords(item, depth + 1, records);
    return records;
  }

  const record = value as Record<string, unknown>;
  records.push(record);
  for (const key of NESTED_DATA_KEYS) {
    if (key in record) collectRecords(record[key], depth + 1, records);
  }
  return records;
};

const extractField = (
  records: Record<string, unknown>[],
  field: EmpresaField,
): string | undefined => {
  for (const record of records) {
    for (const key of EMPRESA_FIELD_KEYS[field]) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
  }
  return undefined;
};

/**
 * Normaliza las series escritas por el usuario como "F001, B001".
 *
 * Se recortan los espacios, se pasan a mayúsculas y se eliminan los duplicados
 * y las entradas vacías para no guardar series repetidas en el backend.
 */
export const normalizeSeries = (series: readonly string[]): string[] => {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const value of series) {
    for (const part of value.split(',')) {
      const serie = part.trim().toUpperCase();
      if (!serie || seen.has(serie)) continue;
      seen.add(serie);
      normalized.push(serie);
    }
  }
  return normalized;
};

const normalizeSeriesValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return normalizeSeries(
      value.flatMap((item) => {
        if (typeof item === 'string' || typeof item === 'number') return String(item);
        if (typeof item !== 'object' || item === null) return [];
        const record = item as Record<string, unknown>;
        const candidate = record.series ?? record.serie ?? record.value ?? record.name;
        return typeof candidate === 'string' || typeof candidate === 'number'
          ? String(candidate)
          : [];
      }),
    );
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return normalizeSeries([String(value)]);
  }
  return [];
};

const extractSeries = (records: Record<string, unknown>[]): string[] | undefined => {
  for (const record of records) {
    for (const key of SERIES_KEYS) {
      if (!(key in record)) continue;
      const series = normalizeSeriesValue(record[key]);
      if (series.length) return series;
    }
  }
  return undefined;
};

const extractEmpresaData = (
  value: unknown,
): Pick<
  EmpresaRucValidacion,
  'razonSocial' | 'nombreComercial' | 'direccion' | 'estado' | 'condicion' | 'series'
> | null => {
  const records = collectRecords(value);
  const razonSocial = extractField(records, 'razonSocial');
  const nombreComercial = extractField(records, 'nombreComercial');
  if (!razonSocial && !nombreComercial) return null;

  return {
    razonSocial: razonSocial ?? nombreComercial ?? '',
    nombreComercial,
    direccion: extractField(records, 'direccion'),
    estado: extractField(records, 'estado'),
    condicion: extractField(records, 'condicion'),
    series: extractSeries(records),
  };
};

export const empresaApi = {
  /**
   * Valida un RUC contra la API de Decolecta (`GET /empresa/validar-ruc/:ruc`).
   *
   * Devuelve los datos del contribuyente para autocompletar la configuración de
   * la empresa. Si el RUC no existe o el servicio lo rechaza, el error se deja
   * tal cual para que la pantalla muestre un mensaje amigable.
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
      const data = extractEmpresaData(response);
      if (!data) {
        throw new SireApiError('El servidor no devolvió los datos del RUC.', null);
      }
      return { ruc: value, ...data };
    } catch (cause) {
      if (cause instanceof SireApiError) throw cause;
      const message = cause instanceof Error ? cause.message : '';
      throw new SireApiError(message || 'RUC no válido o no encontrado.', null);
    }
  },

  /**
   * Datos actuales de la empresa (`GET /empresa/configuracion`).
   *
   * El backend devuelve `businessName`/`tradeName`; la UI trabaja con
   * `razonSocial`/`nombreComercial`, así que aquí se normaliza la respuesta.
   */
  async getConfiguracion(): Promise<EmpresaConfiguracionActual> {
    try {
      const response = await requestSireApi<Record<string, unknown>>(
        '/empresa/configuracion',
        { method: 'GET' },
      );
      const text = (value: unknown): string => (typeof value === 'string' ? value : '');
      const series = Array.isArray(response.series)
        ? response.series.filter((value): value is string => typeof value === 'string')
        : [];

      return {
        ruc: text(response.ruc),
        razonSocial: text(response.businessName),
        nombreComercial: text(response.tradeName),
        direccion: text(response.direccion),
        estado: text(response.estado),
        condicion: text(response.condicion),
        series,
      };
    } catch (cause) {
      const status = cause instanceof SireApiError ? cause.status : null;
      const message = cause instanceof Error ? cause.message : '';
      throw new SireApiError(
        message || 'No se pudieron cargar los datos de la empresa.',
        status,
      );
    }
  },

  /**
   * Guarda los datos globales de la empresa (`PUT /empresa/configuracion`).
   *
   * El backend identifica la empresa por la sesión autenticada: el RUC no se
   * envía. Los nombres de la UI se traducen al contrato del backend
   * (`businessName`/`tradeName`) y los campos vacíos se omiten para no borrar
   * datos ya configurados.
   */
  async saveConfiguracion(payload: EmpresaConfiguracionPayload): Promise<void> {
    const body: Record<string, unknown> = {
      series: normalizeSeries(payload.series ?? []),
    };
    const addField = (key: string, value: string | undefined) => {
      const trimmed = value?.trim();
      if (trimmed) body[key] = trimmed;
    };

    addField('businessName', payload.razonSocial);
    addField('tradeName', payload.nombreComercial);
    addField('direccion', payload.direccion);
    addField('estado', payload.estado);
    addField('condicion', payload.condicion);

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

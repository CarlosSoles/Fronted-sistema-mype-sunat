import { SireApiError } from './sireApiHttp';
import type {
  DuplicateSource,
  ImportSireProposalResponse,
  ReconcileResponse,
  ReconcileScenario,
  SireBookType,
  SireConfiguracionStatus,
  SirePeriodo,
  SirePeriodosAcceptedResponse,
  SirePeriodosStatus,
  SirePeriodosStatusResponse,
  SireProposalDto,
  SireProposalResponse,
  TipoComprobante,
} from '../types/sire.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || isString(value);

/**
 * Periodo de SUNAT ya normalizado. El payload crudo del backend es el que
 * devolvió SUNAT y puede venir como arreglo plano, como objeto con una lista
 * interna o con nombres de campo en español; por eso se normaliza en un solo
 * punto en lugar de asumir una forma fija.
 */
const PERIOD_CODE_KEYS = [
  'period',
  'periodo',
  'codigoPeriodo',
  'codigo_periodo',
  'numeroPeriodo',
  'codigo',
] as const;

const PERIOD_BOOK_KEYS = ['bookCode', 'codigoLibro', 'libro'] as const;
const PERIOD_STATUS_KEYS = ['status', 'estado'] as const;
const PERIOD_START_KEYS = ['startDate', 'fechaInicio', 'desde'] as const;
const PERIOD_END_KEYS = ['endDate', 'fechaFin', 'hasta'] as const;
const PERIOD_COUNT_KEYS = [
  'recordCount',
  'cantidadRegistros',
  'totalRegistros',
  'numeroRegistros',
  'records',
] as const;

const PERIOD_LIST_KEYS = ['periodos', 'periods', 'data', 'items', 'lista'] as const;

const readString = (source: Record<string, unknown>, keys: readonly string[]): string | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const readNumber = (source: Record<string, unknown>, keys: readonly string[]): number | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  }
  return undefined;
};

const mapPeriodItem = (item: unknown): SirePeriodo | null => {
  if (typeof item === 'string' || typeof item === 'number') {
    const code = String(item).trim();
    return code ? { period: code } : null;
  }
  if (!isRecord(item)) return null;

  const period = readString(item, PERIOD_CODE_KEYS);
  if (!period) return null;

  return {
    period,
    ...(readString(item, PERIOD_BOOK_KEYS) ? { bookCode: readString(item, PERIOD_BOOK_KEYS) } : {}),
    ...(readString(item, PERIOD_STATUS_KEYS) ? { status: readString(item, PERIOD_STATUS_KEYS) } : {}),
    ...(readString(item, PERIOD_START_KEYS) ? { startDate: readString(item, PERIOD_START_KEYS) } : {}),
    ...(readString(item, PERIOD_END_KEYS) ? { endDate: readString(item, PERIOD_END_KEYS) } : {}),
    ...(readNumber(item, PERIOD_COUNT_KEYS) !== undefined
      ? { recordCount: readNumber(item, PERIOD_COUNT_KEYS) }
      : {}),
  };
};

/**
 * Convierte el payload crudo de SUNAT en una lista de periodos.
 *
 * Acepta las formas que el backend puede devolver (el resultado almacenado es
 * el JSON literal de SUNAT):
 * - `['202601', '202602']`
 * - `[{ codigoPeriodo: '202601', ... }]`
 * - `{ periodos: [...] }` / `{ periods: [...] }` / `{ data: [...] }`
 *
 * Un payload que no se reconoce devuelve una lista vacía: la pantalla lo dice
 * en vez de inventar datos.
 */
export const normalizeSirePeriods = (raw: unknown): SirePeriodo[] => {
  if (raw === null || raw === undefined) return [];

  if (Array.isArray(raw)) {
    return raw.map(mapPeriodItem).filter((item): item is SirePeriodo => item !== null);
  }

  if (!isRecord(raw)) return [];

  for (const key of PERIOD_LIST_KEYS) {
    const list = raw[key];
    if (Array.isArray(list)) return normalizeSirePeriods(list);
  }

  const single = mapPeriodItem(raw);
  return single ? [single] : [];
};

/**
 * Contrato del POST /sire/periodos (HTTP 202).
 * El backend responde `PENDING` cuando encoló el trabajo y `FAILED` cuando la
 * cola no pudo publicarlo: en ambos casos llega un `messageId`.
 */
export const isPeriodosAcceptedResponse = (value: unknown): value is SirePeriodosAcceptedResponse =>
  isRecord(value) &&
  isString(value.messageId) &&
  value.messageId.trim().length > 0 &&
  (value.status === 'PENDING' || value.status === 'FAILED') &&
  isOptionalString(value.errorCode) &&
  isOptionalString(value.message) &&
  isOptionalString(value.error);

/**
 * Contrato del GET /sire/periodos/status/:messageId.
 *
 * `periods` llega como el payload crudo de SUNAT: no se valida su forma aquí
 * (la normaliza `normalizeSirePeriods`) porque un dato inesperado no debe
 * convertir una consulta válida en un error de contrato.
 */
export const isPeriodosStatusResponse = (value: unknown): value is SirePeriodosStatusResponse =>
  isRecord(value) &&
  (value.status === 'PENDING' ||
    value.status === 'PROCESSING' ||
    value.status === 'COMPLETED' ||
    value.status === 'FAILED') &&
  isOptionalString(value.messageId) &&
  isOptionalString(value.bookCode) &&
  isOptionalString(value.message) &&
  isOptionalString(value.error) &&
  (value.errorCode === undefined || value.errorCode === null || isString(value.errorCode)) &&
  (value.createdAt === undefined || isString(value.createdAt)) &&
  (value.completedAt === undefined || isString(value.completedAt));

/** Estado normalizado que consume la pantalla. */
export const mapPeriodosStatus = (response: SirePeriodosStatusResponse): SirePeriodosStatus => ({
  status: response.status,
  periods: normalizeSirePeriods(response.periods),
  ...(response.message ? { message: response.message } : {}),
  ...(response.error ? { error: response.error } : {}),
  ...(response.errorCode !== undefined ? { errorCode: response.errorCode } : {}),
  ...(response.messageId ? { messageId: response.messageId } : {}),
  ...(response.bookCode ? { bookCode: response.bookCode } : {}),
});


/**
 * Contrato de `GET /sire/configuracion/status` y `POST /sire/configuracion`.
 *
 * El backend solo devuelve el indicador de configuración: nunca las
 * credenciales ni parte de ellas.
 */
export const isConfiguracionStatusResponse = (value: unknown): value is SireConfiguracionStatus =>
  isRecord(value) && typeof value.configured === 'boolean';

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || isNumber(value);

const isProposal = (value: unknown): value is SireProposalDto =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.period === 'string' &&
  (value.bookType === 'RVIE' || value.bookType === 'RCE' || value.bookType === 'RVIE_VENTAS' || value.bookType === 'RCE_COMPRAS') &&
  typeof value.carSunat === 'string' &&
  typeof value.emitterRuc === 'string' &&
  (value.documentType === '01' || value.documentType === '03' || value.documentType === '07' || value.documentType === '08') &&
  typeof value.series === 'string' &&
  typeof value.correlative === 'string' &&
  typeof value.issueDate === 'string' &&
  isNumber(value.taxableBase) &&
  isNumber(value.igvAmount) &&
  isNumber(value.totalAmount) &&
  (value.origin === 'SUNAT' || value.origin === 'USUARIO');

export const isProposalResponse = (value: unknown): value is SireProposalResponse =>
  isRecord(value) &&
  typeof value.period === 'string' &&
  (value.bookType === 'RVIE' || value.bookType === 'RCE' || value.bookType === 'RVIE_VENTAS' || value.bookType === 'RCE_COMPRAS') &&
  Array.isArray(value.proposals) &&
  value.proposals.every(isProposal);

export const isImportResponse = (value: unknown): value is ImportSireProposalResponse =>
  isRecord(value) &&
  typeof value.imported === 'number' &&
  Number.isInteger(value.imported) &&
  value.imported >= 0 &&
  typeof value.rejected === 'number' &&
  Number.isInteger(value.rejected) &&
  value.rejected >= 0 &&
  Array.isArray(value.errors) &&
  value.errors.every(
    (item) =>
      isRecord(item) &&
      typeof item.line === 'number' &&
      typeof item.reason === 'string',
  );

interface BackendReconciliation {
  period: string;
  bookType: SireBookType;
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
    duplicateSource?: DuplicateSource | null;
  }[];
}

const isScenario = (value: unknown): value is ReconcileScenario =>
  value === 'COINCIDENCIA_EXACTA' ||
  value === 'DIFERENCIA_MONTOS' ||
  value === 'OMISION_LOCAL' ||
  value === 'OMISION_SUNAT' ||
  value === 'DUPLICADO_LLAVE';

const isDuplicateSource = (value: unknown): value is DuplicateSource | null | undefined =>
  value === undefined || value === null || value === 'LOCAL' || value === 'SIRE' || value === 'AMBOS';

export const isBackendReconciliation = (value: unknown): value is BackendReconciliation =>
  isRecord(value) &&
  typeof value.period === 'string' &&
  (value.bookType === 'RVIE_VENTAS' || value.bookType === 'RCE_COMPRAS') &&
  isNumber(value.totalLocalRecords) &&
  isNumber(value.totalSireRecords) &&
  isNumber(value.exactMatchesCount) &&
  isNumber(value.discrepanciesCount) &&
  isNumber(value.complianceRate) &&
  Array.isArray(value.discrepancies) &&
  value.discrepancies.every((item) =>
    isRecord(item) &&
    isScenario(item.discrepancyType) &&
    typeof item.emitterRuc === 'string' &&
    typeof item.documentType === 'string' &&
    typeof item.series === 'string' &&
    typeof item.correlative === 'string' &&
    isNumber(item.amountDifference) &&
    (item.localTotalAmount === undefined || isNullableNumber(item.localTotalAmount)) &&
    (item.sireTotalAmount === undefined || isNullableNumber(item.sireTotalAmount)) &&
    (item.taxableBaseDifference === undefined || isNullableNumber(item.taxableBaseDifference)) &&
    (item.igvDifference === undefined || isNullableNumber(item.igvDifference)) &&
    isDuplicateSource(item.duplicateSource)
  );

const toTipoComprobante = (documentType: string): TipoComprobante => {
  if (documentType === '01' || documentType === '03' || documentType === '07' || documentType === '08') {
    return documentType;
  }
  throw new SireApiError('El servidor devolvió un tipo de comprobante desconocido.', null);
};

export const mapReconciliation = (response: BackendReconciliation): ReconcileResponse => {
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

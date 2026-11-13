export type ReconcileScenario =
  | 'COINCIDENCIA_EXACTA'
  | 'DIFERENCIA_MONTOS'
  | 'OMISION_LOCAL'
  | 'OMISION_SUNAT'
  | 'DUPLICADO_LLAVE';

export type DuplicateSource = 'LOCAL' | 'SIRE' | 'AMBOS';
export type TipoComprobante = '01' | '03' | '07' | '08';
export type SireBookType = 'RVIE_VENTAS' | 'RCE_COMPRAS';
export type SireRecordOrigin = 'SUNAT' | 'USUARIO';

export interface SireProposalDto {
  id: string;
  period: string;
  bookType: 'RVIE' | 'RCE' | SireBookType;
  carSunat: string;
  emitterRuc: string;
  documentType: TipoComprobante;
  series: string;
  correlative: string;
  issueDate: string;
  taxableBase: number;
  igvAmount: number;
  totalAmount: number;
  origin: SireRecordOrigin;
  status?: string;
  excluded?: boolean;
}

export interface SireProposalResponse {
  period: string;
  bookType: SireBookType | 'RVIE' | 'RCE';
  proposals: SireProposalDto[];
}

export interface ImportSireProposalResponse {
  imported: number;
  rejected: number;
  errors: { line: number; reason: string }[];
}

export interface SireComprobante {
  tipoComprobante: TipoComprobante;
  serie: string;
  correlativo: string;
  baseImponible: number;
  igv: number;
  total: number;
}

export interface ComprobanteDraft extends Omit<SireComprobante, 'baseImponible' | 'igv' | 'total'> {
  baseImponible: string;
  igv: string;
  total: string;
}

export interface ReconcileRequest {
  period: string;
  bookType: SireBookType;
  comprobantes: SireComprobante[];
}

export interface ReconcileSummary {
  total: number;
  coincidenciaExacta: number;
  diferenciaMontos: number;
  omisionLocal: number;
  omisionSunat: number;
  duplicadoLlave: number;
  porcentajeCumplimiento: number;
}

export interface ReconcileResult {
  llave: string;
  tipoComprobante: TipoComprobante;
  serie: string;
  correlativo: string;
  totalLocal?: number;
  totalSire?: number;
  diferenciaTotal: number;
  diferenciaBase: number;
  diferenciaIgv: number;
  escenario: ReconcileScenario;
  duplicateSource?: DuplicateSource | null;
}

export interface ReconcileResponse {
  period: string;
  bookType: SireBookType;
  summary: ReconcileSummary;
  results: ReconcileResult[];
}

/**
 * Estados del trabajo asíncrono de SUNAT (cola del backend).
 * - PENDING: encolado, el worker todavía no lo tomó.
 * - PROCESSING: el worker ya está consultando a SUNAT.
 * - COMPLETED: concluido con éxito; `periods` trae los periodos devueltos.
 * - FAILED: concluido con error; `error`/`message` explica la causa informada.
 */
export type SireJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Códigos de libro que acepta el backend (`@IsIn(['140000', '080000'])`).
 * 140000 = Registro de Ventas e Ingresos Electrónico (RVIE).
 * 080000 = Registro de Compras Electrónico (RCE).
 */
export const SIRE_BOOK_CODES = ['140000', '080000'] as const;

export type SireBookCode = (typeof SIRE_BOOK_CODES)[number];

export const SIRE_BOOK_CODE_LABELS: Record<SireBookCode, string> = {
  '140000': '140000 · Registro de Ventas e Ingresos Electrónico (RVIE)',
  '080000': '080000 · Registro de Compras Electrónico (RCE)',
};

export interface SirePeriodosRequest {
  bookCode: SireBookCode;
  solUser: string;
  solPassword: string;
}

/**
 * Respuesta 202 del POST /sire/periodos.
 * `PENDING` cuando el trabajo quedó encolado; `FAILED` cuando la cola no
 * pudo publicarlo (el backend responde 202 con el mensaje accionable).
 */
export interface SirePeriodosAcceptedResponse {
  messageId: string;
  status: 'PENDING' | 'FAILED';
  errorCode?: string;
  message?: string;
  error?: string;
}

/**
 * Periodo devuelto por SUNAT, ya normalizado por el frontend.
 * `period` es el único campo obligatorio: el resto es metadata opcional que el
 * backend puede omitir, por eso la tabla los muestra solo cuando llegan.
 */
export interface SirePeriodo {
  period: string;
  bookCode?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  recordCount?: number;
}

export interface SirePeriodosStatusResponse {
  messageId?: string;
  status: SireJobStatus;
  /**
   * Payload crudo que devolvió SUNAT y que el backend guardó tal cual.
   * Puede ser un arreglo o un objeto con la lista dentro: lo normaliza
   * `normalizeSirePeriods` antes de llegar a la tabla.
   */
  periods?: unknown;
  /** Texto accionable del backend (mensaje amigable del catálogo de errores). */
  message?: string;
  error?: string;
  errorCode?: string | null;
  bookCode?: string;
  createdAt?: string;
  completedAt?: string;
}

/** Estado normalizado que consume la pantalla. */
export interface SirePeriodosStatus {
  status: SireJobStatus;
  periods: SirePeriodo[];
  message?: string;
  error?: string;
  errorCode?: string | null;
  messageId?: string;
  bookCode?: string;
}

export interface SireHistoryItem {
  id: string;
  period: string;
  bookType: 'RVIE' | 'RCE';
  status: 'EN_REVISION' | 'CONCILIADO' | 'CERRADO';
  createdAt: string;
  complianceRate: number;
  totalsByScenario: Record<ReconcileScenario, number>;
}

export interface SireHistoryResponse {
  page: number;
  limit: number;
  total: number;
  items: SireHistoryItem[];
}

export interface CloseSirePeriodResponse {
  period: string;
  bookType: SireBookType;
  status: 'CERRADO';
}

export interface SireDashboardMetrics {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  recentFailedCalls: number;
  failureRate: number;
  slowCallRate: number;
  bufferedInvoicesCount: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalRetries: number;
  lastStateChange: string;
  circuitBreakerScope: string;
  activityScope: string;
  mttdSeconds: number | null;
  mttrSeconds: number | null;
  mtbfSeconds: number | null;
  mttd?: number | null;
  mttr?: number | null;
  mtbf?: number | null;
}

export type SireDashboardGranularity = 'minute' | 'hour' | 'day';

export interface SireDashboardHistoryPoint {
  timestamp: string;
  retries: number;
  availabilityPercent: number | null;
  observedCalls: number;
  successfulCalls: number;
  failedCalls: number;
}

export interface SireDashboardHistoryResponse {
  points: SireDashboardHistoryPoint[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface SireDashboardHistoryRequest {
  start: string;
  end: string;
  granularity: SireDashboardGranularity;
  limit: number;
  offset: number;
}

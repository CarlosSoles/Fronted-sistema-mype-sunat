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

/** Empresa del selector Multi-RUC (`GET /empresa/listar`). */
export interface EmpresaResumen {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  activa: boolean;
}

/** Respuesta 202 de `POST /sire/importar`. */
export interface SireImportacionRespuesta {
  messageId: string;
  importacionId: string;
  periodo: string;
  libro: SireBookType;
  nombreArchivo: string;
  estado: SireJobStatus;
  rutaArchivo: string;
  backendAlmacen: string;
  hashArchivo: string;
  bytes: number;
  createdAt: string;
}

/** Respuesta de `GET /sire/importar/estado/:messageId`. */
export interface SireImportacionEstado {
  messageId: string;
  estado: SireJobStatus;
  periodo: string;
  libro: SireBookType;
  createdAt: string;
  completedAt: string | null;
  errorCode: string | null;
  message: string | null;
  ticket?: string | null;
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

/**
 * Consulta de periodos a SUNAT.
 *
 * El backend resuelve las credenciales SOL desde la configuración SIRE de la
 * empresa (`POST /api/v1/sire/configuracion`), así que el frontend ya no
 * envía usuario ni clave SOL: solo el libro consultado.
 */
export interface SirePeriodosRequest {
  bookCode: SireBookCode;
}

/**
 * Credenciales SIRE/SUNAT de la empresa.
 *
 * Los cuatro campos son opcionales: el backend conserva tal como estaban las
 * credenciales que no se envían, de modo que se puede guardar solo lo que
 * cambió. Nunca se envía el RUC: sale de la empresa autenticada.
 */
export interface SireConfiguracionPayload {
  clientId?: string;
  clientSecret?: string;
  solUser?: string;
  solPassword?: string;
}

/**
 * Estado de la configuración SIRE de la empresa.
 *
 * `configured` es `true` cuando la empresa tiene las cuatro credenciales
 * (`clientId`, `clientSecret`, `solUser`, `solPassword`) presentes y no vacías.
 * El backend nunca devuelve los valores: solo este indicador.
 */
export interface SireConfiguracionStatus {
  configured: boolean;
  /** Mensaje que devuelve el backend al guardar (opcional). */
  message?: string;
}

/**
 * Datos globales de la empresa editables desde la configuración SIRE.
 *
 * Se guardan con `PUT /empresa/configuracion`. La empresa se identifica por la
 * sesión autenticada y solo se envían los campos informados para no borrar
 * datos ya configurados en el backend.
 */
export interface EmpresaConfiguracionPayload {
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  estado?: string;
  condicion?: string;
  /** Series de comprobantes autorizadas para la empresa. */
  series?: string[];
}

/**
 * Configuración actual de la empresa devuelta por
 * `GET /api/v1/empresa/configuracion`.
 *
 * El backend identifica la empresa por la sesión y usa `businessName` /
 * `tradeName`; aquí se normalizan a los nombres que consume la UI.
 */
export interface EmpresaConfiguracionActual {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  estado: string;
  condicion: string;
  series: string[];
}

/** Datos de la empresa obtenidos al validar el RUC contra Decolecta. */
export interface EmpresaRucValidacion {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  estado?: string;
  condicion?: string;
  /** Series autocompletadas por el backend, si las informa. */
  series?: string[];
}

/**
 * Línea de asiento contable que el backend propone para un periodo SIRE.
 * Se muestra solo como previsualización: no crea asientos ni afecta contabilidad.
 */
export interface SireAsientoPreview {
  cuentaContable: string;
  debe: number;
  haber: number;
  descripcion: string;
}

/** Tipos de operación que se asignan a una cuenta contable del PCGE. */
export const SIRE_MAPEO_TIPOS = [
  'VENTAS',
  'COMPRAS',
  'IGV_VENTAS',
  'IGV_COMPRAS',
  'BASE',
] as const;

export type SireMapeoTipoOperacion = (typeof SIRE_MAPEO_TIPOS)[number];

/** Par tipo de operación → cuenta contable del mapeo SIRE. */
export interface SireMapeoContable {
  tipoOperacion: SireMapeoTipoOperacion;
  cuentaContable: string;
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

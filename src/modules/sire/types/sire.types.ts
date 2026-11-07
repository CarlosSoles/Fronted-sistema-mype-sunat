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

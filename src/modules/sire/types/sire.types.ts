export type ReconcileScenario =
  | 'COINCIDENCIA_EXACTA'
  | 'DIFERENCIA_MONTOS'
  | 'OMISION_LOCAL'
  | 'OMISION_SUNAT'
  | 'DUPLICADO_LLAVE';

export type DuplicateSource = 'LOCAL' | 'SIRE' | 'AMBOS';
export type TipoComprobante = '01' | '03' | '07' | '08';
export type SireBookType = 'RVIE_VENTAS' | 'RCE_COMPRAS';

export interface ImportSireProposalRequest {
  period: string;
  bookType: SireBookType;
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
  ruc: string;
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

interface ReconcileResultBase {
  llave: string;
  tipoComprobante: TipoComprobante;
  serie: string;
  correlativo: string;
  baseLocal: number;
  baseSire: number;
  igvLocal: number;
  igvSire: number;
  diferenciaBase: number;
  diferenciaIgv: number;
}

export type ReconcileResult = ReconcileResultBase & (
  | { escenario: 'DUPLICADO_LLAVE'; duplicateSource: DuplicateSource | null }
  | { escenario: Exclude<ReconcileScenario, 'DUPLICADO_LLAVE'>; duplicateSource?: never }
);

export interface ReconcileResponse {
  period: string;
  summary: ReconcileSummary;
  results: ReconcileResult[];
}

export type MatchStatus = 'CONCILIADO' | 'DISCREPANCIA' | 'SOLO_SUNAT' | 'SOLO_LOCAL';

export interface SireVoucher {
  id: string;
  periodo: string; // YYYYMM (ej. 202610)
  tipoComprobante: '01' | '03' | '07' | '08';
  serie: string;
  numero: string;
  emisorRuc: string;
  emisorRazonSocial: string;
  fechaEmision: string;
  montoSunat: number;
  montoLocal?: number;
  diferencia?: number;
  matchStatus: MatchStatus;
  motivoDiscrepancia?: string;
}

export interface SireReconciliationSummary {
  totalPropuestaSunat: number;
  totalRegistroLocal: number;
  comprobantesConciliados: number;
  comprobantesConDiscrepancia: number;
  diferenciaNeta: number;
}

export type SireBookType = 'RVIE_VENTAS' | 'RCE_COMPRAS';

export interface SireLocalRecord {
  id: string;
  tipoComprobante: SireVoucher['tipoComprobante'];
  serie: string;
  numero: string;
  emisorRuc: string;
  emisorRazonSocial: string;
  fechaEmision: string;
  montoLocal: number;
}

export interface SireReconciliationRequest {
  period: string;
  bookType: SireBookType;
  localRecords: SireLocalRecord[];
}

export interface SireReconciliationResult {
  vouchers: SireVoucher[];
  summary: SireReconciliationSummary;
  source: 'api' | 'mock';
}

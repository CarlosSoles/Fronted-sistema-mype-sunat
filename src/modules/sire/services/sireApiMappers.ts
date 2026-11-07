import { SireApiError } from './sireApiHttp';
import type {
  DuplicateSource,
  ImportSireProposalResponse,
  ReconcileResponse,
  ReconcileScenario,
  SireBookType,
  SireProposalDto,
  SireProposalResponse,
  TipoComprobante,
} from '../types/sire.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

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

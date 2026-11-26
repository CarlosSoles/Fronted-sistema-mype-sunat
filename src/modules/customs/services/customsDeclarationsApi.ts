import { apiClient } from '@/lib/axios';
import {
  type CustomsChannel,
  type CustomsDeclarationRecord,
  type CustomsSettlementRecord,
  type PaySettlementPayload,
  type RegisterDuaWizardPayload,
} from '../types';

export const normalizeDeclarationRecord = (
  raw: Record<string, unknown>
): CustomsDeclarationRecord => {
  const fob = Number(raw.fob_total_usd ?? raw.fobTotalUsd ?? raw.fobValueUsd ?? 0);
  const freight = Number(raw.freight_total_usd ?? raw.freightTotalUsd ?? raw.freightValueUsd ?? 0);
  const insurance = Number(raw.insurance_total_usd ?? raw.insuranceTotalUsd ?? raw.insuranceValueUsd ?? 0);
  const cifUsd = Number(raw.cif_total_usd ?? raw.cifTotalUsd ?? raw.cifValueUsd ?? (fob + freight + insurance));
  const tc = Number(raw.exchange_rate ?? raw.exchangeRate ?? 3.82);
  const cifPen = Number(raw.cif_total_pen ?? raw.cifTotalPen ?? raw.cifValuePen ?? (cifUsd * tc));

  let seriesList: any[] = [];
  if (Array.isArray(raw.series) && raw.series.length > 0) {
    seriesList = raw.series;
  } else if (Array.isArray(raw.items) && raw.items.length > 0) {
    seriesList = (raw.items as any[]).map((it, idx) => ({
      series_order: it.seriesOrder || it.series_order || it.itemOrder || it.item_order || idx + 1,
      product_code: it.productCode || it.product_code || `PROD-${idx + 1}`,
      hs_code: it.hsCode || it.hs_code || '8471.30.00.00',
      commercial_description: it.commercialDescription || it.commercial_description || 'Mercancía importada',
      destination_type: it.destinationType || it.destination_type || 'MERCADERIA',
      physical_quantity: Number(it.quantity || it.physical_quantity || 1),
      physical_unit: it.unitCode || it.unit_code || 'NIU',
      net_weight_kg: Number(it.netWeightKg || it.net_weight_kg || 0),
      gross_weight_kg: Number(it.grossWeightKg || it.gross_weight_kg || 0),
      fob_usd: Number(it.fobTotalUsd || it.fob_total_usd || (it.quantity * it.fobUnitUsd) || 0),
      ad_valorem_rate: Number(it.adValoremRate || it.ad_valorem_rate || 0),
    }));
  }

  return {
    id: String(raw.id || 'dam-001'),
    company_id: String(raw.company_id ?? raw.companyId ?? ''),
    shipment_id: String(raw.shipment_id ?? raw.shipmentId ?? ''),
    dua_number: String(raw.dua_number ?? raw.duaNumber ?? '118-2026-10-045892'),
    customs_code: String(raw.customs_code ?? raw.customsCode ?? raw.customsAgencyCode ?? '118'),
    declaration_year: Number(raw.declaration_year ?? raw.declarationYear ?? new Date().getFullYear()),
    regime_code: String(raw.regime_code ?? raw.regimeCode ?? '10'),
    correlative_number: String(raw.correlative_number ?? raw.correlativeNumber ?? ''),
    numeration_date: String(raw.numeration_date ?? raw.numerationDate ?? new Date().toISOString()),
    dispatch_mode: (raw.dispatch_mode ?? raw.dispatchMode ?? '10') as any,
    channel: (raw.channel as CustomsChannel) || 'VERDE',
    transport_doc_number: String(raw.transport_doc_number ?? raw.transportDocNumber ?? ''),
    manifest_number:
      raw.manifest_number != null
        ? String(raw.manifest_number)
        : raw.manifestNumber != null
        ? String(raw.manifestNumber)
        : '',
    fob_total_usd: fob,
    freight_total_usd: freight,
    insurance_total_usd: insurance,
    cif_total_usd: cifUsd,
    exchange_rate: tc,
    cif_total_pen: cifPen,
    total_ad_valorem_pen: Number(raw.total_ad_valorem_pen ?? raw.totalAdValoremPen ?? 0),
    total_igv_pen: Number(raw.total_igv_pen ?? raw.totalIgvPen ?? 0),
    total_ipm_pen: Number(raw.total_ipm_pen ?? raw.totalIpmPen ?? 0),
    total_perception_pen: Number(raw.total_perception_pen ?? raw.totalPerceptionPen ?? 0),
    has_article_160_guarantee: Boolean(
      raw.has_article_160_guarantee ?? raw.hasArticle160Guarantee ?? false
    ),
    version: Number(raw.version ?? 1),
    created_at: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
    series: seriesList,
    settlements: Array.isArray(raw.settlements) ? (raw.settlements as any) : undefined,
    supplier_name: (raw.supplier_name ?? raw.supplierName) as string | undefined,
    supplier_tax_id: (raw.supplier_tax_id ?? raw.supplierTaxId) as string | undefined,
    supplier_country: (raw.supplier_country ?? raw.supplierCountry) as string | undefined,
    commercial_invoice_number: (raw.commercial_invoice_number ?? raw.commercialInvoiceNumber ?? raw.invoice_number) as string | undefined,
    incoterm: (raw.incoterm ?? raw.incoterms) as string | undefined,
  };
};

export const customsDeclarationsApi = {
  /**
   * Registra y numera la DAM oficial mediante el Asistente Wizard en 4 Pasos.
   */
  registerDuaWizard: async (
    payload: RegisterDuaWizardPayload
  ): Promise<CustomsDeclarationRecord> => {
    const response = await apiClient.post<Record<string, unknown>>(
      '/customs/declarations/wizard',
      payload
    );
    return normalizeDeclarationRecord(response.data);
  },

  /**
   * Consulta las declaraciones aduaneras registradas de la empresa activa desde el backend.
   */
  getDeclarations: async (): Promise<CustomsDeclarationRecord[]> => {
    const response = await apiClient.get<Record<string, unknown>[]>('/customs/declarations');
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeDeclarationRecord);
  },

  /**
   * Consulta el detalle completo de una DAM con sus series y liquidaciones con CDA.
   */
  getDeclarationById: async (id: string): Promise<CustomsDeclarationRecord> => {
    const response = await apiClient.get<Record<string, unknown>>(`/customs/declarations/${id}`);
    return normalizeDeclarationRecord(response.data);
  },

  /**
   * Obtiene la lista de liquidaciones de cobranza tributaria pendientes de pago desde el backend.
   */
  getPendingSettlements: async (): Promise<CustomsSettlementRecord[]> => {
    const response = await apiClient.get<CustomsSettlementRecord[]>('/customs/settlements/pending');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Obtiene las liquidaciones asociadas a una DAM específica desde el backend.
   */
  getSettlementsByDeclaration: async (
    declarationId: string
  ): Promise<CustomsSettlementRecord[]> => {
    const response = await apiClient.get<CustomsSettlementRecord[]>(
      `/customs/settlements/declaration/${declarationId}`
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Asienta el pago bancario Teledespacho de una liquidación aduanera.
   */
  paySettlement: async (
    settlementId: string,
    payload: PaySettlementPayload
  ): Promise<{ message: string; levante_granted: boolean }> => {
    const response = await apiClient.post<{ message: string; levante_granted: boolean }>(
      `/customs/settlements/${settlementId}/pay`,
      payload
    );
    return response.data;
  },

  /**
   * Carga y asocia un documento oficial DAM (Formatos A, B, C o Sustento).
   */
  uploadDocument: async (
    declarationId: string,
    payload: {
      format_type: string;
      document_number?: string;
      file_name: string;
      storage_url: string;
      mime_type?: string;
      file_size_bytes?: number;
      uploaded_by?: string;
    }
  ) => {
    const response = await apiClient.post(
      `/customs/declarations/${declarationId}/documents`,
      payload
    );
    return response.data;
  },

  /**
   * Obtiene los documentos oficiales adjuntos a la declaración.
   */
  getDocuments: async (declarationId: string) => {
    const response = await apiClient.get<Array<{
      id: string;
      format_type: string;
      document_number?: string;
      file_name: string;
      storage_url: string;
      mime_type?: string;
      created_at: string;
    }>>(`/customs/declarations/${declarationId}/documents`);
    return response.data;
  },

  /**
   * Simulación matemática pura de tributos sin persistencia en base de datos.
   */
  simulateTaxes: async (payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await apiClient.post<Record<string, unknown>>('/customs/calculate', payload);
    return response.data;
  },
};

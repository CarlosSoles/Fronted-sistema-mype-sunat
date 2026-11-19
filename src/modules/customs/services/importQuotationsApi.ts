import { apiClient } from '@/lib/axios';

export interface ProformaItemPayload {
  productId?: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCode?: string;
  hsCode?: string;
}

export interface AddProformaPayload {
  supplierId?: string;
  supplierName: string;
  supplierCountry?: string;
  proformaNumber: string;
  incoterm: string;
  originPort?: string;
  currencyCode?: string;
  totalFob: number;
  estimatedFreight?: number;
  estimatedInsurance?: number;
  leadTimeDays?: number;
  paymentTerms?: string;
  validityDate?: string;
  notes?: string;
  items: ProformaItemPayload[];
}

export interface ProformaItemRecord {
  id: string;
  productId?: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalFob: number;
  unitCode: string;
  hsCode?: string;
}

export interface ProformaRecord {
  id: string;
  supplierId?: string;
  supplierName: string;
  supplierCountry: string;
  supplierContact?: string | null;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  proformaNumber: string;
  incoterm: string;
  originPort?: string | null;
  currencyCode: string;
  totalFob: number;
  estimatedFreight: number;
  estimatedInsurance: number;
  totalCif: number;
  leadTimeDays?: number;
  paymentTerms?: string | null;
  validityDate?: string | null;
  status: 'EN_EVALUACION' | 'GANADORA' | 'DESCARTADA_EN_CARTERA';
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt: string;
  items: ProformaItemRecord[];
}

export interface QuotationItemPayload {
  productId?: string;
  sku?: string;
  description: string;
  quantity: number;
  targetPrice?: number;
  unitCode?: string;
  hsCode?: string;
}

export interface QuotationItemRecord {
  productId?: string;
  sku?: string;
  description: string;
  quantity: number;
  targetPrice?: number;
  unitCode?: string;
  hsCode?: string;
}

export interface ImportQuotationRecord {
  id: string;
  companyId: string;
  quotationNumber: string;
  title: string;
  targetIncoterm?: string;
  targetCurrency?: string;
  status: 'EN_NEGOCIACION' | 'ADJUDICADA' | 'CANCELADA';
  awardedProformaId?: string | null;
  notes?: string | null;
  items?: QuotationItemRecord[];
  createdAt: string;
  updatedAt: string;
  proformasCount: number;
  order?: { id: string; orderNumber: string; status: string } | null;
  proformas: ProformaRecord[];
}

export interface CreateQuotationPayload {
  title: string;
  targetIncoterm?: string;
  targetCurrency?: string;
  notes?: string;
  items?: QuotationItemPayload[];
}

const BASE = '/customs/quotations';

export const importQuotationsApi = {
  listQuotations: async (params?: { status?: string; search?: string }) => {
    const { data } = await apiClient.get<{ total: number; items: ImportQuotationRecord[] }>(BASE, {
      params,
    });
    return data;
  },

  getQuotationById: async (id: string) => {
    const { data } = await apiClient.get<ImportQuotationRecord>(`${BASE}/${id}`);
    return data;
  },

  createQuotation: async (payload: CreateQuotationPayload) => {
    const { data } = await apiClient.post<ImportQuotationRecord>(BASE, payload);
    return data;
  },

  updateQuotation: async (id: string, payload: Partial<CreateQuotationPayload> & { status?: string }) => {
    const { data } = await apiClient.put<ImportQuotationRecord>(`${BASE}/${id}`, payload);
    return data;
  },

  addProforma: async (quotationId: string, payload: AddProformaPayload) => {
    const { data } = await apiClient.post<ProformaRecord>(`${BASE}/${quotationId}/proformas`, payload);
    return data;
  },

  updateProforma: async (quotationId: string, proformaId: string, payload: Partial<AddProformaPayload> & { rejectionReason?: string }) => {
    const { data } = await apiClient.put<ProformaRecord>(`${BASE}/${quotationId}/proformas/${proformaId}`, payload);
    return data;
  },

  deleteProforma: async (quotationId: string, proformaId: string) => {
    await apiClient.delete(`${BASE}/${quotationId}/proformas/${proformaId}`);
  },

  awardProforma: async (quotationId: string, proformaId: string) => {
    const { data } = await apiClient.post<{
      quotationId: string;
      awardedProformaId: string;
      generatedOrder: { id: string; orderNumber: string; totalFob: number; supplierName: string };
    }>(`${BASE}/${quotationId}/proformas/${proformaId}/award`);
    return data;
  },
};

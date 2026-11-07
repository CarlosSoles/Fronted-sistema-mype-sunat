import { useAuthStore } from '@/stores/authStore';
import { getRucFeedback } from '../validators/sireSchema';
import type {
  ImportSireProposalResponse,
  ReconcileRequest,
  ReconcileResponse,
  SireBookType,
  SireProposalResponse,
} from '../types/sire.types';
import {
  assertAllowedProposalFile,
  assertValidPeriod,
  requestSireApi,
  SireApiError,
} from './sireApiHttp';
import { isBackendReconciliation, isImportResponse, isProposalResponse, mapReconciliation } from './sireApiMappers';

export { SireApiError } from './sireApiHttp';

export const sireApi = {
  async getProposal(period: string, bookType: SireBookType): Promise<SireProposalResponse> {
    assertValidPeriod(period);
    const response = await requestSireApi<unknown>('/sire/proposal', {
      method: 'POST',
      body: JSON.stringify({ period, bookType }),
    });
    if (!isProposalResponse(response)) {
      throw new SireApiError('El servidor devolvió propuestas SIRE con un formato inválido.', null);
    }
    return response;
  },

  async importProposal(
    period: string,
    bookType: SireBookType,
    file: File,
  ): Promise<ImportSireProposalResponse> {
    assertValidPeriod(period);
    assertAllowedProposalFile(file);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('period', period);
    formData.append('bookType', bookType);
    const response = await requestSireApi<unknown>('/sire/import', {
      method: 'POST',
      body: formData,
    });
    if (!isImportResponse(response)) {
      throw new SireApiError('El servidor devolvió un resultado de importación con formato inválido.', null);
    }
    return response;
  },

  async reconcile(payload: ReconcileRequest): Promise<ReconcileResponse> {
    assertValidPeriod(payload.period);
    if (!payload.comprobantes) {
      throw new SireApiError('No se encontraron comprobantes locales para conciliar.', 400);
    }
    if (!useAuthStore.getState().token) {
      throw new SireApiError('Tu sesión venció o no es válida. Inicia sesión nuevamente.', 401);
    }
    const companyRuc = useAuthStore.getState().activeCompany?.ruc;
    if (!companyRuc) {
      throw new SireApiError('No se encontró el RUC de la empresa autenticada.', 400);
    }
    const rucFeedback = getRucFeedback(companyRuc);
    if (rucFeedback) throw new SireApiError(rucFeedback, 400);

    const response = await requestSireApi<unknown>('/sire/reconcile', {
      method: 'POST',
      body: JSON.stringify({
        period: payload.period,
        bookType: payload.bookType,
        localRecords: payload.comprobantes.map((item) => ({
          emitterRuc: companyRuc,
          documentType: item.tipoComprobante,
          series: item.serie,
          correlative: item.correlativo,
          taxableBase: item.baseImponible,
          igvAmount: item.igv,
          totalAmount: item.total,
        })),
      }),
    });
    if (!isBackendReconciliation(response)) {
      throw new SireApiError('El servidor devolvió una respuesta de conciliación con formato inválido.', null);
    }
    return mapReconciliation(response);
  },
};

import { apiClient } from '@/lib/axios';
import { type CreateInvoiceDto, type Invoice } from '../types/invoice.types';
import {
  aCreateInvoiceDto,
  aInvoice,
  aInvoiceDetalle,
  aPaginaInvoices,
  type ComprobanteBackend,
  type ComprobanteDetalleBackend,
  type PaginaBackend,
} from '../lib/invoiceMapper';
import {
  normalizarMetricas,
  type MetricasFacturacion,
} from '../lib/invoiceMetricsPeriodo';
import {
  normalizarAlertas,
  type AlertasOperativas,
} from '../lib/invoiceAlertas';
import type { ClienteBuscado } from '../lib/invoiceSearch';

/** Filtros que acepta el listado (el backend ya los soporta). */
export interface FiltrosInvoices {
  estado?: string;
  tipo?: string;
  serie?: string;
  desde?: string;
  hasta?: string;
}

/**
 * Cliente de la API de comprobantes.
 *
 * TA-59: antes devolvía la respuesta CRUDA del backend, así que la grilla
 * buscaba `clienteRuc` donde llegaba `cliente_documento` y `total` donde llegaba
 * `monto_total`, y quedaba vacía. Ahora todo pasa por `invoiceMapper`, que es la
 * única pieza que conoce los dos contratos.
 *
 * Los filtros se envían solo si tienen valor: mandar `estado=` (vacío) hace que
 * el backend filtre por una cadena vacía y no devuelva nada.
 */
export const invoicesApi = {
  getInvoices: async (
    page = 1,
    filtros: FiltrosInvoices = {},
  ): Promise<{
    data: Invoice[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> => {
    const params: Record<string, string | number> = { page };

    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
        params[clave] = String(valor).trim();
      }
    }

    const response = await apiClient.get<PaginaBackend>('/invoices', { params });
    return aPaginaInvoices(response.data);
  },

  getInvoiceById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<ComprobanteDetalleBackend>(
      `/invoices/${id}`,
    );
    return aInvoiceDetalle(response.data);
  },

  createInvoice: async (dto: CreateInvoiceDto): Promise<Invoice> => {
    const response = await apiClient.post<ComprobanteBackend>(
      '/invoices',
      aCreateInvoiceDto(dto),
    );
    return aInvoice(response.data);
  },

  retryCdr: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<ComprobanteBackend>(
      `/invoices/${id}/retry-cdr`,
    );
    return aInvoice(response.data);
  },

  /**
   * Métricas del periodo (TA-69).
   *
   * Suma en el servidor sobre toda la empresa, no sobre la página visible: es
   * la única forma de que la cifra de "facturado del periodo" no cambie al
   * pasar de página. El periodo va como `YYYY-MM`; sin él el backend usa el
   * actual.
   */
  getMetrics: async (periodo?: string): Promise<MetricasFacturacion> => {
    const params: Record<string, string> = {};
    if (periodo && periodo.trim() !== '') params.periodo = periodo.trim();

    const response = await apiClient.get<Partial<MetricasFacturacion>>(
      '/invoices/metrics',
      { params },
    );
    return normalizarMetricas(response.data, periodo);
  },

  /**
   * Buscador de clientes (TA-61).
   *
   * Devuelve la cartera que la empresa ya usó en sus comprobantes. Sin `q`
   * trae la lista completa, que es lo que necesita el desplegable al abrirse;
   * con `q` filtra por documento o razón social en el servidor.
   */
  buscarClientes: async (q?: string): Promise<ClienteBuscado[]> => {
    const params: Record<string, string> = {};
    if (q && q.trim() !== '') params.q = q.trim();

    const response = await apiClient.get<
      Array<{
        tipoDocumento?: string;
        numeroDocumento?: string;
        razonSocial?: string;
      }>
    >('/invoices/customers/lookup', { params });

    return (response.data ?? []).map((c) => ({
      tipoDocumento: (c.tipoDocumento ?? '6').trim(),
      numeroDocumento: (c.numeroDocumento ?? '').trim(),
      razonSocial: (c.razonSocial ?? '').trim(),
    }));
  },

  /**
   * Alertas operativas (TA-69): certificado por vencer y comprobantes en la DLQ.
   *
   * Se pide aparte de las métricas porque la DLQ consulta pg-boss y no debe
   * retrasar el pintado de las cifras del periodo.
   */
  getAlertas: async (): Promise<AlertasOperativas> => {
    const response = await apiClient.get<Partial<AlertasOperativas>>(
      '/invoices/alertas',
    );
    return normalizarAlertas(response.data);
  },
};

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
};

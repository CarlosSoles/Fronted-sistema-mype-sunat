import { apiClient } from '@/lib/axios';
import { type CreateInvoiceDto, type Invoice } from '../types/invoice.types';

export const invoicesApi = {
  getInvoices: async (page = 1): Promise<{ data: Invoice[]; total: number }> => {
    try {
      const response = await apiClient.get('/invoices', {
        params: { page },
      });

      const rawData = response.data;
      const items = Array.isArray(rawData)
        ? rawData
        : rawData?.data || rawData?.invoices || [];

      // Mapeo adaptativo desde los registros de Supabase hacia la interfaz Invoice
      const mappedInvoices = items.map((inv: any) => {
        const ubl = inv.payload_ubl || {};
        const customer = ubl.customer || {};
        const tax = ubl.tax_details || {};

        return {
          id: inv.id,
          serie: inv.serie || 'F001',
          correlativo: inv.correlativo || 1,
          numero: inv.correlativo || 1,
          clienteRazonSocial:
            customer.legal_name ||
            inv.clienteRazonSocial ||
            inv.cliente_razon_social ||
            'CLIENTE GENERAL',
          clienteRuc:
            customer.identity_document_number ||
            inv.clienteRuc ||
            inv.cliente_ruc ||
            '00000000000',
          fechaEmision: inv.fecha_emision || inv.createdAt || new Date().toISOString(),
          moneda: inv.moneda || 'PEN',
          subtotal: Number(tax.subtotal || inv.subtotal || 0),
          igv: Number(tax.igv || inv.igv || 0),
          total: Number(inv.monto_total || inv.total || 0),
          estado: inv.estado || 'ACEPTADO',
          cdrStatus:
            inv.estado === 'ACEPTADO'
              ? 'ACEPTADO_SUNAT'
              : inv.estado === 'ERROR_RED'
              ? 'FALLO_CRITICO'
              : 'EN_COLA_OUTBOX',
        } as unknown as Invoice;
      });

      return {
        data: mappedInvoices,
        total: mappedInvoices.length,
      };
    } catch (error) {
      console.error('Error al obtener comprobantes desde la API:', error);
      return { data: [], total: 0 };
    }
  },

  getInvoiceById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (dto: CreateInvoiceDto): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>('/invoices', dto);
    return response.data;
  },

  retryCdr: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/retry-cdr`);
    return response.data;
  },
};
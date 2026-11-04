import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '@/lib/axios';

export interface InvoiceRecord {
  id: string;
  serie: string;
  numero: number;
  clienteRazonSocial: string;
  clienteRuc: string;
  fechaEmision: string;
  moneda: string;
  subtotal: number;
  igv: number;
  total: number;
  cdrStatus: 'ACEPTADO_SUNAT' | 'EN_COLA_OUTBOX' | 'FALLO_CRITICO' | 'RECHAZADO_SUNAT';
  cdrCodigo?: string;
}

export const useInvoicesList = (page = 1) => {
  return useQuery({
    queryKey: ['invoices', page],
    queryFn: async () => {
      // Petición real al backend NestJS conectado a Supabase
      const response = await api.get('/invoices');
      const rawData = response.data;

      const items = Array.isArray(rawData)
        ? rawData
        : rawData?.data || rawData?.invoices || [];

      // Mapeo de la respuesta real de Supabase a los campos de la tabla
      const mappedInvoices: InvoiceRecord[] = items.map((inv: any) => {
        const ubl = inv.payload_ubl || {};
        const customer = ubl.customer || {};
        const tax = ubl.tax_details || {};

        return {
          id: inv.id,
          serie: inv.serie || 'F001',
          numero: inv.correlativo || inv.numero || 1,
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
          cdrStatus:
            inv.estado === 'ACEPTADO'
              ? 'ACEPTADO_SUNAT'
              : inv.estado === 'ERROR_RED'
              ? 'FALLO_CRITICO'
              : 'EN_COLA_OUTBOX',
          cdrCodigo: inv.cdr_codigo || null,
        };
      });

      return { data: mappedInvoices };
    },
    refetchInterval: 3000, // Reconsulta la API automáticamente cada 3 segundos
  });
};
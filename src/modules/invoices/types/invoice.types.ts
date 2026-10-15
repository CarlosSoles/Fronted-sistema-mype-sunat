export type CdrStatus =
  | 'EN_COLA_OUTBOX'
  | 'ACEPTADO_SUNAT'
  | 'FALLO_CRITICO'
  | 'RECHAZADO_SUNAT';

export interface InvoiceItem {
  id?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  igv: number;
  total: number;
}

export interface Invoice {
  id: string;
  serie: string;
  numero: string;
  clienteRuc: string;
  clienteRazonSocial: string;
  fechaEmision: string;
  moneda: 'PEN' | 'USD';
  subtotal: number;
  igv: number;
  total: number;
  cdrStatus: CdrStatus;
  cdrCodigo?: string;
  cdrMensaje?: string;
  items?: InvoiceItem[];
}

export interface CreateInvoiceDto {
  serie: string;
  clienteRuc: string;
  clienteRazonSocial: string;
  moneda: 'PEN' | 'USD';
  items: Omit<InvoiceItem, 'id' | 'subtotal' | 'igv' | 'total'>[];
}

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

/** Fila del listado tal como la devuelve el backend (TA-29, snake_case). */
export interface InvoiceListado {
  id: string;
  tipo_comprobante: string;
  serie: string;
  correlativo: number;
  /** Serie y correlativo ya formateados por el backend: F001-00000007. */
  numero: string;
  fecha_emision: string;
  estado: string;
  monto_total: number;
  moneda: string;
  cliente_documento: string | null;
  cliente_nombre: string | null;
  cdr_codigo: string | null;
  /** Montos reales del comprobante; el backend los agrega en TA-29. */
  base_imponible?: number;
  total_igv?: number;
  exonerada?: number;
  inafecta?: number;
  documento_afectado?: string | null;
  hash_cpe?: string | null;
}

/** Página de comprobantes que devuelve `GET /invoices`. */
export interface PaginaComprobantes {
  data: InvoiceListado[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Payload de alta del comprobante (POST /invoices). */
export interface CreateInvoicePayload {
  ruc_emisor: string;
  serie: string;
  correlativo: number;
  tipo_comprobante: string;
  monto_total: number;
  fecha_emision: string;
  /** Contrato del generador UBL del backend (`InvoicePayload`). */
  payload_ubl: Record<string, unknown>;
}

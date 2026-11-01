export type CdrStatus =
  | 'EN_COLA_OUTBOX'
  | 'ACEPTADO_SUNAT'
  | 'FALLO_CRITICO'
  | 'RECHAZADO_SUNAT';

/** Moneda del comprobante. */
export type Moneda = 'PEN' | 'USD';

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
  /** Número completo que asigna el backend: F001-00000007. */
  numero: string;
  clienteRuc: string;
  clienteRazonSocial: string;
  fechaEmision: string;
  moneda: Moneda;
  subtotal: number;
  igv: number;
  total: number;
  cdrStatus: CdrStatus;
  cdrCodigo?: string;
  cdrMensaje?: string;
  /**
   * SHA-256 del XML firmado que se envió a SUNAT.
   *
   * Lo devuelve el endpoint de detalle. Permite comprobar que el archivo
   * descargado es exactamente el que viajó; si falta, la pantalla lo dice en
   * lugar de mostrar un valor inventado.
   */
  hashCpe?: string;
  items?: InvoiceItem[];
  /**
   * Tipo del Catálogo 01 (01 Factura, 03 Boleta, 07 NC, 08 ND).
   *
   * TA-59: el modelo del front no contemplaba el tipo aunque el backend lo
   * devuelve siempre, así que la grilla no podía ni mostrar ni filtrar por él.
   */
  tipoComprobante: string;
  /**
   * Estado CRUDO del backend (ACEPTADO, EN_COLA, ERROR_RED...).
   *
   * Se conserva además del `cdrStatus` porque el reintento y el badge de
   * «OBSERVADO» necesitan distinguir estados que el status de CDR colapsa: un
   * comprobante OBSERVADO y uno ACEPTADO son ambos ACEPTADO_SUNAT, pero solo el
   * primero muestra el aviso.
   */
  estadoBackend?: string;
  /** ¿Admite reintento según el estado del backend? */
  reintentable?: boolean;
}

export interface CreateInvoiceDto {
  serie: string;
  clienteRuc: string;
  clienteRazonSocial: string;
  moneda: Moneda;
  items: Omit<InvoiceItem, 'id' | 'subtotal' | 'igv' | 'total'>[];
}

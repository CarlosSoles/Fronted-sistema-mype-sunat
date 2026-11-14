export interface PurchaseItemPayload {
  sku: string;
  quantity: number;
  receivedQuantity?: number;
  unitCost: number;
  description?: string;
}

export interface CreatePurchasePayload {
  supplierDocNumber: string;
  supplierName: string;
  supplierId?: string;
  documentTypeCode: string;
  documentSerial: string;
  documentNumber: string;
  issueDate: string;
  warehouseCode?: string;
  currencyCode?: string;
  responsible?: string;
  notes?: string;
  shipmentId?: string;
  items: PurchaseItemPayload[];
}

export interface PurchaseItemRecord {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  receivedQuantity?: number;
  unitCost: number;
  subtotal: number;
  igvAmount: number;
  totalAmount: number;
}

export interface PurchaseRecord {
  id: string;
  purchaseNumber: string;
  supplierDocNumber: string;
  supplierName: string;
  documentTypeCode: string;
  documentSerial: string;
  documentNumber: string;
  issueDate: string;
  createdAt?: string;
  warehouseCode: string;
  currencyCode: string;
  exchangeRate?: number;
  netAmount: number;
  igvAmount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'PENDIENTE' | 'PAGO_PARCIAL' | 'PAGADA' | 'ANULADA';
  receptionStatus?: 'PENDIENTE' | 'PARCIAL' | 'RECIBIDA';
  notes?: string | null;
  responsible?: string | null;
  itemsCount: number;
  items: PurchaseItemRecord[];
}

export interface PurchasePaymentRecord {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  bankName?: string | null;
  concept: string;
}

export interface PayPurchasePayload {
  amount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  bankName?: string;
}


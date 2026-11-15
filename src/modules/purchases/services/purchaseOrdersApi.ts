import { apiClient } from '@/lib/axios';

export interface PurchaseOrderItem { id?: string; sku: string; description?: string; quantity: number; unitCost: number; subtotal?: number; igvAmount?: number; totalAmount?: number }
export interface PurchaseOrder {
  id: string; orderNumber: string; supplierDocNumber: string; supplierName: string; warehouseCode: string;
  issueDate: string; expectedDate?: string | null; status: 'BORRADOR' | 'APROBADA' | 'ANULADA' | 'CONVERTIDA';
  pricesIncludeIgv: boolean; netAmount: number; igvAmount: number; totalAmount: number; notes?: string | null;
  convertedPurchaseId?: string | null; items: PurchaseOrderItem[];
}
export const purchaseOrdersApi = {
  list: async (): Promise<PurchaseOrder[]> => (await apiClient.get<PurchaseOrder[]>('/purchase-orders')).data,
  create: async (payload: { supplierDocNumber: string; supplierName: string; issueDate: string; expectedDate?: string; pricesIncludeIgv?: boolean; notes?: string; items: Array<{ sku: string; quantity: number; unitCost: number }> }): Promise<PurchaseOrder> => (await apiClient.post<PurchaseOrder>('/purchase-orders', payload)).data,
  approve: async (id: string): Promise<PurchaseOrder> => (await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/approve`)).data,
  cancel: async (id: string): Promise<PurchaseOrder> => (await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`)).data,
  convert: async (id: string, payload: { documentTypeCode: string; documentSerial: string; documentNumber: string; issueDate?: string }): Promise<{ order: PurchaseOrder; purchase: unknown }> => (await apiClient.post(`/purchase-orders/${id}/convert`, payload)).data,
};

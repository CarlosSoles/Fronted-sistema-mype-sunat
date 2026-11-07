/**
 * Tipos para el Libro de Inventario Permanente Valorizado (PLE 13.1 y 12.1).
 */

export type KardexOperationType =
  | '02' // Compra / Importación definitiva
  | '01' // Venta
  | '17' // Ajustes de inventario
  | '99'; // Otros

export type VoucherTypeCode = '50' | '52' | '01' | '03'; // 50 DAM / DUA, 52 Simplificada

export interface KardexMovementEntry {
  id: string;
  company_id?: string;
  movement_date: string;
  operation_type?: KardexOperationType;
  movement_type?: string;
  voucher_type?: VoucherTypeCode | string;
  voucher_series?: string;
  voucher_number?: string;
  source_reference_id?: string;
  product_code?: string;
  item_code?: string;
  product_description?: string;
  description?: string;
  unit_code?: string;
  // Sección Entradas
  quantity_in: number;
  unit_cost_in: number;
  total_cost_in: number;
  // Sección Salidas
  quantity_out: number;
  unit_cost_out: number;
  total_cost_out: number;
  // Sección Saldos Finales
  final_stock?: number;
  final_stock_quantity?: number;
  final_average_cost?: number;
  final_average_unit_cost?: number;
  final_total_value?: number;
  final_total_inventory_value?: number;
}

export interface KardexFilterParams {
  product_code?: string;
  warehouse_code?: string;
  start_date?: string;
  end_date?: string;
}

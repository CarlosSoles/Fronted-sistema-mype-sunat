export interface InventoryWarehouse {
  id: string;
  companyId: string;
  warehouseCode: string;
  sunatEstablishmentCode: string;
  description: string;
  address?: string | null;
  isActive: boolean;
}

export interface ProductSupplierRecord {
  id?: string;
  supplier_id: string;
  supplier_product_code?: string | null;
  purchase_cost?: number | null;
  currency_code?: string;
  lead_time_days?: number | null;
  is_preferred?: boolean;
  notes?: string | null;
  supplier?: {
    id: string;
    doc_number: string;
    legal_name: string;
    trade_name?: string | null;
  };
}

export interface ProductPresentationRecord {
  id?: string;
  presentation_name: string; // ej. "Caja x 50", "Caja x 100", "Fardo x 24"
  factor: number;
  sunat_unit_code?: string;
  barcode?: string | null;
  sale_price?: number | null;
  is_default?: boolean;
}

export interface ProductVariantRecord {
  id?: string;
  sku: string;
  variant_name: string;
  attribute_values?: Record<string, string> | null;
  barcode?: string | null;
  additional_cost?: number;
  price_override?: number | null;
  current_stock?: number;
  is_active?: boolean;
}

export interface BrandRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface ModelRecord {
  id: string;
  code: string;
  name: string;
  brand_name?: string | null;
  description?: string | null;
  is_active: boolean;
}

export interface CategoryRecord {
  id: string;
  code: string;
  name: string;
  sunat_code?: string | null;
  description?: string | null;
  is_active: boolean;
}

export interface ManufacturerRecord {
  id: string;
  name: string;
  country_code: string;
  website?: string | null;
  contact_info?: string | null;
  is_active: boolean;
}

export interface TagRecord {
  id: string;
  name: string;
  color?: string | null;
}

export interface SunatUnitRecord {
  code: string;
  name: string;
  symbol?: string | null;
}

export interface SunatExistenceTypeRecord {
  code: string;
  name: string;
  description: string;
}

export interface InventoryProduct {
  id: string;
  companyId: string;
  sku: string;
  description: string;
  origin_type?: 'NACIONAL' | 'IMPORTADO';
  is_service?: boolean;
  sunatTypeCode: string;
  sunatUnitCode: string;
  minStockAlert: number;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  manufacturer?: string | null;
  country_of_origin?: string | null;
  tags?: string[];
  barcode?: string | null;
  hsCode?: string | null;
  weightKg?: number | null;
  volumeM3?: number | null;
  taxAffectation?: string | null;
  cost_price?: number | null;
  sale_price?: number | null;
  wholesale_price?: number | null;
  promo_price?: number | null;
  commission_rate?: number | null;
  min_price?: number | null;
  warehouse_location?: string | null;
  isActive: boolean;
  attributes?: string[] | null;
  variants?: ProductVariantRecord[];
  suppliers?: ProductSupplierRecord[];
  presentations?: ProductPresentationRecord[];
}

export interface InventoryBalance {
  id: string;
  warehouseCode: string;
  sku: string;
  description: string;
  origin_type?: 'NACIONAL' | 'IMPORTADO';
  is_service?: boolean;
  currentStock: number;
  averageUnitCost: number;
  totalInventoryValue: number;
  sunatTypeCode?: string;
  sunatUnitCode?: string;
  minStockAlert?: number;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  manufacturer?: string | null;
  country_of_origin?: string | null;
  tags?: string[];
  barcode?: string | null;
  hsCode?: string | null;
  weightKg?: number | null;
  volumeM3?: number | null;
  taxAffectation?: string | null;
  cost_price?: number | null;
  sale_price?: number | null;
  wholesale_price?: number | null;
  promo_price?: number | null;
  commission_rate?: number | null;
  warehouse_location?: string | null;
  lastMovementAt?: string | null;
  attributes?: string[] | null;
  variants?: ProductVariantRecord[];
  suppliers?: ProductSupplierRecord[];
  presentations?: ProductPresentationRecord[];
}

export interface InventoryMovement {
  id: string;
  warehouseCode: string;
  sku: string;
  description: string;
  movementNumber: string;
  movementDate: string;
  operationTypeCode: string;
  documentTypeCode?: string | null;
  documentSerial?: string | null;
  documentNumber?: string | null;
  direction: 'ENTRADA' | 'SALIDA';
  quantity: number;
  unitCost: number;
  totalCost: number;
  previousStock: number;
  resultingStock: number;
  resultingAverageCost: number;
  resultingTotalValue: number;
  sourceReferenceId?: string | null;
  notes?: string | null;
}

export interface InventoryBookObligation {
  id?: string;
  companyId: string;
  fiscalYear: number;
  annualRevenueUit: number;
  taxRegime: string;
  ple12_1Status: 'OBLIGATORIO' | 'EXCEPTUADO' | 'VOLUNTARIO';
  ple13_1Status: 'OBLIGATORIO' | 'EXCEPTUADO' | 'VOLUNTARIO';
  legalBasisNotes?: string | null;
  evaluatedAt?: string;
}

export interface StockSummaryResponse {
  totalValuationPen: number;
  totalItemsCount: number;
  balances: InventoryBalance[];
}

export interface KardexLedgerResponse {
  costMethod?: 'PROMEDIO' | 'FIFO';
  product: {
    id: string;
    sku: string;
    description: string;
    sunatTypeCode: string;
    sunatUnitCode: string;
  };
  summary?: {
    totalStock: number;
    averageCost: number;
    totalValuation: number;
    warehouseBalances?: Array<{
      warehouseCode: string;
      warehouseDescription?: string;
      stock: number;
      averageCost: number;
      totalValue: number;
    }>;
  };
  movements: InventoryMovement[];
}

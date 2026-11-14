import { apiClient } from '@/lib/axios';
import {
  type StockSummaryResponse,
  type KardexLedgerResponse,
  type InventoryMovement,
  type InventoryBookObligation,
  type ProductVariantRecord,
} from '../types/inventory.types';
import { type ProductFormData } from '../validators/productSchema';
import { type ManualMovementFormData } from '../validators/manualMovementSchema';
import { type PleEvaluationFormData, type PleExportFormData } from '../validators/pleExportSchema';

export const inventoryApi = {
  /**
   * Obtiene el resumen de existencias valorizadas multialmacén de la empresa directamente desde la BD.
   */
  getStockBalances: async (): Promise<StockSummaryResponse> => {
    const response = await apiClient.get<StockSummaryResponse>('/inventory/stocks');
    return response.data ?? { totalValuationPen: 0, totalItemsCount: 0, balances: [] };
  },

  /**
   * Obtiene todos los productos y servicios activos registrados en la empresa.
   */
  getAllProducts: async (options?: { includeServices?: boolean }): Promise<Array<{
    id: string;
    sku: string;
    description: string;
    isService: boolean;
    isInventory: boolean;
    unitCode: string;
    costPrice?: number;
    salePrice?: number;
  }>> => {
    const params = options?.includeServices === false ? { includeServices: 'false' } : {};
    const response = await apiClient.get('/inventory/stocks/products', { params });
    return response.data || [];
  },

  /**
   * Registra un nuevo producto en el catálogo maestro y BD.
   */
  registerProduct: async (payload: ProductFormData) => {
    const response = await apiClient.post('/inventory/stocks/products', payload);
    return response.data;
  },

  /**
   * Obtiene la ficha técnica y detalle completo de un producto por SKU desde la BD.
   */
  getProductBySku: async (sku: string) => {
    const response = await apiClient.get(`/inventory/stocks/products/${encodeURIComponent(sku.trim())}`);
    return response.data;
  },

  /**
   * Actualiza los datos y ficha técnica de un producto por SKU en la BD.
   */
  updateProduct: async (sku: string, payload: Partial<ProductFormData>) => {
    const response = await apiClient.patch(
      `/inventory/stocks/products/${encodeURIComponent(sku.trim())}`,
      payload
    );
    return response.data;
  },

  /**
   * Elimina o inactiva un producto del catálogo de inventario con validación de Kardex.
   */
  deleteProduct: async (sku: string): Promise<{ action: 'DEACTIVATED' | 'DELETED'; message: string }> => {
    const response = await apiClient.delete(
      `/inventory/stocks/products/${encodeURIComponent(sku.trim())}`
    );
    return response.data;
  },

  /**
   * Obtiene el libro mayor de Kardex valorizado real para un producto específico desde la BD.
   */
  getKardexBySku: async (
    sku: string,
    params?: { start_date?: string; end_date?: string; metodo?: 'PROMEDIO' | 'FIFO' }
  ): Promise<KardexLedgerResponse> => {
    const response = await apiClient.get<KardexLedgerResponse>(
      `/inventory/stocks/kardex/${encodeURIComponent(sku.trim())}`,
      { params }
    );
    return response.data;
  },

  /**
   * Registra una entrada o salida manual de inventario en la BD.
   */
  createManualMovement: async (payload: ManualMovementFormData) => {
    const response = await apiClient.post('/inventory/movements', payload);
    return response.data;
  },

  /**
   * Lista el historial cronológico de movimientos reales de la empresa desde la BD.
   */
  listMovements: async (
    params?: { start_date?: string; end_date?: string; metodo?: 'PROMEDIO' | 'FIFO' }
  ): Promise<{ total: number; items: InventoryMovement[] }> => {
    const response = await apiClient.get<{ total: number; items: InventoryMovement[] }>(
      '/inventory/movements',
      { params }
    );
    return response.data ?? { total: 0, items: [] };
  },

  /**
   * Evalúa la obligatoriedad jurídica según Art. 35 Reglamento LIR en el backend.
   */
  evaluateObligation: async (
    payload: PleEvaluationFormData
  ): Promise<InventoryBookObligation> => {
    const response = await apiClient.post<InventoryBookObligation>(
      '/inventory/ple/evaluate',
      payload
    );
    return response.data;
  },

  /**
   * Consulta la evaluación de obligatoriedad guardada para un año fiscal en la BD.
   */
  getObligationByYear: async (
    year: number
  ): Promise<InventoryBookObligation | null> => {
    try {
      const response = await apiClient.get<InventoryBookObligation | null>(
        `/inventory/ple/obligation/${year}`
      );
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Descarga el archivo plano de Libro Electrónico PLE 12.1 o 13.1 generado por el backend.
   */
  exportPleBook: async (
    payload: PleExportFormData
  ): Promise<{ blob: Blob; fileName: string; recordsCount: number }> => {
    const response = await apiClient.post('/inventory/ple/export', payload, {
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const fileName = match
      ? match[1]
      : `LE${payload.fiscal_year}00${payload.book_type === '12.1' ? '120100' : '130100'}001111.txt`;
    const recordsCount = Number(response.headers['x-records-count'] || 0);
    return {
      blob: response.data,
      fileName,
      recordsCount,
    };
  },

  // --------------------------------------------------------------------------
  // Fase 2: Mantenedores Oficiales SUNAT y Catálogos Maestros
  // --------------------------------------------------------------------------
  getUnits: async (): Promise<Array<{ code: string; name: string; symbol?: string }>> => {
    const response = await apiClient.get('/inventory/catalogs/units');
    return response.data;
  },

  getExistenceTypes: async (): Promise<Array<{ code: string; name: string; description: string }>> => {
    const response = await apiClient.get('/inventory/catalogs/existence-types');
    return response.data;
  },

  getBrands: async (): Promise<Array<{ id: string; code: string; name: string; description?: string }>> => {
    const response = await apiClient.get('/inventory/catalogs/brands');
    return response.data;
  },

  createBrand: async (data: { name: string; code?: string; description?: string }) => {
    const response = await apiClient.post('/inventory/catalogs/brands', data);
    return response.data;
  },

  updateBrand: async (id: string, data: { name?: string; code?: string; description?: string }) => {
    const response = await apiClient.put(`/inventory/catalogs/brands/${id}`, data);
    return response.data;
  },

  deleteBrand: async (id: string) => {
    const response = await apiClient.delete(`/inventory/catalogs/brands/${id}`);
    return response.data;
  },

  getModels: async (): Promise<Array<{ id: string; code: string; name: string; brand_name?: string; description?: string }>> => {
    const response = await apiClient.get('/inventory/catalogs/models');
    return response.data;
  },

  createModel: async (data: { name: string; code?: string; brand_name?: string; description?: string }) => {
    const response = await apiClient.post('/inventory/catalogs/models', data);
    return response.data;
  },

  updateModel: async (id: string, data: { name?: string; code?: string; brand_name?: string; description?: string }) => {
    const response = await apiClient.put(`/inventory/catalogs/models/${id}`, data);
    return response.data;
  },

  deleteModel: async (id: string) => {
    const response = await apiClient.delete(`/inventory/catalogs/models/${id}`);
    return response.data;
  },

  getCategories: async (): Promise<Array<{ id: string; code: string; name: string; sunat_code?: string; description?: string }>> => {
    const response = await apiClient.get('/inventory/catalogs/categories');
    return response.data;
  },

  createCategory: async (data: { name: string; code?: string; sunat_code?: string; description?: string }) => {
    const response = await apiClient.post('/inventory/catalogs/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: { name?: string; code?: string; sunat_code?: string; description?: string }) => {
    const response = await apiClient.put(`/inventory/catalogs/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string) => {
    const response = await apiClient.delete(`/inventory/catalogs/categories/${id}`);
    return response.data;
  },

  getManufacturers: async (): Promise<Array<{ id: string; name: string; country_code: string; website?: string; contact_info?: string }>> => {
    const response = await apiClient.get('/inventory/catalogs/manufacturers');
    return response.data;
  },

  createManufacturer: async (data: { name: string; country_code?: string; website?: string; contact_info?: string }) => {
    const response = await apiClient.post('/inventory/catalogs/manufacturers', data);
    return response.data;
  },

  updateManufacturer: async (id: string, data: { name?: string; country_code?: string; website?: string; contact_info?: string }) => {
    const response = await apiClient.put(`/inventory/catalogs/manufacturers/${id}`, data);
    return response.data;
  },

  deleteManufacturer: async (id: string) => {
    const response = await apiClient.delete(`/inventory/catalogs/manufacturers/${id}`);
    return response.data;
  },

  getTags: async (): Promise<Array<{ id: string; name: string; color?: string }>> => {
    const response = await apiClient.get('/inventory/catalogs/tags');
    return response.data;
  },

  createTag: async (data: { name: string; color?: string }) => {
    const response = await apiClient.post('/inventory/catalogs/tags', data);
    return response.data;
  },

  updateTag: async (id: string, data: { name?: string; color?: string }) => {
    const response = await apiClient.put(`/inventory/catalogs/tags/${id}`, data);
    return response.data;
  },

  deleteTag: async (id: string) => {
    const response = await apiClient.delete(`/inventory/catalogs/tags/${id}`);
    return response.data;
  },

  getAuthorizedResponsibles: async (): Promise<{
    users: Array<{ id: string; name: string; role: string; email: string; type: string }>;
    transporters: Array<{ id: string; name: string; role: string; type: string }>;
  }> => {
    const response = await apiClient.get('/inventory/catalogs/responsibles');
    return response.data;
  },

  // --------------------------------------------------------------------------
  // Fase 4: Configuración de Costeo y Recálculo Integral (Obs 21, 22, 23)
  // --------------------------------------------------------------------------
  getCostConfig: async (): Promise<{
    currentMethod: 'PROMEDIO' | 'FIFO';
    companyRuc: string;
    companyName: string;
    productsCount: number;
    warehousesCount: number;
    movementsCount: number;
    totalInventoryValuePen: number;
    lastRecalculatedAt: string | null;
  }> => {
    const response = await apiClient.get('/inventory/kardex/config');
    return response.data;
  },

  updateCostMethod: async (method: 'PROMEDIO' | 'FIFO'): Promise<{ success: boolean; method: string; message: string }> => {
    const response = await apiClient.post('/inventory/kardex/config/method', { method });
    return response.data;
  },

  recalculateCosting: async (method?: 'PROMEDIO' | 'FIFO'): Promise<{
    success: boolean;
    method: 'PROMEDIO' | 'FIFO';
    productsCount: number;
    movementsCount: number;
    previousValuationPen: number;
    newValuationPen: number;
    differencePen: number;
    recalculatedAt: string;
  }> => {
    const response = await apiClient.post('/inventory/kardex/config/recalculate', { method });
    return response.data;
  },

  // --------------------------------------------------------------------------
  // Variantes de Producto y Atributos de Artículo
  // --------------------------------------------------------------------------
  getProductVariants: async (sku: string): Promise<ProductVariantRecord[]> => {
    const response = await apiClient.get<ProductVariantRecord[]>(
      `/inventory/stocks/products/${encodeURIComponent(sku.trim())}/variants`
    );
    return response.data;
  },

  addProductVariant: async (sku: string, payload: Partial<ProductVariantRecord>): Promise<ProductVariantRecord> => {
    const response = await apiClient.post<ProductVariantRecord>(
      `/inventory/stocks/products/${encodeURIComponent(sku.trim())}/variants`,
      payload
    );
    return response.data;
  },

  deleteProductVariant: async (sku: string, variantId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(
      `/inventory/stocks/products/${encodeURIComponent(sku.trim())}/variants/${variantId}`
    );
    return response.data;
  },
};

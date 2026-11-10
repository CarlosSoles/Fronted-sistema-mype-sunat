import { z } from 'zod';

export const productSupplierSchema = z.object({
  supplier_id: z.string().min(1, 'El proveedor es obligatorio'),
  supplier_product_code: z.string().optional(),
  purchase_cost: z.number().min(0).optional(),
  currency_code: z.string().optional(),
  lead_time_days: z.number().int().min(0).optional(),
  is_preferred: z.boolean().optional(),
  notes: z.string().optional(),
});

export const productPresentationSchema = z.object({
  presentation_name: z.string().min(1, 'Nombre de presentación obligatorio'),
  factor: z.number().min(0.0001, 'El factor debe ser mayor a 0'),
  sunat_unit_code: z.string().optional(),
  barcode: z.string().optional(),
  sale_price: z.number().min(0).optional(),
  is_default: z.boolean().optional(),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().optional(),
  variant_name: z.string().min(1, 'Nombre de la variante obligatorio'),
  attribute_values: z.record(z.string(), z.string()).optional(),
  barcode: z.string().optional(),
  additional_cost: z.number().optional(),
  price_override: z.number().optional(),
  current_stock: z.number().optional(),
  is_active: z.boolean().optional(),
});

export const productSchema = z.object({
  sku: z.string().min(2, 'El SKU debe tener al menos 2 caracteres'),
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
  origin_type: z.enum(['NACIONAL', 'IMPORTADO']).optional(),
  is_service: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sunat_type_code: z.string().optional(),
  sunat_unit_code: z.string().optional(),
  min_stock_alert: z.number().min(0, 'El stock mínimo no puede ser negativo').optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  country_of_origin: z.string().optional(),
  tags: z.array(z.string()).optional(),
  barcode: z.string().optional(),
  hs_code: z.string().optional(),
  weight_kg: z.number().optional(),
  volume_m3: z.number().optional(),
  tax_affectation: z.string().optional(),
  cost_price: z.number().optional(),
  sale_price: z.number().optional(),
  wholesale_price: z.number().optional(),
  promo_price: z.number().optional(),
  commission_rate: z.number().optional(),
  min_price: z.number().optional(),
  warehouse_location: z.string().optional(),
  attributes: z.array(z.string()).optional(),
  variants: z.array(productVariantSchema).optional(),
  suppliers: z.array(productSupplierSchema).optional(),
  presentations: z.array(productPresentationSchema).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

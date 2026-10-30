import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(2, 'El SKU debe tener al menos 2 caracteres'),
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
  sunat_type_code: z.string().optional(),
  sunat_unit_code: z.string().optional(),
  min_stock_alert: z.number().min(0, 'El stock mínimo no puede ser negativo').optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;


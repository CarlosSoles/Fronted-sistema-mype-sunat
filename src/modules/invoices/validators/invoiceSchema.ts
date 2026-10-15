import { z } from 'zod';

export const invoiceItemSchema = z.object({
  descripcion: z.string().min(2, { message: 'La descripción es obligatoria' }),
  cantidad: z.number().positive({ message: 'La cantidad debe ser mayor a 0' }),
  precioUnitario: z.number().positive({ message: 'El precio unitario debe ser mayor a 0' }),
});

export const invoiceSchema = z.object({
  serie: z.string().regex(/^[FB][A-Z0-9]{3}$/, {
    message: 'La serie debe iniciar con F o B seguido de 3 caracteres alfanuméricos (ej. F001)',
  }),
  clienteRuc: z.string().regex(/^(10|15|17|20)\d{9}$/, {
    message: 'El RUC debe tener 11 dígitos numéricos válidos',
  }),
  clienteRazonSocial: z.string().min(3, {
    message: 'La Razón Social del receptor debe tener al menos 3 caracteres',
  }),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  items: z.array(invoiceItemSchema).min(1, {
    message: 'La factura debe contener al menos un producto o servicio',
  }),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

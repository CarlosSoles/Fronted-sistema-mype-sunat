import { z } from 'zod';

export const sirePeriodSchema = z.object({
  periodo: z.string().regex(/^\d{6}$/, {
    message: 'El período fiscal SIRE debe tener formato AAAAMM (ej. 202610)',
  }),
  tipoRegistro: z.enum(['VENTAS_RVIE', 'COMPRAS_RCE']),
});

export type SirePeriodFormData = z.infer<typeof sirePeriodSchema>;

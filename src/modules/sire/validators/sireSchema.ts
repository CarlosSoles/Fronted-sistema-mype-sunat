import { z } from 'zod';

export const sirePeriodSchema = z.object({
  period: z.string().regex(/^\d{4}(0[1-9]|1[0-2])$/, {
    message: 'El período fiscal SIRE debe tener formato YYYYMM con mes entre 01 y 12',
  }),
  bookType: z.enum(['RVIE_VENTAS', 'RCE_COMPRAS']),
});

export const sireSchema = sirePeriodSchema;

export type SirePeriodFormData = z.infer<typeof sireSchema>;

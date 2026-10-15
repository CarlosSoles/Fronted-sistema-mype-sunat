import { z } from 'zod';

export const movementSchema = z.object({
  cuentaContable: z.string().regex(/^\d{2,6}$/, {
    message: 'La cuenta contable debe tener entre 2 y 6 dígitos del PCGE',
  }),
  denominacion: z.string().min(2, { message: 'La denominación es obligatoria' }),
  debe: z.number().min(0),
  haber: z.number().min(0),
});

export const accountingEntrySchema = z
  .object({
    glosa: z.string().min(5, { message: 'La glosa o concepto debe tener al menos 5 caracteres' }),
    fechaContable: z.string().min(10, { message: 'Fecha contable requerida' }),
    movimientos: z.array(movementSchema).min(2, {
      message: 'Un asiento contable debe tener al menos 2 cuentas (partida doble)',
    }),
  })
  .refine(
    (data) => {
      const totalDebe = data.movimientos.reduce((acc, m) => acc + m.debe, 0);
      const totalHaber = data.movimientos.reduce((acc, m) => acc + m.haber, 0);
      return Math.abs(totalDebe - totalHaber) < 0.01;
    },
    {
      message: 'Principio de Partida Doble: El Total Debe debe ser exactamente igual al Total Haber',
      path: ['movimientos'],
    }
  );

export type AccountingEntryFormData = z.infer<typeof accountingEntrySchema>;

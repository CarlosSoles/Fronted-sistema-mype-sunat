import { z } from 'zod';

export const duaCalculatorSchema = z.object({
  numeroDua: z.string().min(6, { message: 'El número de DUA/DAM debe ser válido (ej. 118-2026-10-123456)' }),
  valorFob: z.number().positive({ message: 'El valor FOB debe ser mayor a 0' }),
  flete: z.number().min(0, { message: 'El flete no puede ser negativo' }),
  seguro: z.number().min(0, { message: 'El seguro no puede ser negativo' }),
  tasaAdValorem: z.number().min(0).max(30, { message: 'La tasa Ad-Valorem debe ser entre 0% y 30%' }),
  aplicaPercepcion: z.boolean().default(true),
  tasaPercepcion: z.number().default(3.5),
});

export type DuaFormData = z.infer<typeof duaCalculatorSchema>;

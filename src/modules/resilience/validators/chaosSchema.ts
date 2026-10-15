import { z } from 'zod';

export const chaosScenarioSchema = z.object({
  simulateSunatDown: z.boolean().default(false),
  simulateHighLatency: z.boolean().default(false),
  latencyMs: z
    .number()
    .min(0, { message: 'La latencia no puede ser negativa' })
    .max(30000, { message: 'La latencia máxima permitida es 30,000 ms (30 segundos)' })
    .default(0),
});

export type ChaosScenarioFormData = z.infer<typeof chaosScenarioSchema>;

import { useMutation } from '@tanstack/react-query';
import { customsApi } from '../services/customsApi';
import { calculateCustomsTaxes } from '../lib/customsCalculations';
import {
  type CalculateDuaPayload,
  type DuaCalculationResult,
} from '../types/customs.types';

export const useDuaCalculator = () => {
  return useMutation<DuaCalculationResult, Error, CalculateDuaPayload>({
    mutationFn: async (input: CalculateDuaPayload) => {
      try {
        return await customsApi.calculateDua(input);
      } catch {
        // Fallback resiliente: cálculo normativo local instantáneo
        return calculateCustomsTaxes(input);
      }
    },
  });
};

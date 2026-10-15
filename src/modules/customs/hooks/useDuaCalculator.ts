import { useMutation } from '@tanstack/react-query';
import { customsApi } from '../services/customsApi';
import { type DuaCalculationResult, type DuaInput } from '../types/customs.types';

export const useDuaCalculator = () => {
  return useMutation<DuaCalculationResult, Error, DuaInput>({
    mutationFn: async (input: DuaInput) => {
      // Cálculo inmediato cliente + validación en backend
      try {
        return await customsApi.calculateDua(input);
      } catch {
        // Fallback resiliente: cálculo normativo local de Casilla 4
        const valorCif = input.valorFob + input.flete + input.seguro;
        const adValorem = valorCif * (input.tasaAdValorem / 100);
        const baseImponibleIgv = valorCif + adValorem;
        const igvAduanero = baseImponibleIgv * 0.16;
        const ipmAduanero = baseImponibleIgv * 0.02;
        const tributosAntesPercepcion = adValorem + igvAduanero + ipmAduanero;
        const percepcionMonto = input.aplicaPercepcion
          ? (valorCif + tributosAntesPercepcion) * ((input.tasaPercepcion || 3.5) / 100)
          : 0;

        return {
          valorCif,
          adValorem,
          igvAduanero,
          ipmAduanero,
          percepcionMonto,
          totalTributosAduaneros: tributosAntesPercepcion + percepcionMonto,
          costoTotalLandedCost: valorCif + tributosAntesPercepcion + percepcionMonto,
        };
      }
    },
  });
};

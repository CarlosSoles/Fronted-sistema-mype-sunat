import { validateRucModulo11 } from '@/modules/auth/validators/rucValidator';
import { SIRE_BOOK_CODES, type SireBookCode } from '../types/sire.types';

export const getPeriodFeedback = (period: string): string | null => {
  if (!period) return 'El período es obligatorio y debe tener formato YYYYMM.';
  if (!/^\d{6}$/.test(period)) return 'Use el formato YYYYMM, por ejemplo 202610.';
  if (period.slice(0, 4) === '0000') return 'Ingresa un periodo válido con formato YYYYMM.';
  const month = Number(period.slice(4));
  return month < 1 || month > 12 ? 'El mes debe estar entre 01 y 12.' : null;
};

export const getRucFeedback = (ruc: string): string | null => {
  if (!ruc) return 'Ingrese el RUC de 11 dígitos.';
  if (!/^\d{11}$/.test(ruc)) return 'El RUC debe contener 11 dígitos numéricos.';
  return validateRucModulo11(ruc) ? null : 'El RUC no supera la validación del dígito verificador Módulo 11.';
};

export const getAmountFeedback = (amount: string): string | null => {
  if (!amount || !Number.isFinite(Number(amount))) return 'Ingrese un importe numérico.';
  return /^\d+(?:\.\d{1,2})?$/.test(amount)
    ? null
    : 'El importe debe tener hasta 2 decimales.';
};

export const getBookCodeFeedback = (bookCode: string): string | null => {
  const value = bookCode.trim();
  if (!value) return 'El código de libro es obligatorio.';
  if (!SIRE_BOOK_CODES.includes(value as SireBookCode)) {
    return 'El código de libro debe ser 140000 (RVIE) u 080000 (RCE).';
  }
  return null;
};

export const getSolUserFeedback = (solUser: string): string | null => {
  const value = solUser.trim();
  if (!value) return 'El usuario SOL es obligatorio.';
  if (value.length > 50) return 'El usuario SOL admite hasta 50 caracteres.';
  if (/\s/.test(value)) return 'El usuario SOL no puede contener espacios.';
  return null;
};

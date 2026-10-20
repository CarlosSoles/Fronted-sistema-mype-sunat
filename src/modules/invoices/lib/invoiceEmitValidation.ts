/**
 * Validaciones del formulario de emisión de comprobantes (M1).
 *
 * TypeScript puro: sin React. Se aísla de `InvoiceEmitModal.tsx` para mantener
 * ambos archivos por debajo del límite de líneas.
 */

/** Valida un RUC peruano con el algoritmo módulo 11. */
export const rucValido = (ruc: string): boolean => {
  if (!/^\d{11}$/.test(ruc)) return false;
  if (!ruc.startsWith('10') && !ruc.startsWith('15') && !ruc.startsWith('17') &&
    !ruc.startsWith('20')) {
    return false;
  }

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digitos = ruc.slice(0, 10).split('').map(Number);
  const suma = digitos.reduce((acc, d, i) => acc + d * pesos[i], 0);
  const resto = suma % 11;
  const verificador = 11 - resto;
  const digitoFinal = verificador === 10 ? 0 : verificador === 11 ? 1 : verificador;

  return digitoFinal === Number(ruc[10]);
};

/** Valida un DNI de 8 dígitos. */
export const dniValido = (dni: string): boolean => /^\d{8}$/.test(dni);

/** Valida el documento del cliente según el largo (RUC u DNI). */
export const documentoClienteValido = (doc: string): boolean =>
  doc.length === 11 ? rucValido(doc) : dniValido(doc);

/** Serie sugerida para cada tipo de comprobante. */
export const SERIES_POR_TIPO: Record<string, readonly string[]> = {
  '01': ['F001', 'F002'],
  '03': ['B001', 'B002'],
  '07': ['FC01', 'BC01'],
  '08': ['FD01', 'BD01'],
};

/** Motivos del Catálogo 09 (Nota de Crédito). */
export const MOTIVOS_NC = [
  { codigo: '01', descripcion: 'Anulación de la operación' },
  { codigo: '06', descripcion: 'Devolución total' },
  { codigo: '07', descripcion: 'Devolución por ítem' },
  { codigo: '13', descripcion: 'Ajustes de montos y/o fechas de pago al crédito' },
] as const;

/** Motivos del Catálogo 10 (Nota de Débito). */
export const MOTIVOS_ND = [
  { codigo: '01', descripcion: 'Intereses por mora' },
  { codigo: '02', descripcion: 'Aumento en el valor' },
  { codigo: '03', descripcion: 'Penalidades / otros conceptos' },
] as const;

/** Porcentajes de detracción SPOT disponibles (Catálogo 54). */
export const DETRACCIONES = [0, 0.04, 0.1, 0.12] as const;

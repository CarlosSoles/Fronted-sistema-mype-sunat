/**
 * Número de asiento visible.
 *
 * El backend guarda un correlativo por período (`entry_number`), pero el
 * usuario reconoce el asiento por su referencia completa: AS/2026/11/0001.
 * Se usa en el Libro Diario y en el Libro Mayor para que ambos coincidan.
 */
export const formatearNumeroAsiento = (
  numero: number | string,
  periodo: string,
): string => {
  const correlativo = (String(numero).match(/(\d+)$/)?.[1] ?? '0').padStart(4, '0');
  return `AS/${periodo.replace('-', '/')}/${correlativo}`;
};

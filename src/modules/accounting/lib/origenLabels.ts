/**
 * Nombres legibles de los orígenes de asiento (`accounting_entries.source_module`).
 *
 * El código interno NO se toca en la base: se traduce solo al mostrarlo. Los
 * valores listados abajo se confirmaron con un GROUP BY sobre la base de
 * producción (11 orígenes) más los que el código escribe aunque todavía no
 * tengan asientos.
 *
 * Si aparece un código desconocido, `etiquetaOrigen` lo hace legible igual
 * (sin guiones bajos ni mayúsculas sostenidas) y avisa por consola para que se
 * agregue al diccionario.
 */
export const ORIGEN_LABELS: Record<string, string> = {
  // Facturación
  M1_INVOICES: 'Facturación',
  INVOICES: 'Facturación',
  // Importaciones
  CUSTOMS_IMPORT: 'Importaciones',
  PURCHASES_IMPORT: 'Importaciones',
  CUSTOMS: 'Importaciones',
  // Compras
  PURCHASES: 'Compras',
  PURCHASES_RECEPTION: 'Recepción de compras',
  PURCHASES_CANCEL: 'Anulación de compras',
  SUPPLIER_CREDIT_NOTE: 'Nota de crédito de proveedor',
  MANUAL_PAYABLE: 'Cuenta por pagar manual',
  // Tesorería y gastos
  COLLECTIONS: 'Cobranzas',
  COLLECTION: 'Cobranzas',
  EXPENSES: 'Gastos',
  // Otros procesos
  INVENTORY: 'Inventario',
  SIRE: 'SIRE',
  CLOSING: 'Cierre contable',
  MIGRATION: 'Migración de saldos',
  MANUAL: 'Asiento manual',
  SYSTEM: 'Sistema',
};

/** Códigos ya avisados, para no repetir el mensaje en cada fila. */
const avisados = new Set<string>();

/**
 * Texto legible de un origen, sin exponer nunca el código crudo.
 *
 * Respaldo: `IMPORT_COSTS` → "Import costs".
 */
export const etiquetaOrigen = (codigo: string | null | undefined): string => {
  const valor = (codigo ?? '').trim();
  if (!valor) return 'Sin origen';

  const directo = ORIGEN_LABELS[valor];
  if (directo) return directo;

  if (!avisados.has(valor)) {
    avisados.add(valor);
    // Aviso único por código: sirve para completar el diccionario sin ruido.
    console.warn(`[origen] Código sin traducción: "${valor}". Agrégalo a origenLabels.ts.`);
  }

  const legible = valor.replace(/[_-]+/g, ' ').toLowerCase().trim();
  return legible.charAt(0).toUpperCase() + legible.slice(1);
};

/** ¿El asiento corresponde a una anulación? Se apoya en el prefijo ANUL. */
export const esAnulacion = (referencia: string | null | undefined): boolean =>
  Boolean(referencia && referencia.startsWith('ANUL'));

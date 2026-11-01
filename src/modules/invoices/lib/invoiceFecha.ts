/**
 * Utilidades de fecha del módulo de Facturación (M1).
 *
 * Vivían dentro de `InvoiceList.tsx`. Al retirar esa pantalla en TA-59 la
 * función se movió aquí, que es su sitio natural: es lógica de fecha, no de
 * presentación, y la usan tanto la grilla como las pruebas.
 */

/**
 * Fecha `YYYY-MM-DD` en la zona horaria del equipo, no en UTC.
 *
 * Un comprobante emitido a las 20:00 en Lima sigue siendo del mismo día
 * calendario; `toISOString()` lo habría fechado un día antes.
 */
export const fechaLocalIso = (d: Date): string => {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

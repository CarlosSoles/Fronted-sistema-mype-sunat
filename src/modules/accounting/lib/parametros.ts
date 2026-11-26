/** Parámetros tributarios usados por la guía contable. */

/**
 * Tasa de IGV vigente.
 *
 * Vive aquí, en un solo lugar, para que la guía no repita «18 %» en cada texto.
 * Cuando el sistema tenga configuración tributaria por empresa, este es el
 * único punto que habrá que cambiar por una lectura del backend.
 */
export const TASA_IGV = 0.18;

/** Importe con el que arranca el simulador de la guía. */
export const IMPORTE_EJEMPLO = 118;
/** Costo con el que arranca el simulador (independiente del precio de venta). */
export const COSTO_EJEMPLO = 70;

/** Fecha y hora legibles para la auditoría de reglas (dd/mm/aaaa hh:mm). */
export const formatearFechaHora = (valor?: string | null): string => {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

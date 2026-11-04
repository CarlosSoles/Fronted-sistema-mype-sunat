/**
 * Apartados del módulo de facturación y su ruta (TA-59).
 *
 * POR QUÉ EXISTE OTRA VEZ ESTE ARCHIVO
 *
 * Antes de TA-59 la pestaña activa se derivaba de la URL con `tabDesdeRuta()`,
 * y el menú lateral podía enlazar cada apartado. Al sustituir la pantalla demo
 * por `InvoicesListPage` se perdió esa pieza: las cuatro rutas
 * (`/invoices/facturas`, `/notas`, `/bajas`, `/monitor`) empezaron a pintar el
 * MISMO componente con la MISMA consulta, así que navegar solo cambiaba el
 * resaltado del menú.
 *
 * Aquí vive solo la LÓGICA —qué apartado corresponde a una ruta y qué tipos de
 * comprobante incluye—, sin React y sin datos demo, para poder probarla sin
 * montar nada. El componente de pestañas ya no hace falta: el menú lateral es
 * ahora la navegación.
 */

/** Los cuatro apartados del M1. */
export type ApartadoFacturacion = 'comprobantes' | 'notas' | 'bajas' | 'monitor';

/** Ruta del menú lateral asociada a cada apartado. */
export const RUTA_POR_APARTADO: Record<ApartadoFacturacion, string> = {
  comprobantes: '/invoices/facturas',
  notas: '/invoices/notas',
  bajas: '/invoices/bajas',
  monitor: '/invoices/monitor',
};

/**
 * Tipos del Catálogo 01 que se listan en cada apartado.
 *
 * `monitor` y `bajas` van vacíos a propósito: no son listados filtrados por
 * tipo sino vistas propias (cola de envío y resúmenes), y devolver una lista
 * vacía es más honesto que inventarles un filtro que no existe.
 */
export const TIPOS_POR_APARTADO: Record<ApartadoFacturacion, readonly string[]> = {
  comprobantes: ['01', '03'],
  notas: ['07', '08'],
  bajas: [],
  monitor: [],
};

/** ¿El apartado es un listado de comprobantes filtrado por tipo? */
export const esListadoPorTipo = (apartado: ApartadoFacturacion): boolean =>
  TIPOS_POR_APARTADO[apartado].length > 0;

/**
 * Traduce el tramo final de la URL a su apartado.
 *
 * Se comparan los segmentos y no la cadena entera: con la cadena entera,
 * `/invoices/facturas/` (barra final) no encajaría y caería al apartado por
 * defecto, que es justo el bug que hacía que todo se viera igual.
 */
export const apartadoDesdeRuta = (pathname: string): ApartadoFacturacion => {
  const limpio = (pathname ?? '').replace(/\/+$/, '').toLowerCase();
  const entrada = Object.entries(RUTA_POR_APARTADO).find(
    ([, ruta]) => ruta === limpio,
  );
  return (entrada?.[0] as ApartadoFacturacion) ?? 'comprobantes';
};

/** Título que se muestra en la cabecera según el apartado. */
export const TITULO_POR_APARTADO: Record<ApartadoFacturacion, string> = {
  comprobantes: 'Facturas y Boletas',
  notas: 'Notas de Crédito y Débito',
  bajas: 'Bajas y Resúmenes Diarios',
  monitor: 'Monitor Outbox y Auditoría CDR',
};

/** Descripción de la cabecera según el apartado. */
export const DESCRIPCION_POR_APARTADO: Record<ApartadoFacturacion, string> = {
  comprobantes:
    'Emisión y seguimiento de facturas (01) y boletas (03) sincronizadas con SUNAT',
  notas:
    'Notas de crédito (07) y débito (08) que ajustan comprobantes ya aceptados',
  bajas:
    'Comunicaciones de baja y resúmenes diarios de boletas enviados a SUNAT',
  monitor:
    'Cola de envío, reintentos y auditoría de las constancias CDR',
};

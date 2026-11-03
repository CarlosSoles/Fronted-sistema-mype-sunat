/**
 * ¿El comprobante falló en el envío, sin llegar nunca a SUNAT?
 *
 * POR QUÉ ESTÁ EN `lib` Y NO DENTRO DE UN COMPONENTE
 *
 * Un `ERROR_RED` es un fallo de TRANSMISIÓN: el documento no salió del
 * sistema. Un `RECHAZADO` es un VEREDICTO de SUNAT: llegó y lo tiró. Son
 * estados fiscales opuestos y confundirlos afirma algo falso sobre el
 * comprobante.
 *
 * El problema es que el front no puede verlo en `estado`: `mapEstadoCdr`
 * colapsa `FALLO_CRITICO` dentro de `RECHAZADO` para que la fila salga en rojo,
 * así que a los componentes les llega "RECHAZADO" en los dos casos.
 *
 * La decisión tiene que ser UNA sola. Si el modal, la bitácora y la grilla
 * tienen cada uno su propia heurística, acaban discrepando en el borde y la
 * ficha vuelve a contradecirse consigo misma — que es exactamente el defecto
 * que se arregló el 3 nov.
 */
import type { ComprobanteDemo } from '../data/invoiceDemoSchema';

/**
 * DEUDA CONOCIDA (pendiente para después de la demo)
 *
 * La solución de raíz es añadir `SIN_CONFIRMAR` al enum `CdrStatus` y que
 * `MAPA_ESTADOS` deje de meter `ERROR_RED` en `FALLO_CRITICO` (que hoy se
 * rotula "En Cola DLQ" en la grilla, otra etiqueta engañosa). Eso obliga a
 * revisar badge, filtros y conteos, y se decidió no abrirlo antes de la
 * presentación. Mientras tanto esta función es el único punto de verdad y
 * todos los textos condicionales deben pasar por ella, no por `estado`.
 */
export const esErrorDeRed = (c: ComprobanteDemo): boolean =>
  c.estadoBackend === 'ERROR_RED' ||
  // Respaldo por si la fila llega sin el estado crudo del backend: la
  // descripción solo habla de "no llegó a SUNAT" cuando la escribió el
  // backend para un fallo de transmisión.
  (!c.cdrCodigo &&
    !c.ultimoErrorCodigo &&
    (c.cdrDescripcion?.includes('No llegó a SUNAT') ?? false));

/** Rótulo del estado fiscal de un comprobante, con su lectura en claro. */
export const LECTURA_ERROR_RED =
  'No llegó a SUNAT: el envío falló por un error de red. SUNAT no lo evaluó, así que no hay rechazo ni aceptación.';

/**
 * Cálculo del siguiente correlativo de una serie.
 *
 * El backend no expone un endpoint de "próximo correlativo": se deriva del
 * listado filtrado por serie. Se aísla aquí para poder probarlo sin montar la
 * pantalla y para que la regla tenga un único dueño.
 */
export interface ComprobanteConCorrelativo {
  serie: string;
  correlativo: number;
}

/**
 * Siguiente número de la serie, o 1 si todavía no hay comprobantes.
 *
 * Ignora otras series y valores no numéricos: el listado puede traer filas de
 * otro talón cuando el filtro no llega al backend.
 */
export function siguienteCorrelativo(
  comprobantes: readonly ComprobanteConCorrelativo[],
  serie: string,
): number {
  const numeros = comprobantes
    .filter((c) => c.serie === serie)
    .map((c) => Number(c.correlativo))
    .filter((n) => Number.isFinite(n) && n > 0);

  return numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
}

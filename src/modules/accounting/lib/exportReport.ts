/**
 * Exportación de reportes.
 *
 * Se optó por CSV y PDF-del-navegador en lugar de "Imprimir":
 * - CSV abre en Excel y sirve para revisar o adjuntar.
 * - El PDF sale de la propia vista de impresión, sin depender de la impresora.
 *
 * Sin librerías externas: no suma peso al bundle y funciona offline.
 */

/** Descarga una tabla como CSV (Excel en español: separador `;` y BOM). */
export function descargarCsv(nombre: string, filas: (string | number)[][]): void {
  const escapar = (valor: string | number): string => {
    const texto = String(valor ?? '');
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const contenido = filas.map((fila) => fila.map(escapar).join(';')).join('\r\n');
  // El BOM hace que Excel respete los acentos del archivo.
  const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre.endsWith('.csv') ? nombre : `${nombre}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/**
 * Abre el diálogo de impresión, donde el usuario puede elegir "Guardar como PDF".
 * Los elementos marcados con `print:hidden` no salen en el documento.
 */
export function descargarPdf(): void {
  window.print();
}

/** Importe con dos decimales para los reportes. */
export const monto = (valor: number): string =>
  `S/ ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Importe sin prefijo, útil en celdas de tabla. */
export const importe = (valor: number): string =>
  valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

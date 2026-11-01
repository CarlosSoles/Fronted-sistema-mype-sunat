/**
 * Descarga real de documentos desde el backend (M1).
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 *
 * El modal de auditoría "descargaba" los documentos generándolos EN EL
 * NAVEGADOR con `generarXmlUbl21Comprobante` / `descargarPdfComprobante`. Ese
 * XML no es el que se envió a SUNAT: es una reconstrucción a partir de los datos
 * de la grilla. Entregarle al usuario un archivo con el nombre del comprobante
 * que no es el documento fiscal es peor que no darle nada, porque parece lo que
 * no es.
 *
 * El backend ya tenía `GET /invoices/:id/{xml,pdf,cdr}` devolviendo el archivo
 * de verdad (el firmado, el PDF con QR y el CDR que respondió SUNAT). Aquí se
 * dispara esa descarga desde el navegador.
 */
import { invoicesApi } from '../services/invoicesApi';

/** Formato descargable. */
export type FormatoDescarga = 'xml' | 'pdf' | 'cdr';

/**
 * Pide el documento al backend y lo guarda con su nombre real.
 *
 * Lanza si el backend responde error, para que el llamador muestre el motivo
 * (por ejemplo, un comprobante PENDIENTE todavía no tiene CDR) en lugar de bajar
 * un archivo vacío.
 */
export const descargarDesdeBackend = async (
  comprobanteId: string,
  formato: FormatoDescarga,
): Promise<void> => {
  const { blob, nombre } = await invoicesApi.descargarDocumento(
    comprobanteId,
    formato,
  );

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  // Sin revocar la URL el blob se queda en memoria mientras la pestaña viva.
  URL.revokeObjectURL(url);
};

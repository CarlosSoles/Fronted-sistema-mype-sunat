import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '../services/invoicesApi';

/**
 * Comprobantes de la EMPRESA para reconocer el origen de una nota (M1).
 *
 * POR QUÉ NO SIRVE LA GRILLA DE LA PÁGINA
 *
 * El buscador del documento afectado operaba sobre `existentes`, que la pantalla
 * llenaba con las filas del apartado abierto. Eso funciona solo por casualidad:
 * desde «Facturas y Boletas» la grilla trae facturas y el número se reconoce,
 * pero desde «Notas de Crédito y Débito» la grilla trae NOTAS —y además el
 * backend la filtra por tipo 07—, así que ninguna factura podía encontrarse
 * jamás. El usuario tecleaba `F001-00000045`, el modal respondía "No existe el
 * comprobante ... en esta empresa", y era falso: existía.
 *
 * El origen de una nota pertenece a la EMPRESA, no a la página desde la que se
 * abrió el formulario. Por eso se pide al backend.
 *
 * `page_size` se lleva al máximo que admite la API (100 filas por página) para
 * cubrir la cartera real de una MYPE con una sola petición, y se recorre el
 * resto si hiciera falta. Si la empresa creciera más allá, lo correcto es un
 * endpoint de búsqueda por número; queda anotado como deuda.
 */
const TAMANO_PAGINA = 100;
/** Tope defensivo: 10 páginas = 1000 comprobantes. */
const MAX_PAGINAS = 10;

const traerTodas = async () => {
  const primera = await invoicesApi.getInvoices(1, {
    page_size: TAMANO_PAGINA,
  });
  const total = primera.totalPages ?? 1;
  if (total <= 1) return primera.data;

  const paginas = Math.min(total, MAX_PAGINAS);
  const restantes = await Promise.all(
    Array.from({ length: paginas - 1 }, (_, i) =>
      invoicesApi.getInvoices(i + 2, { page_size: TAMANO_PAGINA }),
    ),
  );
  return [primera, ...restantes].flatMap((p) => p.data);
};

/**
 * Todos los comprobantes de la empresa.
 *
 * Se cachea aparte del listado (`['invoices', 'empresa']`) para que cambiar de
 * página o de filtro en la bandeja no la recalcule, y para no chocar con la
 * clave de `useInvoicesList`.
 */
export const useComprobantesDeEmpresa = (habilitado = true) =>
  useQuery({
    queryKey: ['invoices', 'empresa'],
    queryFn: traerTodas,
    staleTime: 1000 * 60 * 3,
    enabled: habilitado,
  });

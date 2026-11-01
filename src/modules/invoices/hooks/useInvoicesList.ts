import { useQuery } from '@tanstack/react-query';
import {
  invoicesApi,
  type FiltrosInvoices,
} from '../services/invoicesApi';

/**
 * Listado paginado de comprobantes.
 *
 * TA-59: acepta los filtros que el backend ya soportaba (estado, tipo, serie y
 * rango de fechas) pero que el front no enviaba. Los filtros entran en la
 * `queryKey` para que React Query no devuelva la caché de la consulta sin
 * filtrar cuando el usuario cambia un criterio.
 */
export const useInvoicesList = (page = 1, filtros: FiltrosInvoices = {}) => {
  return useQuery({
    queryKey: ['invoices', page, filtros],
    queryFn: () => invoicesApi.getInvoices(page, filtros),
    staleTime: 1000 * 60 * 3, // 3 minutos de caché
  });
};

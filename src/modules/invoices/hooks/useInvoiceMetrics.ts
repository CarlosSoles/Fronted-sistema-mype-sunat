import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '../services/invoicesApi';
import { periodoActual } from '../lib/invoiceMetricsPeriodo';

/**
 * Métricas del periodo para la barra de resumen (TA-69).
 *
 * Va en su propia consulta y no dentro de `useInvoicesList` por dos razones:
 *
 *  - las métricas son del PERIODO y la grilla es de una PÁGINA; mezclarlas
 *    haría que cada cambio de página invalide el total del mes;
 *  - cuando la barra se recarga, la grilla no debe parpadear.
 *
 * `keepPreviousData` mantiene la cifra anterior mientras llega la nueva, para
 * que el número no desaparezca al cambiar de periodo.
 */
export const useInvoiceMetrics = (periodo?: string) => {
  const clave = (periodo ?? '').trim() || periodoActual();

  return useQuery({
    queryKey: ['invoices', 'metrics', clave],
    queryFn: () => invoicesApi.getMetrics(clave),
    staleTime: 1000 * 60 * 2, // 2 minutos: el periodo cambia con cada emisión
    placeholderData: (anterior) => anterior,
  });
};

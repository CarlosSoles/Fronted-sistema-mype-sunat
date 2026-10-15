import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '../services/invoicesApi';

export const useInvoicesList = (page = 1) => {
  return useQuery({
    queryKey: ['invoices', page],
    queryFn: () => invoicesApi.getInvoices(page),
    staleTime: 1000 * 60 * 3, // 3 minutos de caché
  });
};

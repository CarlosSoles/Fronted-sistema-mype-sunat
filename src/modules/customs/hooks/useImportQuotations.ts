import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  importQuotationsApi,
  type CreateQuotationPayload,
  type AddProformaPayload,
} from '../services/importQuotationsApi';

export const useImportQuotations = (params?: { status?: string; search?: string }) => {
  return useQuery({
    queryKey: ['customs', 'quotations', params],
    queryFn: () => importQuotationsApi.listQuotations(params),
  });
};

export const useImportQuotationDetail = (id: string | null | undefined) => {
  return useQuery({
    queryKey: ['customs', 'quotation', id],
    queryFn: () => (id ? importQuotationsApi.getQuotationById(id) : null),
    enabled: Boolean(id),
  });
};

export const useCreateImportQuotation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateQuotationPayload) => importQuotationsApi.createQuotation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs', 'quotations'] });
    },
  });
};

export const useAddProforma = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId, payload }: { quotationId: string; payload: AddProformaPayload }) =>
      importQuotationsApi.addProforma(quotationId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['customs', 'quotation', vars.quotationId] });
      queryClient.invalidateQueries({ queryKey: ['customs', 'quotations'] });
    },
  });
};

export const useAwardProforma = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId, proformaId }: { quotationId: string; proformaId: string }) =>
      importQuotationsApi.awardProforma(quotationId, proformaId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['customs', 'quotation', vars.quotationId] });
      queryClient.invalidateQueries({ queryKey: ['customs', 'quotations'] });
      queryClient.invalidateQueries({ queryKey: ['customs', 'orders'] });
    },
  });
};

export const useDeleteProforma = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId, proformaId }: { quotationId: string; proformaId: string }) =>
      importQuotationsApi.deleteProforma(quotationId, proformaId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['customs', 'quotation', vars.quotationId] });
      queryClient.invalidateQueries({ queryKey: ['customs', 'quotations'] });
    },
  });
};

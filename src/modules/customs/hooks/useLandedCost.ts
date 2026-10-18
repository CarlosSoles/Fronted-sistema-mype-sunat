import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { landedCostApi } from '../services/landedCostApi';
import {
  type AddLocalExpensePayload,
  type LandedCostSheetRecord,
  type LocalExpenseInvoiceRecord,
} from '../types';

export const useLandedCost = (shipmentId: string) => {
  const queryClient = useQueryClient();

  const expensesQuery = useQuery<LocalExpenseInvoiceRecord[]>({
    queryKey: ['landed-cost-expenses', shipmentId],
    queryFn: () => landedCostApi.getLocalExpenses(shipmentId),
    enabled: Boolean(shipmentId),
  });

  const sheetQuery = useQuery<LandedCostSheetRecord | null>({
    queryKey: ['landed-cost-sheet', shipmentId],
    queryFn: () => landedCostApi.getLandedCostSheet(shipmentId),
    enabled: Boolean(shipmentId),
  });

  const addExpenseMutation = useMutation<
    LocalExpenseInvoiceRecord,
    Error,
    AddLocalExpensePayload
  >({
    mutationFn: landedCostApi.addLocalExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landed-cost-expenses', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['landed-cost-sheet', shipmentId] });
    },
  });

  const calculateMutation = useMutation<LandedCostSheetRecord, Error, void>({
    mutationFn: () => landedCostApi.calculateLandedCost({ shipment_id: shipmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landed-cost-sheet', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['customs-shipment', shipmentId] });
    },
  });

  const applyKardexMutation = useMutation<
    { message: string; movements_count: number },
    Error,
    void
  >({
    mutationFn: () => landedCostApi.applyKardex({ shipment_id: shipmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landed-cost-sheet', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['customs-shipment', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['customs-kardex'] });
    },
  });

  return {
    expenses: expensesQuery.data ?? [],
    sheet: sheetQuery.data,
    isLoading: expensesQuery.isLoading || sheetQuery.isLoading,
    refetchExpenses: expensesQuery.refetch,
    refetchSheet: sheetQuery.refetch,
    addExpense: addExpenseMutation.mutateAsync,
    isAddingExpense: addExpenseMutation.isPending,
    calculateLandedCost: calculateMutation.mutateAsync,
    isCalculating: calculateMutation.isPending,
    applyKardex: applyKardexMutation.mutateAsync,
    isApplyingKardex: applyKardexMutation.isPending,
  };
};

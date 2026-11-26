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
    queryFn: async () => {
      return landedCostApi.getLocalExpenses(shipmentId);
    },
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
      queryClient.invalidateQueries({ queryKey: ['customs', 'landed-cost', 'eligible-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['kardex'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
    },
  });

  const approveMutation = useMutation<any, Error, string | undefined>({
    mutationFn: (notes?: string) =>
      landedCostApi.approveLandedCost({ shipmentId, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landed-cost-sheet', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['customs-shipment', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['customs', 'landed-cost', 'eligible-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['kardex'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
    },
  });

  const adjustLateCostMutation = useMutation<any, Error, any>({
    mutationFn: (payload: any) =>
      landedCostApi.adjustLateCost({ ...payload, shipmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landed-cost-expenses', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['landed-cost-sheet', shipmentId] });
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
    approveLandedCost: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    adjustLateCost: adjustLateCostMutation.mutateAsync,
    isAdjusting: adjustLateCostMutation.isPending,
    /** @deprecated Usar approveLandedCost en el nuevo flujo desacoplado */
    applyKardex: approveMutation.mutateAsync,
    isApplyingKardex: approveMutation.isPending,
  };
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customsShipmentsApi } from '../services/customsShipmentsApi';
import {
  type CreateShipmentPayload,
  type CustomsShipmentSummary,
  type ShipmentFilters,
} from '../types';

export const useShipments = (filters?: ShipmentFilters) => {
  const queryClient = useQueryClient();

  const shipmentsQuery = useQuery<CustomsShipmentSummary[]>({
    queryKey: ['customs-shipments', filters],
    queryFn: () => customsShipmentsApi.getShipments(filters),
  });

  const createShipmentMutation = useMutation<
    CustomsShipmentSummary,
    Error,
    CreateShipmentPayload
  >({
    mutationFn: customsShipmentsApi.createShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs-shipments'] });
    },
  });

  return {
    shipments: shipmentsQuery.data ?? [],
    isLoading: shipmentsQuery.isLoading,
    isError: shipmentsQuery.isError,
    error: shipmentsQuery.error,
    refetch: shipmentsQuery.refetch,
    createShipment: createShipmentMutation.mutateAsync,
    isCreating: createShipmentMutation.isPending,
  };
};

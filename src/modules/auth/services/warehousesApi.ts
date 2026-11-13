import { apiClient } from '@/lib/axios';

export interface WarehouseOption { warehouse_code: string; description: string; sunat_establishment_code?: string }
export interface UserWarehouseRow { id: string; email: string; fullName: string; role: string; isActive: boolean; warehouseCodes: string[] }

export const warehousesApi = {
  list: async (): Promise<WarehouseOption[]> => (await apiClient.get<WarehouseOption[]>('/auth/warehouses')).data,
  listUsers: async (): Promise<UserWarehouseRow[]> => (await apiClient.get<UserWarehouseRow[]>('/auth/users')).data,
  setUserWarehouses: async (id: string, warehouseCodes: string[]) => (await apiClient.put(`/auth/users/${id}/warehouses`, { warehouseCodes })).data as { userId: string; warehouseCodes: string[] },
};

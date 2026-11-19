import { apiClient } from '@/lib/axios';

export interface PaymentSchedule { id: string; purchaseId: string; scheduledDate: string; amount: number; status: string; notes?: string | null; paidAt?: string | null }
export interface SchedulePurchase {
  id: string; purchaseNumber: string; supplierName: string; supplierDocNumber: string; document: string;
  issueDate: string; dueDate?: string | null; total: number; paid: number; credited: number; balance: number;
  scheduledAmount: number; availableToSchedule: number; overdue: boolean; schedules: PaymentSchedule[];
}
export interface ScheduleResponse { purchases: SchedulePurchase[]; summary: { totalBalance: number; scheduled: number; overdue: number } }

export const paymentSchedulesApi = {
  list: async (): Promise<ScheduleResponse> => (await apiClient.get<ScheduleResponse>('/payment-schedules')).data,
  create: async (payload: { purchaseId: string; scheduledDate: string; amount: number; notes?: string }): Promise<PaymentSchedule> => (await apiClient.post<PaymentSchedule>('/payment-schedules', payload)).data,
  cancel: async (id: string): Promise<PaymentSchedule> => (await apiClient.delete<PaymentSchedule>(`/payment-schedules/${id}`)).data,
  updateDueDate: async (purchaseId: string, dueDate: string | null): Promise<{ purchaseId: string; dueDate: string | null }> => (await apiClient.patch(`/purchases/${purchaseId}/due-date`, { dueDate })).data,
};

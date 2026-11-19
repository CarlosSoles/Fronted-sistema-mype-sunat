import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente único de React Query.
 *
 * Polling corto + refresco al enfocar/reconectar mantiene la vista alineada
 * con la base sin depender de que el usuario recargue la página.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchInterval: 30_000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});

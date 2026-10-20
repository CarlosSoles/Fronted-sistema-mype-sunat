import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { useAuthStore } from './stores/authStore';
import {
  EMPRESA_DEMO,
  construirSesionDemo,
  usuarioDemoDisponible,
} from './modules/invoices/data/demoSession';

// Modo demostración (solo desarrollo). Se siembra el store ANTES de montar
// React: `ProtectedRoute` evalúa `isAuthenticated` en el primer render, por lo
// que cualquier hidratación posterior ya llegaría tarde y redirigiría a /login.
if (usuarioDemoDisponible()) {
  window.localStorage.setItem('sync-sunat-auth', construirSesionDemo());
  const sesion = JSON.parse(construirSesionDemo()).state;
  useAuthStore.setState({
    token: sesion.token,
    user: sesion.user,
    activeCompany: EMPRESA_DEMO,
    isAuthenticated: true,
  });
}

// Configuración global del cliente de caché de TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de caché fresca
      retry: 1, // 1 reintento automático antes de fallar
      refetchOnWindowFocus: false, // Evitar refetch innecesario al cambiar de pestaña
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

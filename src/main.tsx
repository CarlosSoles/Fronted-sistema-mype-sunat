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
//
// POR QUÉ SE RE-APLICA EN CUANTO HIDRATA
//
// Escribir el `localStorage` y llamar a `setState` antes del render NO basta:
// `persist` de zustand se hidrata de forma asíncrona al crear el store y, al
// terminar, vuelca SU copia del almacenamiento encima del estado que se acaba
// de poner. El resultado se veía así: el `localStorage` tenía
// `isAuthenticated: true` y la pantalla seguía redirigiendo a /login, porque el
// store arrancaba en `false` y la hidratación no cambiaba nada.
//
// Por eso se siembra ANTES (para el primer render) y se vuelve a aplicar en
// `onFinishHydration` (para que la hidratación no lo pise). Es idempotente: si
// no había sesión previa, deja la demo; si el usuario ya había entrado, su
// sesión es la que gana.
const sesionDemo = usuarioDemoDisponible()
  ? JSON.parse(construirSesionDemo()).state
  : null;

if (sesionDemo) {
  window.localStorage.setItem('sync-sunat-auth', construirSesionDemo());

  const aplicarSesionDemo = () => {
    // Solo se impone si el store quedó sin sesión: una sesión real iniciada
    // con el backend no debe ser reemplazada por la demo.
    if (useAuthStore.getState().isAuthenticated) return;

    useAuthStore.setState({
      token: sesionDemo.token,
      user: sesionDemo.user,
      activeCompany: EMPRESA_DEMO,
      isAuthenticated: true,
    });
  };

  aplicarSesionDemo();

  // Tras la hidratación de `persist`, que es la que llega después.
  useAuthStore.persist?.onFinishHydration?.(aplicarSesionDemo);

  // Y si ya había hidratado antes de este punto, el callback no se dispararía.
  if (useAuthStore.persist?.hasHydrated?.()) aplicarSesionDemo();
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

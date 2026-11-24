import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
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
  /**
   * ¿Ya hay una sesión REAL guardada?
   *
   * Esto es lo que faltaba y rompía todo: se escribía la sesión demo en
   * `localStorage` en CADA carga, sin mirar si el usuario había entrado con su
   * cuenta. El efecto era que, tras iniciar sesión de verdad y recargar (o
   * simplemente navegar a otra ruta, que recarga la página), su token se
   * sustituía por el `demo-token`. La app seguía funcionando con la identidad
   * equivocada y el usuario parecía "deslogueado".
   *
   * Se distingue por el token: el de la demo es literalmente 'demo-token'; uno
   * real es un JWT. Si hay un JWT, la demo NO se toca.
   */
  const guardada = (() => {
    try {
      const crudo = window.localStorage.getItem('sync-sunat-auth');
      if (!crudo) return null;
      return JSON.parse(crudo) as {
        state?: { token?: string; isAuthenticated?: boolean };
      };
    } catch {
      return null;
    }
  })();

  const haySesionReal =
    Boolean(guardada?.state?.isAuthenticated) &&
    Boolean(guardada?.state?.token) &&
    guardada?.state?.token !== 'demo-token';

  if (!haySesionReal) {
    window.localStorage.setItem('sync-sunat-auth', construirSesionDemo());
  }

  const aplicarSesionDemo = () => {
    // Se impone la demo SOLO si no hay sesión real, ni en el store ni en el
    // almacenamiento. Mirar únicamente `isAuthenticated` del store no bastaba:
    // al recargar ese valor todavía es `false` porque `persist` no ha
    // hidratado, y la demo pisaba la sesión del usuario.
    if (useAuthStore.getState().isAuthenticated) return;

    if (haySesionReal) {
      // Hay un JWT guardado: se restaura ESA sesión, no la demo.
      const usuarioGuardado = (
        guardada!.state as { user?: typeof sesionDemo.user }
      ).user;
      useAuthStore.setState({
        token: guardada!.state!.token,
        user: usuarioGuardado ?? null,
        isAuthenticated: true,
      });
      return;
    }

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

import { queryClient } from '@/lib/queryClient';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);


// Fase 0 offline: cachea el shell para abrir la app sin red.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // `update()` fuerza a buscar un sw.js nuevo en cada arranque; si el
    // navegador tenía una versión anterior controlando la página, se activa la
    // nueva en la siguiente carga en lugar de quedarse con el shell viejo.
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registro) => registro.update())
      .catch(() => undefined);
  });
}

/**
 * Actualiza la aplicación cuando se publica una versión nueva.
 *
 * El Service Worker puede dejar el shell anterior en caché y la pantalla sigue
 * mostrando la versión vieja aunque el despliegue ya esté hecho. Se compara el
 * bundle cargado con el último visto: si cambió, se borran las cachés y se
 * recarga una sola vez por sesión (la marca en `sessionStorage` evita el bucle).
 */
(() => {
  const CLAVE = 'sync-sunat-build';
  const MARCA = 'sync-sunat-recargado';
  const actual = document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src');
  if (!actual) return;

  try {
    const anterior = window.localStorage.getItem(CLAVE);
    if (!anterior) {
      window.localStorage.setItem(CLAVE, actual);
      return;
    }
    if (anterior === actual) return;

    window.localStorage.setItem(CLAVE, actual);
    if (window.sessionStorage.getItem(MARCA)) return;
    window.sessionStorage.setItem(MARCA, '1');

    const recargar = () => window.location.reload();
    if ('caches' in window) {
      caches
        .keys()
        .then((claves) => Promise.all(claves.map((clave) => caches.delete(clave))))
        .then(recargar)
        .catch(recargar);
    } else {
      recargar();
    }
  } catch {
    // Si el navegador bloquea el almacenamiento, se sigue sin actualizar.
  }
})();


// La sincronización de la outbox no bloquea el primer render.
void import('./lib/outbox').then(({ flushOutbox, startOutboxSync }) => {
  void flushOutbox();
  startOutboxSync();
});

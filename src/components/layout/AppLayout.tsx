import { useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { SunatStatusBanner } from '@/components/feedback/SunatStatusBanner';
import { ErrorBoundaryGlobal } from '@/components/feedback/ErrorBoundaryGlobal';
import { OfflineIndicator } from '@/components/feedback/OfflineIndicator';
import { useUiStore } from '@/stores/uiStore';

export const AppLayout = () => {
  const location = useLocation();
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const contenidoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMobileSidebar = () => {
      if (window.matchMedia('(max-width: 639px)').matches) setSidebarCollapsed(true);
    };

    closeMobileSidebar();
    window.addEventListener('resize', closeMobileSidebar);
    return () => window.removeEventListener('resize', closeMobileSidebar);
  }, [location.pathname, setSidebarCollapsed]);

  // Cada módulo/submódulo debe abrirse desde arriba, no conservar el scroll anterior.
  useLayoutEffect(() => {
    // El layout usa un único scroller interno; se reinician también body/html
    // por si el navegador conserva el scroll de una ruta anterior.
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const scroller = contenidoRef.current;
    if (scroller) scroller.scrollTop = 0;
  }, [location.pathname]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Sello de Resiliencia: Banner de alerta cuando SUNAT está caída */}
      <SunatStatusBanner />

      <div className="relative flex-1 flex min-h-0 overflow-hidden">
        {/* Barra lateral de navegación por módulos */}
        <Sidebar />

        {/* Contenido principal */}
        <div ref={contenidoRef} className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto">
          <Navbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <ErrorBoundaryGlobal key={location.pathname}>
              <Outlet />
            </ErrorBoundaryGlobal>
          </main>
        </div>
      </div>

      <CommandPalette />

      {/* Indicador flotante cuando no hay conexión a internet */}
      <OfflineIndicator />
    </div>
  );
};

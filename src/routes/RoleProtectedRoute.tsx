import type { ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useServerPermissions } from '@/modules/auth/hooks/useServerPermissions';
import { getPermissionHome } from './roleNavigation';

/**
 * Rutas que el frontend publica antes que el backend.
 *
 * El catálogo de menús vive en el servidor. Mientras una pantalla nueva no
 * esté ahí, `canNavigate` la niega y el usuario ve un 403 aunque la ruta y la
 * página existan. Para no bloquear el desarrollo, estas rutas se permiten si
 * el usuario puede ver su módulo.
 *
 * Cuando el backend publique la ruta, la condición del servidor manda.
 */
const RUTAS_ADELANTADAS: ReadonlyArray<{ path: string; moduleCode: string }> = [
  { path: '/accounting/guia', moduleCode: 'M4' },
];

export const RoleProtectedRoute = ({ children }: { children?: ReactNode }) => {
  const p = useServerPermissions();
  const { pathname } = useLocation();
  if (p.isLoading) return <p role="status">Consultando accesos…</p>;
  if (p.isError) return <div role="alert">No se pudieron consultar los permisos. <button type="button" onClick={() => void p.refetch()}>Reintentar</button></div>;

  const adelanto = RUTAS_ADELANTADAS.find((ruta) => ruta.path === pathname);
  const elServidorLoConoce = (p.snapshot?.menus ?? []).some((menu) => menu.path === pathname);
  const permitidoPorAdelanto = Boolean(adelanto) && !elServidorLoConoce && p.canView(adelanto!.moduleCode);

  if (!p.canNavigate(pathname) && !permitidoPorAdelanto) {
    return (
      <div id="forbidden-403-container" role="alert">
        <span>Código 403</span>
        <h1>Módulo Restringido</h1>
        <p>Rol: {p.snapshot?.role.code}</p>
        <p>No tiene permiso para consultar esta sección.</p>
        <Link to={getPermissionHome(p.homePath)}>Volver a una sección permitida</Link>
      </div>
    );
  }
  return children ? <>{children}</> : <Outlet />;
};

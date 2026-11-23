import type { ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useServerPermissions } from '@/modules/auth/hooks/useServerPermissions';
import { normalizeRoleCode } from '@/modules/auth/lib/roleCode';
import { RATE_LIMIT_MESSAGE } from '@/lib/apiErrors';
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
  { path: '/customs/quotations', moduleCode: 'M2' },
  { path: '/credenciales-empresa', moduleCode: 'M3' },
];

const normalizarRol = (role: string): string => {
  const code = normalizeRoleCode(role);
  return code === 'OPERADOR_FACTURACION' ? 'FACTURADOR' : code;
};

interface RoleProtectedRouteProps {
  children?: ReactNode;
  /** Roles permitidos; si se omite se usa solo el catálogo del servidor. */
  roles?: readonly string[];
}

export const RoleProtectedRoute = ({
  children,
  roles,
}: RoleProtectedRouteProps) => {
  const p = useServerPermissions();
  const { pathname } = useLocation();
  if (p.isLoading) return <p role="status">Consultando accesos…</p>;
  if (p.isError) {
    return (
      <div role="alert" className="mx-auto max-w-md space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">{p.errorStatus === 429 ? RATE_LIMIT_MESSAGE : 'No se pudieron consultar los permisos.'}</p>
        {p.errorStatus !== 429 && <p className="text-muted-foreground">
          Puede que el servidor esté despertando. La aplicación reintenta sola; si el problema
          continúa, pulsa el botón.
        </p>}
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          disabled={p.errorStatus === 429}
          onClick={() => void p.refetch()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const adelanto = RUTAS_ADELANTADAS.find((ruta) => ruta.path === pathname);
  const elServidorLoConoce = (p.snapshot?.menus ?? []).some((menu) => menu.path === pathname);
  const permitidoPorAdelanto = Boolean(adelanto) && !elServidorLoConoce && p.canView(adelanto!.moduleCode);
  const rolActual = normalizarRol(p.snapshot?.role.code ?? '');
  const sinPermisoRol =
    Boolean(roles?.length) &&
    !(roles ?? []).map(normalizarRol).includes(rolActual);

  if ((!p.canNavigate(pathname) && !permitidoPorAdelanto) || sinPermisoRol) {
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

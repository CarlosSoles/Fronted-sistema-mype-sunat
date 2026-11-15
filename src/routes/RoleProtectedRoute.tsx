import { type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { type Role } from '@/modules/auth/types/auth.types';
import { getDefaultRouteForRole } from './roleNavigation';
import { modulePermissionsApi } from '@/modules/auth/services/modulePermissionsApi';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RoleProtectedRouteProps {
  allowedRoles: Role[];
  children?: ReactNode;
}

/**
 * RoleProtectedRoute: Guardian de rutas que valida los privilegios del usuario (RBAC).
 * Si el rol no está autorizado, renderiza una vista amigable de 403 Forbidden
 * con opción para retornar a un módulo permitido.
 */
export const RoleProtectedRoute = ({ allowedRoles, children }: RoleProtectedRouteProps) => {
  const { user } = useAuth();
  const currentRole = user?.role;
  const location = useLocation();
  const moduloPorRuta: Array<[string, string]> = [['/invoices', 'M1'], ['/customs', 'M2'], ['/sire', 'M3'], ['/accounting', 'M4'], ['/expenses', 'M4'], ['/collections', 'M7'], ['/inventory', 'M6'], ['/purchases', 'M8'], ['/sales', 'M7'], ['/usuarios', 'M9']];
  const modulo = moduloPorRuta.find(([prefijo]) => location.pathname.startsWith(prefijo))?.[1];
  const { data: permisos = [] } = useQuery({ queryKey: ['module-permissions-me'], queryFn: modulePermissionsApi.mine, enabled: Boolean(currentRole) });
  const sinVista = currentRole !== 'ADMIN' && Boolean(modulo) && permisos.length > 0 && !permisos.find((p) => p.moduleCode === modulo)?.canView;

  // El ADMIN siempre tiene acceso a todos los módulos
  const isAuthorized =
    currentRole === 'ADMIN' || (currentRole && allowedRoles.includes(currentRole));
  const autorizado = isAuthorized && !sinVista;

  if (!autorizado) {
    return (
      <div
        id="forbidden-403-container"
        role="alert"
        aria-live="assertive"
        className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center"
      >
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4 shadow-inner">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider">
            Código 403
          </Badge>
          {currentRole && (
            <Badge variant="secondary" className="text-xs">
              Tu rol: {currentRole}
            </Badge>
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mb-2">
          Módulo Restringido
        </h1>

        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          No tienes permisos de visualización en la Matriz de módulos para ingresar a esta sección.
          Si requieres acceso, solicita una elevación de privilegios al Administrador de tu MYPE.
        </p>

        <Button asChild variant="default" className="gap-2">
          <Link to={getDefaultRouteForRole(currentRole)}>
            <ArrowLeft className="h-4 w-4" />
            Volver a mi Módulo Principal
          </Link>
        </Button>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

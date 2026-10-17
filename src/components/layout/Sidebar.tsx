import { NavLink } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { type Role } from '@/modules/auth/types/auth.types';
import { cn } from '@/lib/utils';
import {
  Activity,
  BookOpen,
  CheckSquare,
  FileText,
  Ship,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  developer: string;
  allowedRoles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Facturación UBL 2.1',
    path: '/invoices',
    icon: FileText,
    developer: 'Jhordy Salirrosas',
    allowedRoles: ['ADMIN', 'OPERADOR_FACTURACION', 'CONTADOR', 'AUDITOR', 'OPERATOR', 'ACCOUNTANT'],
  },
  {
    title: 'Aduanas DUA & Kardex',
    path: '/customs',
    icon: Ship,
    developer: 'Carlos Ahumada',
    allowedRoles: ['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT'],
  },
  {
    title: 'Conciliación SIRE',
    path: '/sire',
    icon: CheckSquare,
    developer: 'Diego Toledo',
    allowedRoles: ['ADMIN', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT'],
  },
  {
    title: 'Contabilidad PCGE',
    path: '/accounting',
    icon: BookOpen,
    developer: 'Michael Velásquez',
    allowedRoles: ['ADMIN', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT'],
  },
  {
    title: 'Resiliencia SUNAT',
    path: '/resilience',
    icon: Activity,
    badge: 'Caos',
    developer: 'Oliver Saldaña',
    allowedRoles: ['ADMIN', 'AUDITOR'],
  },
];

export const Sidebar = () => {
  const { isSidebarCollapsed } = useUiStore();
  const { user } = useAuth();
  const currentRole = user?.role;

  // Filtrado reactivo según la Matriz RBAC (especificacionAuth.md sección 7.1)
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!currentRole || currentRole === 'ADMIN') return true;
    return item.allowedRoles.includes(currentRole);
  });

  return (
    <aside
      className={cn(
        'border-r bg-card transition-all duration-300 flex flex-col shrink-0',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      )}
      aria-label="Navegación principal"
    >
      {/* Logotipo del Sistema */}
      <div className="h-14 border-b flex items-center px-4 gap-2 font-bold text-sm tracking-tight overflow-hidden">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0 shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        {!isSidebarCollapsed && (
          <span className="truncate bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            SYNC-SUNAT
          </span>
        )}
      </div>

      {/* Lista de Módulos Verticales autorizados */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={isSidebarCollapsed ? `${item.title} (${item.developer})` : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && (
              <div className="flex-1 flex items-center justify-between truncate">
                <span className="truncate">{item.title}</span>
                {currentRole === 'AUDITOR' ? (
                  <span className="text-[9px] uppercase font-bold px-1 py-0.5 rounded bg-muted text-muted-foreground">
                    Lectura
                  </span>
                ) : item.badge ? (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Pie de la barra lateral con Rol Activo */}
      {!isSidebarCollapsed && (
        <div className="p-3 border-t text-[11px] text-muted-foreground bg-muted/30">
          <p className="font-semibold text-foreground/80">SYNC-SUNAT v1.0.0</p>
          <p className="text-[10px] text-primary font-medium truncate">
            Rol: {currentRole || 'ADMIN'}
          </p>
        </div>
      )}
    </aside>
  );
};

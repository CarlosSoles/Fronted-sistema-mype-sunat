import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { type Role } from '@/modules/auth/types/auth.types';
import { cn } from '@/lib/utils';
import {
  Activity,
  BookOpen,
  Calculator,
  CheckSquare,
  ChevronDown,
  CreditCard,
  FileCheck2,
  FilePlus,
  FileMinus2,
  FileText,
  FileX2,
  FolderGit2,
  GitCompareArrows,
  History,
  LayoutDashboard,
  FileUp,
  ClipboardCheck,
  Ship,
  Sparkles,
} from 'lucide-react';

interface SubNavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  developer: string;
  allowedRoles: Role[];
  subItems?: SubNavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Facturación UBL 2.1',
    path: '/invoices',
    icon: FileText,
    developer: 'Jhordy Salirrosas',
    allowedRoles: ['ADMIN', 'OPERADOR_FACTURACION', 'CONTADOR', 'AUDITOR', 'OPERATOR', 'ACCOUNTANT'],
    subItems: [
      { title: 'Facturas y Boletas', path: '/invoices/facturas', icon: FileText },
      { title: 'Notas de Crédito y Débito', path: '/invoices/notas', icon: FileMinus2 },
      { title: 'Bajas y Resúmenes Diarios', path: '/invoices/bajas', icon: FileX2 },
      { title: 'Monitor Outbox y CDR', path: '/invoices/monitor', icon: Activity },
    ],
  },
  {
    title: 'Aduanas DUA & Kardex',
    path: '/customs',
    icon: Ship,
    developer: 'Carlos Ahumada',
    allowedRoles: ['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT'],
    subItems: [
      { title: 'Panel General', path: '/customs/dashboard', icon: LayoutDashboard },
      { title: 'Expedientes & Tracking', path: '/customs/shipments', icon: FolderGit2 },
      { title: 'Asistente DAM (DUA)', path: '/customs/declarations/new', icon: FilePlus },
      { title: 'Mesa Cobranza CDA', path: '/customs/settlements', icon: CreditCard },
      { title: 'Landed Cost (NIC 2)', path: '/customs/landed-cost', icon: Calculator },
      { title: 'Kardex PLE 13.1', path: '/customs/inventory/kardex', icon: BookOpen },
      { title: 'Auditoría SIRE 8.4', path: '/customs/reports/fiscal-sire', icon: FileCheck2 },
    ],
  },
  {
    title: 'SIRE',
    path: '/sire',
    icon: CheckSquare,
    developer: 'Diego Toledo',
    allowedRoles: ['ADMIN', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT'],
    subItems: [
      { title: 'Importar Propuesta', path: '/sire/importar', icon: FileUp },
      { title: 'Conciliación y Cruce', path: '/sire/conciliacion', icon: GitCompareArrows },
      { title: 'Resumen de Cierre', path: '/sire/cierre', icon: ClipboardCheck },
      { title: 'Historial', path: '/sire/historial', icon: History },
    ],
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
  const location = useLocation();
  const navigate = useNavigate();
  const currentRole = user?.role;

  // Control reactivo de expansión de submódulos
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    '/customs': true,
    '/sire': true,
  });

  // Auto-expandir cuando la ruta actual pertenezca al módulo
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if (
        item.subItems &&
        (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
      ) {
        setExpandedItems((prev) => ({ ...prev, [item.path]: true }));
      }
    });
  }, [location.pathname]);

  const toggleExpand = (item: NavItem) => {
    setExpandedItems((prev) => {
      const willExpand = !prev[item.path];
      // Si se expande y estamos fuera del módulo, navegar a su primera sección
      if (
        willExpand &&
        location.pathname !== item.path &&
        !location.pathname.startsWith(`${item.path}/`)
      ) {
        navigate(item.subItems?.[0]?.path ?? item.path);
      }
      return { ...prev, [item.path]: willExpand };
    });
  };

  // Filtrado reactivo según la Matriz RBAC
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
      <nav className="flex-1 p-2 space-y-1.5 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isModuleActive =
            location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          const isExpanded = Boolean(expandedItems[item.path]);

          return (
            <div key={item.path} className="space-y-1">
              {item.subItems ? (
                /* Botón unificado para módulos con desglose */
                <button
                  type="button"
                  onClick={() => toggleExpand(item)}
                  title={isSidebarCollapsed ? `${item.title} (${item.developer})` : undefined}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group text-left',
                    isModuleActive
                      ? 'bg-muted text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isModuleActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </div>

                  {!isSidebarCollapsed && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {currentRole === 'AUDITOR' ? (
                        <span className="text-[9px] uppercase font-bold px-1 py-0.5 rounded bg-muted text-muted-foreground">
                          Lectura
                        </span>
                      ) : item.badge ? (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          {item.badge}
                        </span>
                      ) : null}

                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 transition-transform duration-200',
                          isExpanded
                            ? 'rotate-180 text-primary font-bold'
                            : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />
                    </div>
                  )}
                </button>
              ) : (
                /* Enlace directo para módulos sin subapartados */
                <NavLink
                  to={item.path}
                  title={isSidebarCollapsed ? `${item.title} (${item.developer})` : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
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
              )}

              {/* Subapartados Desglosados integrados elegantemente */}
              {!isSidebarCollapsed && item.subItems && isExpanded && (
                <div className="pl-3 ml-3 border-l-2 border-border/80 space-y-0.5 py-0.5">
                  {item.subItems.map((sub) => (
                    <NavLink
                      key={sub.path}
                      to={sub.path}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                          isActive
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )
                      }
                    >
                      <sub.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{sub.title}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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

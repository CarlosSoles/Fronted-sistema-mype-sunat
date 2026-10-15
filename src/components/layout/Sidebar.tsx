import { NavLink } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';
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
}

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Facturación UBL 2.1',
    path: '/invoices',
    icon: FileText,
    developer: 'Jhordy Salirrosas',
  },
  {
    title: 'Aduanas DUA & Kardex',
    path: '/customs',
    icon: Ship,
    developer: 'Carlos Ahumada',
  },
  {
    title: 'Conciliación SIRE',
    path: '/sire',
    icon: CheckSquare,
    developer: 'Diego Toledo',
  },
  {
    title: 'Contabilidad PCGE',
    path: '/accounting',
    icon: BookOpen,
    developer: 'Michael Velásquez',
  },
  {
    title: 'Resiliencia SUNAT',
    path: '/resilience',
    icon: Activity,
    badge: 'Caos',
    developer: 'Oliver Saldaña',
  },
];

export const Sidebar = () => {
  const { isSidebarCollapsed } = useUiStore();

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

      {/* Lista de Módulos Verticales */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
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
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    {item.badge}
                  </span>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Pie de la barra lateral */}
      {!isSidebarCollapsed && (
        <div className="p-3 border-t text-[11px] text-muted-foreground bg-muted/30">
          <p className="font-semibold text-foreground/80">SYNC-SUNAT v1.0.0</p>
          <p className="text-[10px]">Arquitectura Vertical Slice</p>
        </div>
      )}
    </aside>
  );
};

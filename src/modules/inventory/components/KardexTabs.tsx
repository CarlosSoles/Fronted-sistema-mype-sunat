import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { title: 'Kardex general', path: '/kardex/general' },
  { title: 'Por producto', path: '/kardex/producto' },
];

/** Navegación única del módulo Kardex; las tres vistas son pestañas, no módulos. */
export const KardexTabs = () => (
  <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
    {TABS.map((tab) => (
      <NavLink
        key={tab.path}
        to={tab.path}
        className={({ isActive }) =>
          cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            isActive
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )
        }
      >
        {tab.title}
      </NavLink>
    ))}
  </div>
);

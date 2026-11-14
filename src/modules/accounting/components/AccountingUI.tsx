import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import { cn } from 'cn';

/**
 * Piezas de presentación del módulo de Contabilidad.
 *
 * Son solo composición visual: no consultan datos ni cambian reglas. Se usan
 * igual en el resumen, el mayor y la auditoría para que las pantallas del
 * módulo se lean como una sola aplicación.
 */

/** Tarjeta de cifra: etiqueta tenue, número grande y un icono discreto. */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const tono =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-destructive'
        : 'text-foreground';

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn('mt-2 text-2xl font-semibold tabular-nums tracking-tight', tono)}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}

/** Barra de filtros uniforme: el período a la izquierda, el estado a la derecha. */
export function Toolbar({ children, status }: { children: ReactNode; status?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-wrap items-end gap-3">{children}</div>
      {status ? <div className="flex flex-wrap items-center gap-2">{status}</div> : null}
    </Card>
  );
}

/** Acceso a un reporte: icono, título, una línea de contexto y la flecha. */
export function ReportLink({
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string;
  title: string;
  description?: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40 hover:ring-foreground/20"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}
      </span>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Encabezado de sección dentro de una pantalla. */
export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

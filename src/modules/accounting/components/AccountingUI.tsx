import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, Input } from '@/components/ui';
import { cn } from 'cn';

/**
 * Piezas de presentación del módulo de Contabilidad.
 *
 * Son solo composición visual: no consultan datos ni cambian reglas. Se usan
 * igual en el resumen, el mayor y la auditoría para que las pantallas del
 * módulo se lean como una sola aplicación.
 */

/**
 * Tamaños compartidos por todas las barras del módulo.
 *
 * Estaban repetidos en cada pantalla y se habían desviado: unas usaban h-8 y
 * otras el h-8 del design system. Ahora el valor se define una sola vez y las
 * pantallas solo lo consumen.
 */
export const ALTO_CONTROL = 'h-8';
/** Ancho estándar de un buscador de texto (320 px), fluido en pantallas angostas. */
export const ANCHO_BUSCADOR = 'w-full sm:w-80';
/** Espaciado interno de las barras de filtros. */
export const PADDING_BARRA = 'p-3';

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

/**
 * Barra de filtros uniforme.
 *
 * Todos los controles comparten altura y espaciado; el buscador usa el ancho
 * estándar. `overflow-visible` deja que los desplegables (como el buscador de
 * cuentas) se pinten fuera de la tarjeta, que el Card base recortaría.
 */
export function Toolbar({ children, status }: { children: ReactNode; status?: ReactNode }) {
  return (
    <Card className={cn('flex flex-col gap-3 overflow-visible sm:flex-row sm:items-center sm:justify-between', PADDING_BARRA)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
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

/**
 * Rango de fechas del módulo.
 *
 * Un solo componente para todas las pantallas: las etiquetas van a la izquierda
 * de cada fecha, en la misma fila, y los campos miden lo mismo en el diario, el
 * mayor y los reportes. Evita que cada página invente su propia separación.
 */
export function RangoFechas({
  desde,
  hasta,
  onDesde,
  onHasta,
  idPrefijo,
}: {
  desde: string;
  hasta: string;
  onDesde: (valor: string) => void;
  onHasta: (valor: string) => void;
  idPrefijo: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground" htmlFor={`${idPrefijo}-desde`}>Desde</label>
      <Input
        id={`${idPrefijo}-desde`}
        aria-label="Desde"
        type="date"
        value={desde}
        onChange={(evento) => onDesde(evento.target.value)}
        className="h-8 w-36"
      />
      <label className="text-xs text-muted-foreground" htmlFor={`${idPrefijo}-hasta`}>Hasta</label>
      <Input
        id={`${idPrefijo}-hasta`}
        aria-label="Hasta"
        type="date"
        value={hasta}
        onChange={(evento) => onHasta(evento.target.value)}
        className="h-8 w-36"
      />
    </div>
  );
}

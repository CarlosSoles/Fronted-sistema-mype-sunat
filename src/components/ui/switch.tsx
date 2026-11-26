import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * Interruptor de encendido/apagado.
 *
 * Se usa donde el estado se lee mejor de un vistazo que con un botón: la cuenta
 * activa del catálogo. `role="switch"` lo hace accesible con teclado y lectores
 * de pantalla.
 */
export const Switch = ({ checked, onCheckedChange, disabled, id, className, ...resto }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    aria-label={resto['aria-label']}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      checked ? 'bg-primary' : 'bg-muted-foreground/30',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      className,
    )}
  >
    <span
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform',
        checked ? 'translate-x-4' : 'translate-x-0.5',
      )}
    />
  </button>
);

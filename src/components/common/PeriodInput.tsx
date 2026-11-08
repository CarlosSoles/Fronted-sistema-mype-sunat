import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';

const MESES = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
];

/**
 * Selector Año + Mes. Evita el control nativo `month`, que en algunos
 * navegadores autocompleta ceros y confunde el formato contable.
 */
export function PeriodInput({
  value,
  onChange,
  id,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}) {
  const match = /^(\d{4})-(\d{1,2})$/.exec(value);
  const year = match ? Number(match[1]) : new Date().getFullYear();
  const month = match ? match[2].padStart(2, '0') : '01';
  const cambiar = (nuevoAnio: number, nuevoMes: string) => {
    onChange(`${nuevoAnio}-${nuevoMes}`);
  };

  return (
    <div className={cn('flex gap-1.5', className)}>
      <Input
        id={id}
        aria-label="Año contable"
        type="number"
        min={2000}
        max={2100}
        value={year}
        onChange={(event) => cambiar(Number(event.target.value), month)}
        className="w-24"
      />
      <select
        aria-label="Mes contable"
        value={month}
        onChange={(event) => cambiar(year, event.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      >
        {MESES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

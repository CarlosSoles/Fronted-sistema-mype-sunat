import { Button, Input } from '@/components/ui';

/**
 * Reparto de un importe entre varias cuentas contables.
 *
 * El editor no decide nada: solo recoge las líneas y avisa si la suma no
 * cuadra con el total. La validación definitiva (suma exacta, cuenta existente,
 * cuenta de mayor con subcuentas) la hace el backend, que es quien conoce el
 * catálogo PCGE.
 */

export interface DistributionRow {
  accountCode: string;
  amount: string;
}

interface Props {
  label: string;
  /** Importe a repartir: base del gasto o monto del cobro. */
  total: number;
  accounts: ReadonlyArray<{ code: string; name: string }>;
  rows: DistributionRow[];
  onChange: (rows: DistributionRow[]) => void;
  disabled?: boolean;
}

const money = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AccountDistributionEditor({ label, total, accounts, rows, onChange, disabled }: Props) {
  const suma = Math.round(rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0) * 100) / 100;
  const diferencia = Math.round((total - suma) * 100) / 100;
  const cuadra = Math.abs(diferencia) <= 0.01;

  const actualizar = (indice: number, cambios: Partial<DistributionRow>) => {
    onChange(rows.map((fila, i) => (i === indice ? { ...fila, ...cambios } : fila)));
  };

  return (
    <div className="space-y-2 rounded border border-dashed p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...rows, { accountCode: '', amount: '' }])}
        >
          Agregar cuenta
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Sin reparto: se contabiliza en la cuenta de las reglas del proceso.
        </p>
      ) : null}

      {rows.map((fila, indice) => (
        <div key={indice} className="flex items-end gap-2">
          <label className="text-[11px] flex-1">
            Cuenta
            <select
              className="mt-1 h-9 w-full rounded border bg-background px-2 text-xs"
              value={fila.accountCode}
              disabled={disabled}
              onChange={(e) => actualizar(indice, { accountCode: e.target.value })}
            >
              <option value="">Seleccionar cuenta</option>
              {accounts.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] w-32">
            Importe
            <Input
              type="number"
              min="0"
              step="0.01"
              value={fila.amount}
              disabled={disabled}
              onChange={(e) => actualizar(indice, { amount: e.target.value })}
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onChange(rows.filter((_, i) => i !== indice))}
          >
            Quitar
          </Button>
        </div>
      ))}

      {rows.length > 0 ? (
        <p className={`text-[11px] ${cuadra ? 'text-emerald-600' : 'text-destructive'}`}>
          Repartido {money(suma)} de {money(total)}
          {cuadra ? ' · cuadra' : ` · faltan ${money(diferencia)}`}
        </p>
      ) : null}
    </div>
  );
}

/** Convierte las filas del editor al contrato del backend. */
export const toDistributionPayload = (rows: DistributionRow[]) =>
  rows
    .filter((r) => r.accountCode && Number(r.amount) > 0)
    .map((r) => ({ accountCode: r.accountCode, amount: Number(r.amount) }));

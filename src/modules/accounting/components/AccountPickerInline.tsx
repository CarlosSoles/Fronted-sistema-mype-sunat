import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { AccountingAccount } from '../types/accounting.types';

interface AccountPickerInlineProps {
  accounts: AccountingAccount[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  idPrefijo: string;
}

const LIMITE = 40;

/** Quita tildes y unifica mayúsculas para comparar. */
const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Selector de cuenta con búsqueda, sin desplegable flotante.
 *
 * La lista aparece debajo del campo y forma parte del formulario: crece con el
 * contenido en lugar de superponerse. Así no puede quedar recortada por el
 * contenedor ni cerrarse al desplazarla, que es lo que ocurría con el panel
 * flotante dentro del modal del asiento.
 */
export function AccountPickerInline({
  accounts,
  value,
  onChange,
  placeholder = 'Buscar cuenta imputable',
  idPrefijo,
}: AccountPickerInlineProps) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');

  const seleccionada = useMemo(
    () => accounts.find((cuenta) => cuenta.code === value),
    [accounts, value],
  );

  const filtradas = useMemo(() => {
    const termino = normalizar(texto.trim());
    const base = termino
      ? accounts.filter(
          (cuenta) =>
            cuenta.code.includes(termino) || normalizar(cuenta.name).includes(termino),
        )
      : accounts;
    return base.slice(0, LIMITE);
  }, [accounts, texto]);

  const elegir = (cuenta: AccountingAccount) => {
    onChange(cuenta.code);
    setTexto('');
    setAbierto(false);
  };

  const mostrar = abierto ? texto : seleccionada ? `${seleccionada.code} · ${seleccionada.name}` : texto;

  return (
    <div className="space-y-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={`${idPrefijo}-cuenta`}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${idPrefijo}-lista`}
          aria-autocomplete="list"
          autoComplete="off"
          className="h-8 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder={placeholder}
          value={mostrar}
          title={seleccionada ? `${seleccionada.code} · ${seleccionada.name}` : undefined}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setAbierto(true);
          }}
          onFocus={() => {
            setTexto('');
            setAbierto(true);
          }}
        />
      </div>

      {abierto ? (
        <div
          id={`${idPrefijo}-lista`}
          role="listbox"
          className="max-h-56 w-full overflow-y-auto overscroll-contain rounded-md border bg-popover p-1"
        >
          {filtradas.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Sin cuentas que coincidan.</p>
          ) : (
            filtradas.map((cuenta) => (
              <button
                key={cuenta.code}
                type="button"
                role="option"
                aria-selected={cuenta.code === value}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted"
                onClick={() => elegir(cuenta)}
              >
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{cuenta.code}</span>
                <span className="shrink-0 rounded border px-1 text-[10px] text-muted-foreground">
                  N{cuenta.level}
                </span>
                <span className="truncate">{cuenta.name}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

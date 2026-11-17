import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccountingAccount } from '../types/accounting.types';

interface AccountComboboxProps {
  accounts: AccountingAccount[];
  /** Código de la cuenta elegida. */
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  idPrefijo: string;
}

/**
 * Selector de cuenta contable con búsqueda.
 *
 * Se comporta como un desplegable normal (se abre hacia abajo y se cierra al
 * elegir), pero admite escribir para filtrar por código o por nombre: recorrer
 * 1700 cuentas en un `Select` no es viable.
 */
export function AccountCombobox({
  accounts,
  value,
  onChange,
  placeholder = 'Seleccionar cuenta contable',
  idPrefijo,
}: AccountComboboxProps) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const contenedor = useRef<HTMLDivElement>(null);

  const seleccionada = accounts.find((cuenta) => cuenta.code === value);

  // Al cerrar, el campo vuelve a mostrar la cuenta elegida.
  useEffect(() => {
    if (!abierto) setTexto(seleccionada ? `${seleccionada.code} · ${seleccionada.name}` : '');
  }, [abierto, seleccionada]);

  // Cerrar al hacer clic fuera del componente.
  useEffect(() => {
    if (!abierto) return;
    const alClicFuera = (evento: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [abierto]);

  const filtradas = useMemo(() => {
    const termino = texto.trim().toLowerCase();
    // Si el texto es exactamente la cuenta elegida, se listan todas.
    if (!termino || termino === `${seleccionada?.code} · ${seleccionada?.name}`.toLowerCase()) {
      return accounts.slice(0, 60);
    }
    return accounts
      .filter((cuenta) => cuenta.code.includes(termino) || cuenta.name.toLowerCase().includes(termino))
      .slice(0, 60);
  }, [accounts, texto, seleccionada]);

  const elegir = (cuenta: AccountingAccount) => {
    onChange(cuenta.code);
    setTexto(`${cuenta.code} · ${cuenta.name}`);
    setAbierto(false);
  };

  return (
    <div className="relative" ref={contenedor}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={`${idPrefijo}-cuenta`}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${idPrefijo}-lista`}
          aria-autocomplete="list"
          autoComplete="off"
          className="h-9 w-full rounded-md border bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder={placeholder}
          value={texto}
          onChange={(evento) => { setTexto(evento.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
        />
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform',
            abierto && 'rotate-180',
          )}
        />
      </div>

      {abierto ? (
        <div
          id={`${idPrefijo}-lista`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-lg"
        >
          {filtradas.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Sin cuentas que coincidan.</p>
          ) : (
            filtradas.map((cuenta) => (
              <button
                key={cuenta.code}
                type="button"
                role="option"
                aria-selected={cuenta.code === value}
                // onMouseDown evita que el input pierda el foco antes del clic.
                onMouseDown={(evento) => { evento.preventDefault(); elegir(cuenta); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted',
                  cuenta.code === value && 'bg-muted font-medium',
                )}
              >
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{cuenta.code}</span>
                <span className="truncate">{cuenta.name}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

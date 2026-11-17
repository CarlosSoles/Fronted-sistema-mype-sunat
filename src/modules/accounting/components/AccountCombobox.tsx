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

const LIMITE = 50;
const CLAVE_RECIENTES = 'accounting-mayor-recientes';

/** Quita tildes y unifica mayúsculas para comparar. */
const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function leerRecientes(): string[] {
  try {
    const guardado = localStorage.getItem(CLAVE_RECIENTES);
    const lista = guardado ? JSON.parse(guardado) : [];
    return Array.isArray(lista) ? lista.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Selector de cuenta contable con búsqueda.
 *
 * Se abre hacia abajo como un desplegable normal, pero admite escribir para
 * filtrar por código o nombre. Recorrer 1738 cuentas en un `Select` no es
 * viable, así que la lista se limita a 50 resultados.
 */
export function AccountCombobox({
  accounts,
  value,
  onChange,
  placeholder = 'Buscar cuenta por código o nombre',
  idPrefijo,
}: AccountComboboxProps) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [resaltado, setResaltado] = useState(0);
  const [recientes, setRecientes] = useState<string[]>([]);
  const contenedor = useRef<HTMLDivElement>(null);

  const porCodigo = useMemo(() => new Map(accounts.map((cuenta) => [cuenta.code, cuenta])), [accounts]);
  const seleccionada = porCodigo.get(value);

  /** Ruta de ancestros: "Activo › 10 Efectivo… › 101 Caja". */
  const caminoDe = (cuenta: AccountingAccount): string => {
    const ancestros: AccountingAccount[] = [];
    let padre = cuenta.parentCode ? porCodigo.get(cuenta.parentCode) : undefined;
    while (padre) {
      ancestros.unshift(padre);
      padre = padre.parentCode ? porCodigo.get(padre.parentCode) : undefined;
    }
    return ancestros.map((item) => `${item.code} ${item.name}`).join(' › ');
  };

  useEffect(() => {
    if (abierto) setRecientes(leerRecientes());
  }, [abierto]);

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

  const { filtradas, total } = useMemo(() => {
    const termino = normalizar(texto.trim());
    const esLaElegida = seleccionada && termino === normalizar(`${seleccionada.code} · ${seleccionada.name}`);

    // Sin texto (o con la cuenta ya elegida) se ofrecen las recientes.
    if (!termino || esLaElegida) {
      if (recientes.length > 0) {
        const recientesValidas = recientes
          .map((code) => porCodigo.get(code))
          .filter((cuenta): cuenta is AccountingAccount => Boolean(cuenta));
        if (recientesValidas.length > 0) {
          return { filtradas: recientesValidas.slice(0, LIMITE), total: recientesValidas.length };
        }
      }
      return { filtradas: accounts.slice(0, LIMITE), total: accounts.length };
    }

    const coincidencias = accounts.filter(
      (cuenta) =>
        normalizar(cuenta.code).includes(termino) || normalizar(cuenta.name).includes(termino),
    );
    return { filtradas: coincidencias.slice(0, LIMITE), total: coincidencias.length };
  }, [accounts, texto, seleccionada, recientes, porCodigo]);

  const elegir = (cuenta: AccountingAccount) => {
    onChange(cuenta.code);
    setTexto(`${cuenta.code} · ${cuenta.name}`);
    setAbierto(false);
    try {
      const nuevas = [cuenta.code, ...leerRecientes().filter((code) => code !== cuenta.code)].slice(0, 5);
      localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(nuevas));
    } catch {
      // Si el navegador bloquea el almacenamiento, se ignora.
    }
  };

  /** Navegación con teclado sobre la lista. */
  const alPulsarTecla = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (!abierto) return;
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setResaltado((previo) => Math.min(previo + 1, filtradas.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setResaltado((previo) => Math.max(previo - 1, 0));
    } else if (evento.key === 'Enter') {
      const cuenta = filtradas[resaltado];
      if (cuenta) {
        evento.preventDefault();
        elegir(cuenta);
      }
    } else if (evento.key === 'Escape') {
      setAbierto(false);
    }
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
          className="h-8 w-full rounded-md border bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder={placeholder}
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setResaltado(0);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={alPulsarTecla}
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
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 shadow-lg"
        >
          {filtradas.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Sin cuentas que coincidan.</p>
          ) : (
            <>
              {texto.trim() === '' || !recientes.length ? null : (
                <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">Recientes</p>
              )}
              {filtradas.map((cuenta, indice) => {
                const camino = caminoDe(cuenta);
                return (
                  <button
                    key={cuenta.code}
                    type="button"
                    role="option"
                    aria-selected={cuenta.code === value}
                    // onMouseDown evita que el input pierda el foco antes del clic.
                    onMouseDown={(evento) => {
                      evento.preventDefault();
                      elegir(cuenta);
                    }}
                    onMouseEnter={() => setResaltado(indice)}
                    className={cn(
                      'flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left text-sm hover:bg-muted',
                      (cuenta.code === value || indice === resaltado) && 'bg-muted',
                    )}
                  >
                    <span className="flex w-full items-center gap-2">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{cuenta.code}</span>
                      <span className="truncate">{cuenta.name}</span>
                      {cuenta.isActive ? null : (
                        <span className="ml-auto shrink-0 rounded border px-1 text-[10px] text-muted-foreground">
                          Inactiva
                        </span>
                      )}
                    </span>
                    {camino ? (
                      <span className="w-full truncate text-[11px] text-muted-foreground">{camino}</span>
                    ) : null}
                  </button>
                );
              })}
              {total > LIMITE ? (
                <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                  Mostrando {LIMITE} de {total}: siga escribiendo para filtrar.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

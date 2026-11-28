import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  /** Casilla opcional dentro del desplegable (por ejemplo, solo cuentas con movimientos). */
  casilla?: { etiqueta: string; checked: boolean; onChange: (valor: boolean) => void };
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
 * filtrar por código o nombre. Al abrirlo sin escribir muestra las cuentas
 * recientes arriba y el catálogo completo debajo: antes solo mostraba las
 * recientes y parecía que el catálogo tenía tres cuentas.
 */
export function AccountCombobox({
  accounts,
  value,
  onChange,
  placeholder = 'Buscar cuenta por código o nombre',
  idPrefijo,
  casilla,
}: AccountComboboxProps) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [resaltado, setResaltado] = useState(0);
  const [recientes, setRecientes] = useState<string[]>([]);
  /** Posición del panel cuando se dibuja en un portal. */
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  /** Recalcula la posición del panel a partir del campo. */
  const actualizarPosicion = () => {
    const caja = contenedor.current?.getBoundingClientRect();
    if (caja) setRect({ top: caja.bottom + 4, left: caja.left, width: caja.width });
  };

  useEffect(() => {
    if (!abierto) return;
    actualizarPosicion();
    // Al desplazar la página o el contenedor, el panel flotante quedaría
    // desanclado: se cierra en lugar de mostrarse en el sitio equivocado.
    const cerrar = () => setAbierto(false);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  const porCodigo = useMemo(() => new Map(accounts.map((cuenta) => [cuenta.code, cuenta])), [accounts]);
  const seleccionada = porCodigo.get(value);

  /** Ruta de ancestros: "1 Activo › 10 Efectivo… › 101 Caja". */
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

  const termino = normalizar(texto.trim());
  const esLaElegida = Boolean(
    seleccionada && termino === normalizar(`${seleccionada.code} · ${seleccionada.name}`),
  );
  const sinFiltro = !termino || esLaElegida;

  const { filtradas, total } = useMemo(() => {
    if (sinFiltro) return { filtradas: accounts.slice(0, LIMITE), total: accounts.length };
    const coincidencias = accounts.filter(
      (cuenta) => normalizar(cuenta.code).includes(termino) || normalizar(cuenta.name).includes(termino),
    );
    return { filtradas: coincidencias.slice(0, LIMITE), total: coincidencias.length };
  }, [accounts, termino, sinFiltro]);

  /** Recientes válidas, solo mientras no se escribe. */
  const recientesValidas = useMemo(() => {
    if (!sinFiltro) return [];
    return recientes
      .map((codigo) => porCodigo.get(codigo))
      .filter((cuenta): cuenta is AccountingAccount => Boolean(cuenta))
      .slice(0, 5);
  }, [recientes, porCodigo, sinFiltro]);

  const elegir = (cuenta: AccountingAccount) => {
    onChange(cuenta.code);
    setTexto(`${cuenta.code} · ${cuenta.name}`);
    setAbierto(false);
    try {
      const nuevas = [cuenta.code, ...leerRecientes().filter((codigo) => codigo !== cuenta.code)].slice(0, 5);
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

  const opcion = (cuenta: AccountingAccount, indice: number) => {
    const camino = caminoDe(cuenta);
    return (
      <button
        key={`${cuenta.code}-${indice}`}
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
          <span className="shrink-0 rounded border px-1 text-[10px] text-muted-foreground">N{cuenta.level}</span>
          <span className="truncate">{cuenta.name}</span>
          {cuenta.isActive ? null : (
            <span className="ml-auto shrink-0 rounded border px-1 text-[10px] text-muted-foreground">Inactiva</span>
          )}
        </span>
        {camino ? <span className="w-full truncate text-[11px] text-muted-foreground">{camino}</span> : null}
      </button>
    );
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
          title={seleccionada ? `${seleccionada.code} · ${seleccionada.name}` : undefined}
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

      {abierto && rect
        ? createPortal(
            <div
              id={`${idPrefijo}-lista`}
              role="listbox"
              style={{ top: rect.top, left: rect.left, minWidth: rect.width }}
              className="fixed z-50 max-h-80 w-[28rem] max-w-[90vw] overflow-auto rounded-md border bg-popover p-1 shadow-lg"
            >
          {filtradas.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Sin cuentas que coincidan.</p>
          ) : (
            <>
              {/* Recientes arriba, sin sustituir al catálogo completo. */}
              {recientesValidas.length > 0 ? (
                <>
                  <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">Recientes</p>
                  {recientesValidas.map((cuenta, indice) => opcion(cuenta, indice))}
                  <p className="mt-1 border-t px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Todas las cuentas
                  </p>
                </>
              ) : null}

              {filtradas.map((cuenta, indice) => opcion(cuenta, indice))}

              {total > LIMITE ? (
                <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                  Mostrando {LIMITE} de {total}: siga escribiendo para filtrar.
                </p>
              ) : null}

              {casilla ? (
                <label className="mt-1 flex cursor-pointer items-center gap-2 border-t px-2 py-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={casilla.checked}
                    onChange={(evento) => casilla.onChange(evento.target.checked)}
                    className="h-3.5 w-3.5 rounded border-input"
                  />
                  {casilla.etiqueta}
                </label>
              ) : null}
            </>
          )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

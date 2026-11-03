/**
 * Campo de cliente del formulario de emisión, con buscador (TA-61).
 *
 * POR QUÉ UN COMPONENTE APARTE Y NO DOS CAMPOS MÁS EN `InvoiceEmitCampos`
 *
 * El buscador necesita su propio estado (la consulta, los resultados, si está
 * abierto) y una petición con limpieza. Meterlo dentro de `InvoiceEmitCampos`
 * obligaría a que ese archivo —que ya monta la grilla de ítems y los campos
 * tributarios— mantuviera el estado de una pieza que solo le concierne a dos
 * campos.
 *
 * QUÉ RESUELVE
 *
 * Escribir el RUC a mano es la principal fuente de errores de digitación: un
 * dígito de más y el comprobante no existe ante SUNAT. Al elegir un cliente de
 * la lista se rellenan documento y razón social, y el usuario solo confirma.
 *
 * SI EL BACKEND NO RESPONDE, EL CAMPO SIGUE SIRVIENDO
 *
 * El buscador es una ayuda, no un requisito: si la consulta falla, queda el
 * input de texto normal y se puede emitir igual. Bloquear la emisión porque la
 * cartera no cargó sería peor que el problema que resuelve.
 *
 * POR QUÉ EL ESTADO SE DERIVA Y NO SE COPIA
 *
 * El texto del input NO es un `useState` sincronizado con `documento` por un
 * efecto: eso dispara renders en cascada y la regla `react-hooks/set-state-in-
 * effect` lo prohíbe. Se guarda solo el texto que el usuario escribió, con
 * `null` como "todavía no ha tocado el campo", y lo que se pinta es
 * `textoEscribido ?? documento`. Así, cuando el borrador cambia por fuera, el
 * campo lo refleja sin ningún efecto.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageText } from '@/components/ui';
import { invoicesApi } from '../services/invoicesApi';
import {
  filtrarClientes,
  MINIMO_CARACTERES,
  type ClienteBuscado,
} from '../lib/invoiceSearch';

interface CustomerLookupFieldProps {
  /** Documento actual del borrador. */
  documento: string;
  /** Razón social actual del borrador. */
  razonSocial: string;
  /** Se dispara al elegir un cliente: rellena documento y razón social. */
  onElegir: (cliente: ClienteBuscado) => void;
  /** Label del campo, que cambia entre factura y boleta. */
  labelDocumento: string;
  placeholderDocumento?: string;
  errorDocumento?: string;
}

/** Campo de documento del cliente con búsqueda sobre la cartera de la empresa. */
export const CustomerLookupField = ({
  documento,
  razonSocial,
  onElegir,
  labelDocumento,
  placeholderDocumento,
  errorDocumento,
}: CustomerLookupFieldProps) => {
  const [cartera, setCartera] = useState<readonly ClienteBuscado[]>([]);
  const [textoEscribido, setTextoEscribido] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement | null>(null);

  // Lo que se pinta: lo que el usuario escribió o, si no tocó el campo, el
  // valor del borrador. Sin efecto de sincronización.
  const texto = textoEscribido ?? documento;

  // La cartera se carga una vez al montar. Si falla, se deja vacía: el campo
  // sigue siendo un input normal.
  useEffect(() => {
    let vivo = true;

    invoicesApi
      .buscarClientes()
      .then((lista) => {
        if (vivo) setCartera(lista);
      })
      .catch(() => {
        if (vivo) setCartera([]);
      });

    return () => {
      vivo = false;
    };
  }, []);

  // Cierra la lista al hacer clic fuera.
  useEffect(() => {
    const alClicFuera = (evento: MouseEvent) => {
      if (!contenedor.current) return;
      if (!contenedor.current.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, []);

  const resultados = useMemo(
    () => filtrarClientes(cartera, texto),
    [cartera, texto],
  );

  const mostrarSugerencias = abierto && texto.trim().length >= MINIMO_CARACTERES;

  return (
    <div ref={contenedor} className="relative space-y-1">
      <label htmlFor="doc-cliente" className="text-xs font-medium">
        {labelDocumento}
      </label>

      <input
        id="doc-cliente"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        value={texto}
        placeholder={placeholderDocumento}
        autoComplete="off"
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          // El documento es numérico: se limpia al escribir y NO se dispara
          // onElegir, porque el usuario puede estar corrigiendo a mano.
          setTextoEscribido(e.target.value.replace(/\D/g, ''));
          setAbierto(true);
        }}        onKeyDown={(e) => {
          if (e.key === 'Escape') setAbierto(false);
        }}
      />

      {errorDocumento && <PageText variant="error">{errorDocumento}</PageText>}

      {mostrarSugerencias && resultados.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-background shadow">
          {resultados.map((cliente) => (
            <li key={`${cliente.tipoDocumento}-${cliente.numeroDocumento}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onElegir(cliente);
                  setTextoEscribido(cliente.numeroDocumento);
                  setAbierto(false);
                }}
              >
                <span className="block font-medium">
                  {cliente.razonSocial || '(sin razón social)'}
                </span>
                <span className="block text-muted-foreground">
                  {cliente.tipoDocumento === '6' ? 'RUC' : 'DNI'}{' '}
                  {cliente.numeroDocumento}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {mostrarSugerencias && resultados.length === 0 && (
        <PageText variant="caption">
          Sin coincidencias en su cartera. Puede escribirlo a mano.
        </PageText>
      )}

      {/* La razón social se mantiene visible como dato del borrador. */}
      {razonSocial.trim() !== '' && (
        <PageText variant="caption">{razonSocial}</PageText>
      )}
    </div>
  );
};

/**
 * Buscador reactivo de clientes (TA-61).
 *
 * Escribir el RUC a mano es la principal fuente de errores de digitación: un
 * dígito de más y el comprobante no existe ante SUNAT. Este campo busca por
 * documento y por razón social sobre la lista de clientes que ya está en
 * memoria, y al elegir un resultado rellena documento, tipo y razón social.
 *
 * La lógica —cuándo buscar, por qué campo y cómo filtrar— vive en
 * `../lib/invoiceSearch` para poder probarla sin montar React.
 */
import { useMemo, useState } from 'react';
import { PageText } from '@/components/ui';
import {
  campoDeBusqueda,
  filtrarClientes,
  tipoDocumentoDe,
  type ClienteBuscado,
} from '../lib/invoiceSearch';

interface CustomerSearchSelectProps {
  clientes: readonly ClienteBuscado[];
  onElegir: (cliente: ClienteBuscado) => void;
  placeholder?: string;
  valorInicial?: string;
}

/** Campo de búsqueda de clientes con lista de resultados. */
export const CustomerSearchSelect = ({
  clientes,
  onElegir,
  placeholder = 'RUC, DNI o razón social',
  valorInicial = '',
}: CustomerSearchSelectProps) => {
  const [texto, setTexto] = useState(valorInicial);

  // El filtrado es síncrono y barato: no hace falta debounce contra el backend
  // porque la lista ya está en memoria. El debounce del módulo de búsqueda se
  // usa cuando se consulta una API.
  const resultados = useMemo(
    () => filtrarClientes(clientes, texto),
    [clientes, texto],
  );
  const campo = campoDeBusqueda(texto);

  return (
    <div className="relative space-y-1">
      <input
        aria-label="Buscar cliente"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => setTexto(e.target.value)}
      />

      {campo === 'documento' && (
        <PageText variant="caption">
          Buscando por documento de {tipoDocumentoDe(texto) === '6' ? 'RUC' : 'DNI'}.
        </PageText>
      )}

      {resultados.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-background shadow">
          {resultados.map((cliente) => (
            <li key={`${cliente.tipoDocumento}-${cliente.numeroDocumento}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onElegir(cliente);
                  setTexto(cliente.razonSocial);
                }}
              >
                <span className="block font-medium">{cliente.razonSocial}</span>
                <span className="block text-muted-foreground">
                  {cliente.tipoDocumento === '6' ? 'RUC' : 'DNI'}{' '}
                  {cliente.numeroDocumento}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {campo !== 'ninguno' && resultados.length === 0 && (
        <PageText variant="caption">
          Sin coincidencias. Escriba al menos 2 caracteres del nombre o el
          documento completo.
        </PageText>
      )}
    </div>
  );
};

/**
 * Grilla de ítems del formulario de emisión (TA-64).
 *
 * Reemplaza el campo único "Descripción del ítem" y "Monto base imponible" por
 * una tabla editable: una factura real de ferretería lleva varias líneas con
 * afectaciones distintas, y antes no había forma de emitirla desde la pantalla.
 *
 * La lógica de cálculo y validación NO vive aquí: está en `../lib/invoiceItems`
 * para poder probarla sin montar React.
 */
import { Button, PageText } from '@/components/ui';
import { InventoryProductSearchSelect } from './InventoryProductSearchSelect';
import {
  UNIDADES_MEDIDA,
  calcularItem,
  type ItemBorrador,
} from '../lib/invoiceItems';
import type { ProductoBuscado } from '../lib/invoiceSearch';
import type { AfectacionIgv } from '../lib/invoiceTaxes';

const OPCIONES_AFECTACION: readonly { value: AfectacionIgv; label: string }[] = [
  { value: 'GRAVADA', label: 'Gravada 18%' },
  { value: 'EXONERADA', label: 'Exonerada' },
  { value: 'INAFECTA', label: 'Inafecta' },
  { value: 'GRATUITA', label: 'Gratuita' },
];

const CLASE_CELDA =
  'h-8 w-full rounded border bg-background px-2 text-xs text-foreground';

interface InvoiceItemsGridProps {
  items: readonly ItemBorrador[];
  onCambiar: (indice: number, parcial: Partial<ItemBorrador>) => void;
  onEliminar: (indice: number) => void;
  onAgregar: () => void;
  onAgregarBolsa: () => void;
  /**
   * TA-61: productos del almacén para el buscador.
   *
   * Si la lista viene vacía el buscador NO se pinta: un campo de búsqueda que
   * nunca encuentra nada es peor que no tenerlo, porque el usuario cree que el
   * catálogo está vacío cuando puede ser que no haya conexión con Inventarios.
   */
  productos?: readonly ProductoBuscado[];
  /** TA-61: agrega una línea nueva con los datos del producto elegido. */
  onAgregarConProducto?: (producto: ProductoBuscado) => void;
}

/** Tabla editable de líneas del comprobante. */
export const InvoiceItemsGrid = ({
  items,
  onCambiar,
  onEliminar,
  onAgregar,
  onAgregarBolsa,
  productos = [],
  onAgregarConProducto,
}: InvoiceItemsGridProps) => {
  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between">
        <PageText variant="label">Detalle del comprobante</PageText>
        <PageText variant="caption">
          {items.length} {items.length === 1 ? 'línea' : 'líneas'}
        </PageText>
      </div>

      {/*
        TA-64 + TA-61: buscador de productos DENTRO de la grilla.

        Las dos tareas se hicieron en ramas distintas y el buscador quedó
        montado solo en el formulario de la emisión, mientras la grilla de
        múltiples líneas seguía obligando a teclear el SKU a mano. Aquí se
        conectan: al elegir un producto se arrastran su código, descripción,
        unidad y valor unitario a una línea nueva, que es justo lo que se
        digitaba mal.
      */}
      {productos.length > 0 && onAgregarConProducto ? (
        <InventoryProductSearchSelect
          productos={productos}
          onElegir={(producto) => {
            onAgregarConProducto(producto);
          }}
          placeholder="Buscar por SKU o descripción para agregar una línea"
        />
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[11px] uppercase">
            <tr>
              <th className="px-2 py-1 text-left">Código</th>
              <th className="px-2 py-1 text-left">Descripción</th>
              <th className="px-2 py-1 text-left">Und.</th>
              <th className="px-2 py-1 text-right">Cant.</th>
              <th className="px-2 py-1 text-right">V. unit.</th>
              <th className="px-2 py-1 text-right">ICBPER</th>
              <th className="px-2 py-1 text-left">Afect.</th>
              <th className="px-2 py-1 text-right">Total</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const totales = calcularItem(item);
              return (
                <tr key={item.clave} className="border-t align-middle">
                  <td className="px-1 py-1">
                    <input
                      aria-label={`Código de la línea ${i + 1}`}
                      className={CLASE_CELDA}
                      value={item.codigo}
                      onChange={(e) => onCambiar(i, { codigo: e.target.value })}
                      placeholder="COD-001"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      aria-label={`Descripción de la línea ${i + 1}`}
                      className={CLASE_CELDA}
                      value={item.descripcion}
                      onChange={(e) =>
                        onCambiar(i, { descripcion: e.target.value })
                      }
                      placeholder="Cemento Portland tipo I"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <select
                      aria-label={`Unidad de la línea ${i + 1}`}
                      className={CLASE_CELDA}
                      value={item.unidad}
                      onChange={(e) => onCambiar(i, { unidad: e.target.value })}
                    >
                      {UNIDADES_MEDIDA.map((u) => (
                        <option key={u.codigo} value={u.codigo}>
                          {u.codigo}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      aria-label={`Cantidad de la línea ${i + 1}`}
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${CLASE_CELDA} text-right`}
                      value={item.cantidad}
                      onChange={(e) =>
                        onCambiar(i, { cantidad: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      aria-label={`Valor unitario de la línea ${i + 1}`}
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${CLASE_CELDA} text-right`}
                      value={item.valorUnitario}
                      onChange={(e) =>
                        onCambiar(i, { valorUnitario: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      aria-label={`ICBPER de la línea ${i + 1}`}
                      type="number"
                      min="0"
                      step="0.5"
                      className={`${CLASE_CELDA} text-right`}
                      value={item.icbper}
                      onChange={(e) =>
                        onCambiar(i, { icbper: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-1 py-1">
                    <select
                      aria-label={`Afectación de la línea ${i + 1}`}
                      className={CLASE_CELDA}
                      value={item.afectacion}
                      onChange={(e) =>
                        onCambiar(i, {
                          afectacion: e.target.value as AfectacionIgv,
                        })
                      }
                    >
                      {OPCIONES_AFECTACION.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {totales.total.toFixed(2)}
                  </td>
                  <td className="px-1 py-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Eliminar la línea ${i + 1}`}
                      onClick={() => onEliminar(i)}
                    >
                      ✕
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onAgregar}>
          + Añadir ítem
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onAgregarBolsa}>
          + Bolsa plástica (ICBPER)
        </Button>
      </div>
    </div>
  );
};

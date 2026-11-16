import { ArrowRight, BookOpen, ShoppingCart, Receipt, Wallet, Lock } from 'lucide-react';
import { Card, Page, PageHeader } from '@/components/ui';

/**
 * Guía contable.
 *
 * Explica, en lenguaje de negocio, qué asientos genera cada operación y con qué
 * cuentas del PCGE. Es documentación viva: el contenido va escrito aquí, no se
 * consulta a la API, para que el contador pueda leerlo sin depender de datos.
 *
 * Las cuentas son las que usa el sistema (ver `accountingBridge.ts` y las reglas
 * por defecto), verificadas contra las líneas reales de los asientos.
 */

interface Linea {
  lado: 'DEBE' | 'HABER';
  cuenta: string;
  nombre: string;
  detalle: string;
}

interface Asiento {
  titulo: string;
  descripcion: string;
  lineas: Linea[];
}

interface Proceso {
  titulo: string;
  icono: typeof BookOpen;
  resumen: string;
  asientos: Asiento[];
}

const PROCESOS: Proceso[] = [
  {
    titulo: 'Ventas',
    icono: Receipt,
    resumen: 'Cada factura o boleta genera dos asientos: la venta y su costo.',
    asientos: [
      {
        titulo: '1. Provisión de la venta',
        descripcion: 'Al emitir el comprobante aceptado por SUNAT.',
        lineas: [
          { lado: 'DEBE', cuenta: '12121', nombre: 'Facturas, boletas y otros comprobantes por cobrar', detalle: 'Total del comprobante (incluye IGV)' },
          { lado: 'HABER', cuenta: '40111', nombre: 'IGV – Cuenta propia', detalle: 'IGV del comprobante (18 %)' },
          { lado: 'HABER', cuenta: '70121', nombre: 'Ventas de mercaderías gravadas', detalle: 'Valor de venta sin impuestos' },
        ],
      },
      {
        titulo: '2. Costo de ventas',
        descripcion: 'Salida del almacén valorizada con el costo (FIFO).',
        lineas: [
          { lado: 'DEBE', cuenta: '69111', nombre: 'Costo de ventas de mercaderías', detalle: 'Costo del bien vendido' },
          { lado: 'HABER', cuenta: '20111', nombre: 'Mercaderías', detalle: 'Salida del inventario por el mismo costo' },
        ],
      },
      {
        titulo: '3. Cobranza',
        descripcion: 'Cuando el cliente paga la factura o boleta.',
        lineas: [
          { lado: 'DEBE', cuenta: '1041', nombre: 'Cuentas corrientes operativas', detalle: 'Importe cobrado (banco o caja)' },
          { lado: 'HABER', cuenta: '12121', nombre: 'Facturas, boletas y otros comprobantes por cobrar', detalle: 'Se cancela la cuenta por cobrar' },
        ],
      },
    ],
  },
  {
    titulo: 'Compras',
    icono: ShoppingCart,
    resumen: 'La compra entra al almacén y queda como cuenta por pagar.',
    asientos: [
      {
        titulo: '1. Provisión de la compra',
        descripcion: 'Al registrar la factura del proveedor.',
        lineas: [
          { lado: 'DEBE', cuenta: '60111', nombre: 'Mercaderías manufacturadas', detalle: 'Valor de compra sin impuestos' },
          { lado: 'DEBE', cuenta: '40111', nombre: 'IGV – Cuenta propia', detalle: 'IGV de la compra (18 %)' },
          { lado: 'HABER', cuenta: '42121', nombre: 'Facturas por pagar emitidas', detalle: 'Total a pagar al proveedor' },
        ],
      },
      {
        titulo: '2. Ingreso al almacén',
        descripcion: 'Cuando se recibe físicamente la mercadería.',
        lineas: [
          { lado: 'DEBE', cuenta: '20111', nombre: 'Mercaderías', detalle: 'Ingreso del bien al inventario' },
          { lado: 'HABER', cuenta: '6111', nombre: 'Variación de existencias', detalle: 'Cuenta de enlace del costo de compra' },
        ],
      },
      {
        titulo: '3. Pago al proveedor',
        descripcion: 'Cuando se cancela la factura.',
        lineas: [
          { lado: 'DEBE', cuenta: '42121', nombre: 'Facturas por pagar emitidas', detalle: 'Se cancela la cuenta por pagar' },
          { lado: 'HABER', cuenta: '1041', nombre: 'Cuentas corrientes operativas', detalle: 'Salida de banco o caja' },
        ],
      },
    ],
  },
  {
    titulo: 'Gastos y cobranzas',
    icono: Wallet,
    resumen: 'Los gastos se reconocen por naturaleza y se distribuyen por área cuando corresponde.',
    asientos: [
      {
        titulo: '1. Provisión de un gasto',
        descripcion: 'Al registrar el gasto con su comprobante.',
        lineas: [
          { lado: 'DEBE', cuenta: '63x', nombre: 'Gastos de servicios y otros', detalle: 'Valor del gasto sin impuestos' },
          { lado: 'DEBE', cuenta: '40111', nombre: 'IGV – Cuenta propia', detalle: 'IGV del gasto (18 %)' },
          { lado: 'HABER', cuenta: '42121', nombre: 'Facturas por pagar emitidas', detalle: 'Importe a pagar' },
        ],
      },
      {
        titulo: '2. Pago del gasto',
        descripcion: 'Cuando se paga el gasto en efectivo o por transferencia.',
        lineas: [
          { lado: 'DEBE', cuenta: '42121', nombre: 'Facturas por pagar emitidas', detalle: 'Se cancela la cuenta por pagar' },
          { lado: 'HABER', cuenta: '1041', nombre: 'Cuentas corrientes operativas', detalle: 'Salida de banco o caja' },
        ],
      },
    ],
  },
  {
    titulo: 'Importaciones',
    icono: BookOpen,
    resumen: 'La nacionalización suma el costo, el flete y los tributos aduaneros.',
    asientos: [
      {
        titulo: '1. Nacionalización DAM',
        descripcion: 'Al asentar la declaración aduanera.',
        lineas: [
          { lado: 'DEBE', cuenta: '60111', nombre: 'Mercaderías / materias primas', detalle: 'Valor FOB de la mercadería' },
          { lado: 'DEBE', cuenta: '40151', nombre: 'Derechos arancelarios', detalle: 'Tributos aduaneros' },
          { lado: 'HABER', cuenta: '42121', nombre: 'Facturas por pagar emitidas', detalle: 'Obligación con el proveedor del exterior' },
        ],
      },
      {
        titulo: '2. Costos en tránsito a destino',
        descripcion: 'Flete, seguro y gastos de agencia hasta el almacén.',
        lineas: [
          { lado: 'DEBE', cuenta: '20111', nombre: 'Mercaderías', detalle: 'Costo total de la mercadería recibida' },
          { lado: 'HABER', cuenta: '6111', nombre: 'Variación de existencias', detalle: 'Se cierra la cuenta de tránsito' },
        ],
      },
    ],
  },
  {
    titulo: 'Cierre del ejercicio',
    icono: Lock,
    resumen: 'Al cerrar el año, las cuentas de resultado se cancelan contra resultados acumulados.',
    asientos: [
      {
        titulo: '1. Cierre anual',
        descripcion: 'Un solo asiento que lleva ingresos y gastos al patrimonio.',
        lineas: [
          { lado: 'DEBE', cuenta: '70x', nombre: 'Cuentas de ingresos', detalle: 'Se cierran los saldos acreedores' },
          { lado: 'HABER', cuenta: '59', nombre: 'Resultados acumulados', detalle: 'Utilidad o pérdida del ejercicio' },
        ],
      },
    ],
  },
];

const colorLado = (lado: 'DEBE' | 'HABER') =>
  lado === 'DEBE'
    ? 'border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
    : 'border-sky-600/30 bg-sky-500/5 text-sky-700 dark:text-sky-400';

export default function AccountingGuidePage() {
  return (
    <Page>
      <PageHeader
        title="Guía contable"
        description="Qué asiento genera cada operación y con qué cuentas del PCGE"
      />

      <Card className="border-l-2 border-l-primary p-4 text-sm">
        <p className="font-medium">Cómo leer esta guía</p>
        <p className="mt-1 text-muted-foreground">
          Cada operación del sistema (venta, compra, gasto, cobro, importación o cierre) genera uno o
          más asientos automáticos. El sistema toma las cuentas de las <em>reglas de contabilización</em>
          {' '}de la empresa, así que un cambio en esas reglas cambia el asiento que verás en el Libro
          Diario. Este documento describe el comportamiento por defecto.
        </p>
      </Card>

      {PROCESOS.map((proceso) => {
        const Icono = proceso.icono;
        return (
          <section key={proceso.titulo} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icono className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">{proceso.titulo}</h2>
                <p className="text-xs text-muted-foreground">{proceso.resumen}</p>
              </div>
            </div>

            {proceso.asientos.map((asiento) => (
              <Card key={asiento.titulo} className="p-4">
                <p className="text-sm font-medium">{asiento.titulo}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{asiento.descripcion}</p>
                <div className="mt-3 space-y-1.5">
                  {asiento.lineas.map((linea, indice) => (
                    <div
                      key={`${asiento.titulo}-${indice}`}
                      className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs ${colorLado(linea.lado)}`}
                    >
                      <span className="w-14 font-semibold uppercase tracking-wider">{linea.lado}</span>
                      <span className="font-mono text-[11px] font-semibold">{linea.cuenta}</span>
                      <ArrowRight className="h-3 w-3 opacity-50" />
                      <span className="font-medium">{linea.nombre}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">{linea.detalle}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </section>
        );
      })}

      <Card className="p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Qué no genera asiento</p>
        <p className="mt-1">
          Una venta rechazada por SUNAT, un comprobante en borrador o un movimiento de almacén sin
          documento asociado no crean asiento. La <em>Auditoría contable</em> los lista para que se
          revisen o se regularicen.
        </p>
      </Card>
    </Page>
  );
}

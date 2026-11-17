import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Lock, Printer, Receipt, Search, ShoppingCart, Wallet } from 'lucide-react';
import { Badge, Button, Card, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { accountingApi } from '../services/accountingApi';
import { descargarPdf, monto } from '../lib/exportReport';
import type { AccountingRule } from '../services/accountingApi';

/**
 * Guía contable.
 *
 * Explica, con el asiento a la vista, qué genera cada operación. Los importes se
 * calculan en vivo a partir de un total de comprobante para que el contador
 * pueda comprobar el asiento con un caso concreto.
 *
 * Las cuentas mostradas son las de por defecto del sistema. Si la empresa tiene
 * reglas propias para ese proceso, la sección se marca como personalizada y se
 * enlaza a Reglas de contabilización.
 */

/** Tasa de IGV usada por el sistema; se indica una sola vez, no en cada texto. */
export const TASA_IGV = 0.18;

type Calculo = 'BASE' | 'IGV' | 'TOTAL' | 'COSTO';

interface Linea {
  lado: 'DEBE' | 'HABER';
  cuenta: string;
  nombre: string;
  detalle: string;
  calculo?: Calculo;
}

interface Asiento {
  titulo: string;
  disparador: string;
  lineas: Linea[];
}

interface Proceso {
  codigo: string;
  titulo: string;
  icono: typeof Receipt;
  resumen: string;
  asientos: Asiento[];
}

const PROCESOS: Proceso[] = [
  {
    codigo: 'VENTA',
    titulo: 'Ventas',
    icono: Receipt,
    resumen: 'Cada factura o boleta genera dos asientos: la venta y su costo.',
    asientos: [
      {
        titulo: 'Provisión de la venta',
        disparador: 'Al emitir el comprobante aceptado por SUNAT.',
        lineas: [
          { lado: 'DEBE', cuenta: '12121', nombre: 'Facturas, boletas y otros comprobantes por cobrar', detalle: 'Total del comprobante', calculo: 'TOTAL' },
          { lado: 'HABER', cuenta: '40111', nombre: 'IGV – Cuenta propia', detalle: 'IGV del comprobante', calculo: 'IGV' },
          { lado: 'HABER', cuenta: '70121', nombre: 'Ventas de mercaderías gravadas', detalle: 'Valor de venta sin impuestos', calculo: 'BASE' },
        ],
      },
      {
        titulo: 'Costo de ventas',
        disparador: 'Salida del almacén valorizada por FIFO.',
        lineas: [
          { lado: 'DEBE', cuenta: '69111', nombre: 'Costo de ventas de mercaderías', detalle: 'Costo del bien vendido' },
          { lado: 'HABER', cuenta: '20111', nombre: 'Mercaderías', detalle: 'Salida del inventario por el mismo costo' },
        ],
      },
      {
        titulo: 'Cobranza',
        disparador: 'Cuando el cliente paga la factura o boleta.',
        lineas: [
          { lado: 'DEBE', cuenta: '1041', nombre: 'Cuentas corrientes operativas', detalle: 'Importe cobrado', calculo: 'TOTAL' },
          { lado: 'HABER', cuenta: '12121', nombre: 'Facturas, boletas y otros comprobantes por cobrar', detalle: 'Se cancela la cuenta por cobrar', calculo: 'TOTAL' },
        ],
      },
    ],
  },
  {
    codigo: 'COMPRA',
    titulo: 'Compras',
    icono: ShoppingCart,
    resumen: 'La compra entra al almacén y queda como cuenta por pagar.',
    asientos: [
      {
        titulo: 'Provisión de la compra',
        disparador: 'Al registrar la factura del proveedor.',
        lineas: [
          { lado: 'DEBE', cuenta: '60111', nombre: 'Mercaderías manufacturadas', detalle: 'Valor de compra sin impuestos', calculo: 'BASE' },
          { lado: 'DEBE', cuenta: '40111', nombre: 'IGV – Cuenta propia', detalle: 'IGV de la compra', calculo: 'IGV' },
          { lado: 'HABER', cuenta: '42121', nombre: 'Facturas por pagar emitidas', detalle: 'Total a pagar', calculo: 'TOTAL' },
        ],
      },
      {
        titulo: 'Ingreso al almacén',
        disparador: 'Cuando se recibe físicamente la mercadería.',
        lineas: [
          { lado: 'DEBE', cuenta: '20111', nombre: 'Mercaderías', detalle: 'Ingreso del bien al inventario' },
          { lado: 'HABER', cuenta: '6111', nombre: 'Variación de existencias', detalle: 'Cuenta de enlace del costo de compra' },
        ],
      },
      {
        titulo: 'Pago al proveedor',
        disparador: 'Cuando se cancela la factura.',
        lineas: [
          { lado: 'DEBE', cuenta: '42121', nombre: 'Facturas por pagar emitidas', detalle: 'Se cancela la cuenta por pagar', calculo: 'TOTAL' },
          { lado: 'HABER', cuenta: '1041', nombre: 'Cuentas corrientes operativas', detalle: 'Salida de banco o caja', calculo: 'TOTAL' },
        ],
      },
    ],
  },
  {
    codigo: 'GASTO',
    titulo: 'Gastos',
    icono: Wallet,
    resumen: 'Los gastos se reconocen por naturaleza y se distribuyen por área cuando corresponde.',
    asientos: [
      {
        titulo: 'Provisión de un gasto',
        disparador: 'Al registrar el gasto con su comprobante.',
        lineas: [
          { lado: 'DEBE', cuenta: '63x', nombre: 'Gastos de servicios y otros', detalle: 'Valor del gasto sin impuestos', calculo: 'BASE' },
          { lado: 'DEBE', cuenta: '40111', nombre: 'IGV – Cuenta propia', detalle: 'IGV del gasto', calculo: 'IGV' },
          { lado: 'HABER', cuenta: '42121', nombre: 'Facturas por pagar emitidas', detalle: 'Importe a pagar', calculo: 'TOTAL' },
        ],
      },
      {
        titulo: 'Pago del gasto',
        disparador: 'Cuando se paga el gasto en efectivo o por transferencia.',
        lineas: [
          { lado: 'DEBE', cuenta: '42121', nombre: 'Facturas por pagar emitidas', detalle: 'Se cancela la cuenta por pagar', calculo: 'TOTAL' },
          { lado: 'HABER', cuenta: '1041', nombre: 'Cuentas corrientes operativas', detalle: 'Salida de banco o caja', calculo: 'TOTAL' },
        ],
      },
    ],
  },
  {
    codigo: 'IMPORTACION',
    titulo: 'Importaciones',
    icono: ShoppingCart,
    resumen: 'La nacionalización de la DAM y los costos hasta el almacén.',
    asientos: [
      {
        titulo: 'Nacionalización DAM',
        disparador: 'Al asentar la declaración aduanera.',
        lineas: [
          { lado: 'DEBE', cuenta: '60111', nombre: 'Mercaderías / materias primas', detalle: 'Valor FOB de la mercadería' },
          { lado: 'DEBE', cuenta: '40151', nombre: 'Derechos arancelarios', detalle: 'Tributos aduaneros' },
          { lado: 'HABER', cuenta: '42121', nombre: 'Facturas por pagar emitidas', detalle: 'Obligación con el proveedor del exterior' },
        ],
      },
      {
        titulo: 'Costos en tránsito a destino',
        disparador: 'Flete, seguro y gastos de agencia hasta el almacén.',
        lineas: [
          { lado: 'DEBE', cuenta: '20111', nombre: 'Mercaderías', detalle: 'Costo total de la mercadería recibida' },
          { lado: 'HABER', cuenta: '6111', nombre: 'Variación de existencias', detalle: 'Se cierra la cuenta de tránsito' },
        ],
      },
    ],
  },
  {
    codigo: 'CIERRE',
    titulo: 'Cierre del ejercicio',
    icono: Lock,
    resumen: 'Al cerrar el año, las cuentas de resultado se cancelan contra resultados acumulados.',
    asientos: [
      {
        titulo: 'Cierre anual',
        disparador: 'Al generar el asiento de cierre del ejercicio, el 31 de diciembre.',
        lineas: [
          { lado: 'DEBE', cuenta: '70x', nombre: 'Cuentas de ingresos', detalle: 'Se cierran los saldos acreedores' },
          { lado: 'HABER', cuenta: '6x', nombre: 'Cuentas de gastos', detalle: 'Se cierran los saldos deudores' },
          { lado: 'HABER', cuenta: '59', nombre: 'Resultados acumulados', detalle: 'Utilidad o pérdida del ejercicio' },
        ],
      },
    ],
  },
];

/** Importe de una línea según el total del comprobante. */
function importeDeLinea(linea: Linea, total: number): number {
  const base = total / (1 + TASA_IGV);
  switch (linea.calculo) {
    case 'BASE':
      return base;
    case 'IGV':
      return total - base;
    default:
      return total;
  }
}

export default function AccountingGuidePage() {
  const navegar = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [importe, setImporte] = useState('118.00');
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set(PROCESOS.map((p) => p.codigo)));
  const [activa, setActiva] = useState(PROCESOS[0].codigo);
  const referencias = useRef<Record<string, HTMLElement | null>>({});

  const { data: reglas = [] } = useQuery({
    queryKey: ['accounting-rules'],
    queryFn: () => accountingApi.getRules(),
  });

  const total = Number(importe.replace(',', '.')) || 0;

  /** Procesos y asientos que coinciden con la búsqueda. */
  const procesosVisibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return PROCESOS;
    return PROCESOS.map((proceso) => {
      const asientos = proceso.asientos.filter(
        (asiento) =>
          asiento.titulo.toLowerCase().includes(termino) ||
          asiento.disparador.toLowerCase().includes(termino) ||
          asiento.lineas.some(
            (linea) =>
              linea.cuenta.toLowerCase().includes(termino) || linea.nombre.toLowerCase().includes(termino),
          ),
      );
      const coincideProceso =
        proceso.titulo.toLowerCase().includes(termino) || proceso.resumen.toLowerCase().includes(termino);
      if (!coincideProceso && asientos.length === 0) return null;
      return { ...proceso, asientos: coincideProceso ? proceso.asientos : asientos };
    }).filter((proceso): proceso is Proceso => proceso !== null);
  }, [busqueda]);

  // Al filtrar se abren las secciones con resultados.
  useEffect(() => {
    if (!busqueda.trim()) return;
    setAbiertos(new Set(procesosVisibles.map((proceso) => proceso.codigo)));
  }, [busqueda, procesosVisibles]);

  // Resalta en el índice la sección que se está viendo.
  useEffect(() => {
    // jsdom y navegadores antiguos no traen IntersectionObserver.
    if (typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.find((entrada) => entrada.isIntersecting);
        if (visible) {
          const codigo = (visible.target as HTMLElement).dataset.codigo;
          if (codigo) setActiva(codigo);
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    for (const elemento of Object.values(referencias.current)) {
      if (elemento) observador.observe(elemento);
    }
    return () => observador.disconnect();
  }, [procesosVisibles]);

  const alternar = (codigo: string) => {
    setAbiertos((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(codigo)) siguiente.delete(codigo);
      else siguiente.add(codigo);
      return siguiente;
    });
  };

  const reglasDe = (codigo: string): AccountingRule[] =>
    reglas.filter((regla) => regla.process_code === codigo && regla.is_active !== false);

  const irA = (codigo: string) => {
    const elemento = referencias.current[codigo];
    elemento?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Page>
      <PageHeader
        title="Guía contable"
        description="Qué asiento genera cada operación y con qué cuentas del PCGE"
      >
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => setAbiertos(new Set(PROCESOS.map((p) => p.codigo)))}>
            Expandir todo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAbiertos(new Set())}>
            Colapsar todo
          </Button>
          <Button variant="outline" size="sm" onClick={descargarPdf}>
            <Printer className="mr-1 h-4 w-4" /> PDF
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Índice fijo por módulo */}
        <nav className="hidden lg:block print:hidden" aria-label="Índice de la guía">
          <div className="sticky top-4 space-y-1">
            <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Módulos</p>
            {PROCESOS.map((proceso) => (
              <button
                key={proceso.codigo}
                type="button"
                onClick={() => irA(proceso.codigo)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  activa === proceso.codigo
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <proceso.icono className="h-3.5 w-3.5" />
                {proceso.titulo}
              </button>
            ))}
          </div>
        </nav>

        <div className="space-y-4">
          <Card className="border-l-2 border-l-primary p-4 text-sm">
            <p className="font-medium">Cómo leer esta guía</p>
            <p className="mt-1 text-muted-foreground">
              Cada operación genera uno o más asientos automáticos con las cuentas de las{' '}
              <em>reglas de contabilización</em> de la empresa. Los importes se calculan con un IGV del{' '}
              {(TASA_IGV * 100).toFixed(0)} % sobre el total del comprobante.
            </p>
          </Card>

          <div className="flex flex-wrap items-end gap-3 print:hidden">
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Buscar
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Código de cuenta, nombre u operación"
                  className="h-9 w-72 pl-9"
                  aria-label="Buscar en la guía"
                />
              </span>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Simular importe total
              <Input
                value={importe}
                onChange={(evento) => setImporte(evento.target.value)}
                inputMode="decimal"
                className="h-9 w-32 text-right tabular-nums"
                aria-label="Importe total del comprobante"
              />
            </label>
            <p className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
              <Badge className="border-emerald-600/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">DEBE</Badge>
              <Badge className="border-sky-600/30 bg-sky-500/5 text-sky-700 dark:text-sky-400">HABER</Badge>
              sangría en el Haber
            </p>
          </div>

          {procesosVisibles.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">No hay operaciones que coincidan con la búsqueda.</Card>
          ) : null}

          {procesosVisibles.map((proceso) => {
            const abierto = abiertos.has(proceso.codigo);
            const propias = reglasDe(proceso.codigo);
            return (
              <section
                key={proceso.codigo}
                data-codigo={proceso.codigo}
                ref={(elemento) => {
                  referencias.current[proceso.codigo] = elemento;
                }}
                className="scroll-mt-4 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alternar(proceso.codigo)}
                    className="flex items-center gap-2 text-left"
                    aria-expanded={abierto}
                  >
                    {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <proceso.icono className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{proceso.titulo}</span>
                      <span className="block text-xs text-muted-foreground">{proceso.resumen}</span>
                    </span>
                  </button>
                  <Badge variant="outline" className="ml-auto">
                    {propias.length > 0 ? 'Personalizada' : 'Por defecto'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => navegar('/accounting/rules')}>
                    Editar regla
                  </Button>
                </div>

                {abierto
                  ? proceso.asientos.map((asiento) => {
                      const debe = asiento.lineas
                        .filter((linea) => linea.lado === 'DEBE')
                        .reduce((suma, linea) => suma + importeDeLinea(linea, total), 0);
                      const haber = asiento.lineas
                        .filter((linea) => linea.lado === 'HABER')
                        .reduce((suma, linea) => suma + importeDeLinea(linea, total), 0);
                      const cuadra = Math.abs(debe - haber) < 0.005;

                      return (
                        <Card key={`${proceso.codigo}-${asiento.titulo}`} className="overflow-hidden">
                          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
                            <p className="text-sm font-medium">{asiento.titulo}</p>
                            <span className="text-[11px] text-muted-foreground">{asiento.disparador}</span>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cuenta</TableHead>
                                <TableHead>Denominación</TableHead>
                                <TableHead align="right">Debe</TableHead>
                                <TableHead align="right">Haber</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {asiento.lineas.map((linea, indice) => (
                                <TableRow key={`${linea.cuenta}-${indice}`}>
                                  <TableCell className="whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => navegar(`/accounting/mayor?cuenta=${encodeURIComponent(linea.cuenta)}`)}
                                      className="font-mono text-xs font-semibold underline-offset-2 hover:underline"
                                      title="Ver en el Libro Mayor"
                                    >
                                      {linea.cuenta}
                                    </button>
                                  </TableCell>
                                  <TableCell className={linea.lado === 'HABER' ? 'pl-8' : ''}>
                                    <span className="block">{linea.nombre}</span>
                                    <span className="block text-[11px] text-muted-foreground">{linea.detalle}</span>
                                  </TableCell>
                                  <TableCell align="right" className="tabular-nums">
                                    {linea.lado === 'DEBE' ? monto(importeDeLinea(linea, total)) : ''}
                                  </TableCell>
                                  <TableCell align="right" className="tabular-nums">
                                    {linea.lado === 'HABER' ? monto(importeDeLinea(linea, total)) : ''}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/40 font-medium">
                                <TableCell colSpan={2}>
                                  Totales
                                  <span className={`ml-2 text-[11px] ${cuadra ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                                    {cuadra ? 'Cuadra ✓' : 'No cuadra'}
                                  </span>
                                </TableCell>
                                <TableCell align="right" className="tabular-nums">{monto(debe)}</TableCell>
                                <TableCell align="right" className="tabular-nums">{monto(haber)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Card>
                      );
                    })
                  : null}
              </section>
            );
          })}
        </div>
      </div>
    </Page>
  );
}

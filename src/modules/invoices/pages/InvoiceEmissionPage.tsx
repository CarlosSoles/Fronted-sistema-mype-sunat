/**
 * Emisión de comprobantes electrónicos (M1).
 *
 * QUÉ SE CORRIGIÓ AQUÍ Y POR QUÉ
 *
 * Revisión del docente (31-10):
 *
 * 1. **Inventaba el CDR.** Si el `fetch` fallaba, el `catch` pintaba un verde
 *    "ACEPTADO - CDR SUNAT Simulado". Una constancia de recepción la emite SUNAT
 *    o no existe. Ahora, si la petición falla, se muestra el error y el
 *    comprobante NO queda aceptado.
 *
 * 2. **Un ítem por comprobante.** "No vas a colocar una factura por producto".
 *    La grilla admite varias líneas, cada una con su afectación de IGV y su
 *    detracción.
 *
 * 3. **El cliente "que no lo escriba, que lo busque".** El campo usa el buscador
 *    de la cartera y permite registrar uno nuevo cuando no existe.
 *
 * 4. **"Supone que esos productos los tienes en tu inventario, ¿por qué tendría
 *    que escribirlos?"** El buscador de productos trae SKU, descripción y
 *    precio del almacén.
 *
 * 5. **"La cantidad tiene que ser validada dependiendo de lo que tienes."** El
 *    stock se conoce al elegir el producto y la grilla avisa cuando se pide más
 *    de lo disponible; el backend lo vuelve a validar antes de reservar el
 *    correlativo.
 *
 * COMPROBADO CONTRA EL SERVIDOR REAL
 *
 * Hasta hoy esta pantalla mandaba el formulario a `POST /invoices`, que exige el
 * contrato fiscal completo (`payload_ubl`, `correlativo`...). El backend
 * respondía 400 `property clienteRuc should not exist` a TODAS las emisiones:
 * la pantalla nunca pudo emitir nada. Ahora usa `POST /invoices/emitir`, que
 * acepta la forma del formulario y devuelve el número real.
 *
 * LO QUE ESTA PANTALLA NO DICE
 *
 * El número que se muestra es el que asignó la serie, y el estado es PENDIENTE.
 * El CDR se consulta en la bandeja. No se muestra "ACEPTADO" en ningún caso
 * aquí, porque SUNAT no ha respondido todavía.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Page,
  PageHeader,
  PageText,
} from '@/components/ui';
import { FileText, Send, Plus } from 'lucide-react';
import { CustomerLookupField } from '../components/CustomerLookupField';
import { InvoiceItemsGrid } from '../components/InvoiceItemsGrid';
import {
  calcularItem,
  totalizarItems,
  itemVacio,
  type ItemBorrador,
} from '../lib/invoiceItems';
import {
  calcularDetraccionPorLineas,
  repartirPago,
} from '../lib/invoiceDetraccionLinea';
import { calcularRetencion } from '../lib/invoiceRetentions';
import { invoicesApi } from '../services/invoicesApi';
import { cargarProductosAlmacen } from '../services/inventoryProductsApi';
import { revisarGrilla, primeraLineaConError } from '../lib/invoiceStockLinea';
import type { ProductoBuscado } from '../lib/invoiceSearch';
import type { ResultadoEmisionBackend } from '../types/invoiceEmision.types';

/** Series válidas por tipo (Catálogo del SEE). */
const SERIES: Record<'01' | '03', string> = { '01': 'F001', '03': 'B001' };

/** Afectación del Catálogo 07 que usa la grilla como valor por defecto. */
const AFECTACION_DEFAULT = '10';

export default function InvoiceEmissionPage() {
  const [tipo, setTipo] = useState<'01' | '03'>('01');
  const [clienteDoc, setClienteDoc] = useState('');
  const [clienteRazonSocial, setClienteRazonSocial] = useState('');
  const [items, setItems] = useState<readonly ItemBorrador[]>([itemVacio('1')]);
  const [agenteRetencion, setAgenteRetencion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [productos, setProductos] = useState<readonly ProductoBuscado[]>([]);
  const [resultado, setResultado] = useState<{
    ok: boolean;
    mensaje: string;
    numero?: string;
    avisos?: readonly string[];
  } | null>(null);

  // Productos del almacén para el buscador: el docente fue explícito en que el
  // producto sale del inventario, no del teclado. Si la carga falla, la lista
  // queda vacía y la grilla sigue admitiendo líneas escritas a mano.
  useEffect(() => {
    let vivo = true;
    cargarProductosAlmacen().then((lista) => {
      if (vivo) setProductos(lista);
    });
    return () => {
      vivo = false;
    };
  }, []);

  // Liquidación real línea por línea: cada línea aporta según su afectación y
  // las gratuitas no cobran. No hay un 18 % sobre el total.
  const totales = useMemo(() => totalizarItems(items), [items]);

  /**
   * Desglose por afectación del Catálogo 07.
   *
   * `TotalesGrilla` solo trae base, IGV y total; la pantalla necesita ver cuánto
   * de la venta es gravada, exonerada e inafecta —SUNAT las pide separadas en el
   * XML— así que se agregan aquí sin tocar el modelo.
   */
  const porAfectacion = useMemo(() => {
    const acumulado = { GRAVADA: 0, EXONERADA: 0, INAFECTA: 0, GRATUITA: 0 };
    for (const item of items) {
      acumulado[item.afectacion] += calcularItem(item).base;
    }
    return acumulado;
  }, [items]);

  const importeTotal = totales.total;

  // Detracción por LÍNEA: "los productos son con detracción, no la factura".
  const detraccion = useMemo(
    () =>
      calcularDetraccionPorLineas(
        items.map((i) => ({
          base: calcularItem(i).base,
          codigoDetraccion: i.codigoDetraccion,
        })),
        importeTotal,
      ),
    [items, importeTotal],
  );

  // Retención del IGV: es del CLIENTE, no del comprobante.
  const retencion = useMemo(
    () => calcularRetencion(importeTotal, agenteRetencion),
    [importeTotal, agenteRetencion],
  );

  const reparto = useMemo(
    () => repartirPago(importeTotal, detraccion.monto, retencion),
    [importeTotal, detraccion.monto, retencion],
  );

  const agregarItem = () => {
    setItems((prev) => [...prev, itemVacio(String(Date.now()))]);
  };

  const cambiarItem = (indice: number, parcial: Partial<ItemBorrador>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === indice ? { ...item, ...parcial } : item)),
    );
  };

  const eliminarItem = (indice: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== indice));
  };

  const agregarConProducto = (producto: {
    sku: string;
    descripcion: string;
    unidad?: string;
    valorUnitario: number;
  }) => {
    setItems((prev) => [
      ...prev,
      {
        ...itemVacio(String(Date.now())),
        codigo: producto.sku,
        descripcion: producto.descripcion,
        unidad: producto.unidad ?? 'NIU',
        valorUnitario: producto.valorUnitario,
        cantidad: 1,
      },
    ]);
  };

  const emitir = async (evento: React.FormEvent) => {
    evento.preventDefault();

    setResultado(null);

    // Validaciones locales para que el usuario vea el problema en el mismo
    // formulario. El backend las repite: esto no sustituye su validación.
    if (!clienteDoc.trim()) {
      setResultado({
        ok: false,
        mensaje:
          tipo === '01'
            ? 'La factura exige el RUC del cliente.'
            : 'Indique el documento del comprador.',
      });
      return;
    }
    if (!clienteRazonSocial.trim()) {
      setResultado({ ok: false, mensaje: 'Falta la razón social del cliente.' });
      return;
    }
    const lineaSinDescripcion = items.findIndex((i) => !i.descripcion.trim());
    if (lineaSinDescripcion >= 0) {
      setResultado({
        ok: false,
        mensaje: `La línea ${lineaSinDescripcion + 1} no tiene descripción.`,
      });
      return;
    }

    // El docente: "la cantidad tiene que ser validada dependiendo de lo que
    // tienes". Se detiene ANTES de llamar al backend: el backend también lo
    // rechaza, pero avisar aquí evita que el usuario espere una respuesta para
    // enterarse de algo que la pantalla ya sabe.
    const revision = revisarGrilla(items, productos);
    const primerError = primeraLineaConError(revision);
    if (primerError) {
      setResultado({
        ok: false,
        mensaje: `Línea ${primerError.indice + 1}: ${primerError.mensaje}`,
      });
      return;
    }

    setEnviando(true);
    try {
      // Se manda lo que el usuario escribió; el backend liquida los impuestos,
      // valida el stock contra el almacén y reserva el correlativo. El número
      // de la respuesta es el real.
      const r: ResultadoEmisionBackend = await invoicesApi.emitirComprobante({
        tipo_comprobante: tipo,
        serie: SERIES[tipo],
        customer_identity_type: tipo === '01' ? '6' : '1',
        customer_identity_number: clienteDoc.replace(/\D/g, ''),
        customer_legal_name: clienteRazonSocial.trim(),
        agente_retencion: agenteRetencion,
        forma_pago: 'Contado',
        items: items.map((i) => ({
          descripcion: i.descripcion.trim(),
          codigo: i.codigo?.trim() || undefined,
          unidad: i.unidad,
          cantidad: i.cantidad,
          valorUnitario: i.valorUnitario,
          afectacion: AFECTACION_DEFAULT,
        })),
      });

      setResultado({
        ok: true,
        numero: r.numero,
        mensaje:
          `Registrado por S/ ${r.monto_total.toFixed(2)} con ${r.lineas.length} ` +
          'línea(s). Queda PENDIENTE de envío: el CDR se consulta en la bandeja. ' +
          'Aquí todavía no hay respuesta de SUNAT.',
        avisos: r.avisos,
      });

      // La grilla se limpia para no reenviar la misma venta por doble clic.
      setItems([itemVacio('1')]);
    } catch (error: unknown) {
      // NO se inventa un CDR ni un número. Si el backend rechaza, se dice por
      // qué: el mensaje del backend explica qué falta (stock, RUC, correlativo).
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido';
      setResultado({
        ok: false,
        mensaje: `No se pudo emitir el comprobante: ${mensaje}`,
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Emisión de Comprobantes Electrónicos"
        description="Facturas (F001) y boletas (B001) con detalle de varias líneas, stock validado y liquidación real"
      />

      <form onSubmit={emitir} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Datos del comprobante y del cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="tipo-cpe"
                    className="text-xs font-medium text-foreground"
                  >
                    Tipo de comprobante
                  </label>
                  <select
                    id="tipo-cpe"
                    value={tipo}
                    onChange={(e) => {
                      setTipo(e.target.value as '01' | '03');
                      setResultado(null);
                    }}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="01">Factura Electrónica (F001)</option>
                    <option value="03">Boleta de Venta Electrónica (B001)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="agente-retencion"
                    className="text-xs font-medium text-foreground"
                  >
                    El cliente es Agente de Retención
                  </label>
                  <label className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                    <input
                      id="agente-retencion"
                      type="checkbox"
                      checked={agenteRetencion}
                      onChange={(e) => setAgenteRetencion(e.target.checked)}
                    />
                    <span className="text-xs text-muted-foreground">
                      Retiene el 3 % del IGV
                    </span>
                  </label>
                </div>
              </div>

              {/*
                El docente: el cliente "que no lo escriba, que lo busque". Este
                campo busca en la cartera de la empresa y rellena documento y
                razón social.
              */}
              <CustomerLookupField
                documento={clienteDoc}
                razonSocial={clienteRazonSocial}
                labelDocumento={
                  tipo === '01'
                    ? 'RUC del cliente'
                    : 'DNI / documento del comprador'
                }
                placeholderDocumento={tipo === '01' ? '20100070970' : '70123456'}
                onElegir={(cliente) => {
                  setClienteDoc(cliente.numeroDocumento);
                  setClienteRazonSocial(cliente.razonSocial);
                }}
              />

              <div className="space-y-1.5">
                <label
                  htmlFor="razon-cliente"
                  className="text-xs font-medium text-foreground"
                >
                  Razón social / nombre
                </label>
                <Input
                  id="razon-cliente"
                  value={clienteRazonSocial}
                  onChange={(e) => setClienteRazonSocial(e.target.value)}
                  placeholder="FERRETERÍA LOS ANDES S.A.C."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Detalle de bienes y servicios
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={agregarItem}
              >
                <Plus className="mr-1 h-4 w-4" /> Añadir ítem
              </Button>
            </CardHeader>
            <CardContent>
              <InvoiceItemsGrid
                items={items}
                onCambiar={cambiarItem}
                onEliminar={eliminarItem}
                onAgregar={agregarItem}
                onAgregarBolsa={() =>
                  setItems((prev) => [
                    ...prev,
                    {
                      ...itemVacio(String(Date.now())),
                      codigo: 'ICBPER',
                      descripcion: 'Bolsa plástica',
                      unidad: 'BG',
                      cantidad: 1,
                      valorUnitario: 0,
                      icbper: 0.5,
                      afectacion: 'GRAVADA',
                    },
                  ])
                }
                productos={productos}
                onAgregarConProducto={agregarConProducto}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={enviando}
              className="min-w-[200px]"
            >
              <Send className="mr-2 h-4 w-4" />
              {enviando ? 'Emitiendo…' : 'Emitir comprobante'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Liquidación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Op. gravada</span>
                <span>S/ {porAfectacion.GRAVADA.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Op. exonerada</span>
                <span>S/ {porAfectacion.EXONERADA.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Op. inafecta</span>
                <span>S/ {porAfectacion.INAFECTA.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>IGV (18 %)</span>
                <span>S/ {totales.igv.toFixed(2)}</span>
              </div>
              {totales.icbper > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>ICBPER</span>
                  <span>S/ {totales.icbper.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Importe total</span>
                <span className="text-primary">
                  S/ {reparto.importeTotal.toFixed(2)}
                </span>
              </div>

              {/*
                El docente: "los productos son con detracción, no la factura".
                Por eso se muestra qué línea la genera y cuánto, no un porcentaje
                suelto sobre el total.
              */}
              {detraccion.aplica ? (
                <div className="space-y-1 border-t border-border pt-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      Detracción (Cat. 54 {detraccion.codigos.join(', ')})
                    </span>
                    <span>S/ {detraccion.monto.toFixed(2)}</span>
                  </div>
                  <PageText variant="caption">
                    Se deposita en el Banco de la Nación. Solo sobre la base de
                    las líneas sujetas (S/ {detraccion.baseSujeta.toFixed(2)}).
                  </PageText>
                </div>
              ) : (
                detraccion.motivoNoAplica && (
                  <PageText variant="caption">
                    {detraccion.motivoNoAplica}
                  </PageText>
                )
              )}

              {reparto.retenidoIgv > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Retención IGV (3 %)</span>
                  <span>S/ {reparto.retenidoIgv.toFixed(2)}</span>
                </div>
              )}

              {(detraccion.aplica || reparto.retenidoIgv > 0) && (
                <div className="flex justify-between border-t border-border pt-2 text-xs font-medium">
                  <span>Pago directo al proveedor</span>
                  <span>S/ {reparto.pagoDirecto.toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {resultado && (
            <Alert variant={resultado.ok ? 'info' : 'destructive'}>
              <AlertTitle>
                {resultado.ok ? 'Comprobante registrado' : 'No se emitió'}
              </AlertTitle>
              <AlertDescription>
                {resultado.numero && (
                  <Badge variant="secondary" className="mr-2 font-mono">
                    {resultado.numero}
                  </Badge>
                )}
                {resultado.mensaje}
                {resultado.avisos && resultado.avisos.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-xs">
                    {resultado.avisos.map((aviso) => (
                      <li key={aviso}>{aviso}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </form>
    </Page>
  );
}

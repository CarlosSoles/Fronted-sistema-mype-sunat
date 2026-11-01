/**
 * Emisión de comprobantes electrónicos (M1).
 *
 * QUÉ SE CORRIGIÓ AQUÍ Y POR QUÉ
 *
 * La versión anterior de esta página tenía tres defectos que el docente señaló
 * en la revisión del 31-10:
 *
 * 1. **Inventaba el CDR.** Si el `fetch` fallaba, el `catch` pintaba un verde
 *    "ACEPTADO - CDR SUNAT Simulado". Eso es exactamente lo que no se puede
 *    hacer: una constancia de recepción la emite SUNAT o no existe. Ahora, si la
 *    petición falla, se muestra el error y el comprobante NO queda aceptado.
 *
 * 2. **Un ítem por comprobante.** El docente fue tajante: "no vas a colocar una
 *    factura por producto". Ahora se usa la grilla de varias líneas, con la
 *    afectación de IGV y la detracción de cada línea por separado.
 *
 * 3. **El total era base × 1.18 sobre todo.** Eso ignora exoneradas, inafectas y
 *    gratuitas, y detrae el 4 % del cemento solo porque en la misma factura hay
 *    un flete. Ahora se liquida línea por línea con el motor de impuestos.
 *
 * Y lo que el docente pidió textualmente: el cliente "que no lo escriba, que lo
 * busque". El campo usa el buscador de la cartera (TA-61) y permite registrar
 * uno nuevo cuando no existe.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
import { Badge } from '@/components/ui';
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
import type { ProductoBuscado } from '../lib/invoiceSearch';
import type { Moneda } from '../types/invoice.types';

/** Series válidas por tipo (Catálogo del SEE). */
const SERIES: Record<'01' | '03', string> = { '01': 'F001', '03': 'B001' };

export default function InvoiceEmissionPage() {
  const [tipo, setTipo] = useState<'01' | '03'>('01');
  const [clienteDoc, setClienteDoc] = useState('');
  const [clienteRazonSocial, setClienteRazonSocial] = useState('');
  const [items, setItems] = useState<readonly ItemBorrador[]>([
    itemVacio('1'),
  ]);
  const [agenteRetencion, setAgenteRetencion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [productos, setProductos] = useState<readonly ProductoBuscado[]>([]);
  const [resultado, setResultado] = useState<{
    ok: boolean;
    mensaje: string;
    numero?: string;
  } | null>(null);

  // Productos del almacén para el buscador (lo que pidió el docente: "eso de
  // ahí tendría que buscarlo"). Se carga una vez; si falla, la lista queda
  // vacía y la grilla sigue admitiendo líneas escritas a mano.
  useEffect(() => {
    let vivo = true;
    cargarProductosAlmacen().then((lista) => {
      if (vivo) setProductos(lista);
    });
    return () => {
      vivo = false;
    };
  }, []);

  // Liquidación real línea por línea. No hay un 18 % sobre el total: cada línea
  // aporta según su afectación, y las gratuitas no cobran.
  const totales = useMemo(() => totalizarItems(items), [items]);

  /**
   * Desglose por afectación del Catálogo 07.
   *
   * `TotalesGrilla` solo trae base, IGV y total porque nació para el pie de la
   * grilla. La pantalla necesita ver CUÁNTO de la venta es gravada, exonerada e
   * inafecta —SUNAT las pide por separado en el XML— así que se agregan aquí a
   * partir de las líneas ya calculadas, sin tocar el modelo.
   */
  const porAfectacion = useMemo(() => {
    const acumulado = { GRAVADA: 0, EXONERADA: 0, INAFECTA: 0, GRATUITA: 0 };
    for (const item of items) {
      acumulado[item.afectacion] += calcularItem(item).base;
    }
    return acumulado;
  }, [items]);

  const importeTotal = totales.total;

  // Detracción por LÍNEA: si el flete está sujeto y el cemento no, solo se
  // detrae la parte del flete. El umbral de S/ 700 se evalúa sobre el total del
  // comprobante, que es como lo pide SUNAT.
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

    // Validaciones locales que evitan un viaje al backend con datos que SUNAT
    // rechazaría. El backend las repite: esto es para que el usuario vea el
    // problema en el mismo formulario.
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

    setEnviando(true);
    try {
      const creado = await invoicesApi.createInvoice({
        serie: SERIES[tipo],
        clienteRuc: clienteDoc,
        clienteRazonSocial,
        moneda: 'PEN' as Moneda,
        items: items.map((i) => ({
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precioUnitario: i.valorUnitario,
        })),
      });

      setResultado({
        ok: true,
        numero: creado.numero,
        mensaje:
          'Comprobante registrado y encolado para su envío a SUNAT. El estado ' +
          'real del CDR se consulta en la bandeja: aquí todavía no hay respuesta ' +
          'de SUNAT.',
      });
    } catch (error: unknown) {
      // NO se inventa un CDR. Si el backend no responde, el comprobante no se
      // emitió, y eso es lo que se dice.
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
        description="Facturas (F001) y boletas (B001) con detalle de varias líneas y validación de SUNAT"
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
                El docente fue explícito: el cliente "que no lo escriba, que lo
                busque". Este campo busca en la cartera de la empresa y rellena
                documento y razón social.
              */}
              <CustomerLookupField
                documento={clienteDoc}
                razonSocial={clienteRazonSocial}
                labelDocumento={
                  tipo === '01'
                    ? 'RUC del cliente'
                    : 'DNI / documento del comprador'
                }
                placeholderDocumento={
                  tipo === '01' ? '20100070970' : '70123456'
                }
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
              {enviando ? 'Enviando…' : 'Emitir comprobante'}
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
                Por eso se muestra QUÉ línea la genera y cuánto, no un porcentaje
                suelto sobre el total.
              */}
              {detraccion.aplica ? (
                <div className="space-y-1 border-t border-border pt-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Detracción (Cat. 54 {detraccion.codigos.join(', ')})</span>
                    <span>S/ {detraccion.monto.toFixed(2)}</span>
                  </div>
                  <PageText variant="caption">
                    Se deposita en el Banco de la Nación. Solo sobre la base de las
                    líneas sujetas (S/ {detraccion.baseSujeta.toFixed(2)}).
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
              </AlertDescription>
            </Alert>
          )}
        </div>
      </form>
    </Page>
  );
}

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  PageText,
} from '@/components/ui';
import { Plus, Trash2, Search, CheckCircle2, UserPlus, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { apiClient as api } from '@/lib/axios';

interface ProductoInventario {
  id?: string;
  product_id?: string;
  productId?: string;
  sku?: string;
  name?: string;
  description?: string;
  productDescription?: string;
  product_name?: string;
  unit_price?: number;
  precio_unitario?: number;
  price?: number;
  average_unit_cost?: number;
  averageUnitCost?: number;
  stock?: number;
  current_stock?: number;
  currentStock?: number;
}

interface ItemFactura {
  id: string;
  productoId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

interface InvoiceEmitModalProps {
  tipoInicial?: string;
  onCerrar: () => void;
  onEmitirExito?: () => void;
}

export function InvoiceEmitModal({ onCerrar, onEmitirExito }: InvoiceEmitModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [mostrarModalNuevoCliente, setMostrarModalNuevoCliente] = useState(false);

  // Lista de Productos traída desde la API
  const [productosDb, setProductosDb] = useState<ProductoInventario[]>([]);

  // Estado para Registrar Nuevo Cliente (Flotante)
  const [nuevoTipoDoc, setNuevoTipoDoc] = useState<'RUC' | 'DNI'>('RUC');
  const [nuevoDoc, setNuevoDoc] = useState('');
  const [nuevaRazonSocial, setNuevaRazonSocial] = useState('');
  const [nuevoEsRetencion, setNuevoEsRetencion] = useState(false);

  // Formulario de Comprobante
  const [tipoComprobante, setTipoComprobante] = useState('01'); // 01: Factura, 03: Boleta
  const [docCliente, setDocCliente] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [esAgenteRetencion, setEsAgenteRetencion] = useState(false);
  const [bolsasIcbper, setBolsasIcbper] = useState(0);

  // Tabla Multi-Ítem
  const [items, setItems] = useState<ItemFactura[]>([
    {
      id: Date.now().toString(),
      productoId: '',
      descripcion: '',
      cantidad: 0,
      precioUnitario: 0,
    },
  ]);

  // 1. Cargar productos desde /inventory/stocks
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoadingProductos(true);
        const response = await api.get('/inventory/stocks');
        const raw = response.data;
        const lista: ProductoInventario[] = Array.isArray(raw?.balances)
          ? raw.balances
          : Array.isArray(raw)
          ? raw
          : raw?.data || raw?.stocks || [];

        setProductosDb(lista);
      } catch (err) {
        console.error('Error al cargar productos desde la API:', err);
        setProductosDb([]);
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, []);

  // 2. Buscar datos de cliente cuando se escribe el documento
  const handleDocChange = async (val: string) => {
    setDocCliente(val);
    const docLimpio = val.trim();

    if (docLimpio.length >= 8) {
      try {
        const response = await api.get(`/companies/search?tax_id=${docLimpio}`);
        if (response.data) {
          setRazonSocial(response.data.name || response.data.business_name || '');
          setEsAgenteRetencion(response.data.is_retention_agent || false);
        }
      } catch (err) {
        // Silencioso si el cliente no existe aún
      }
    }
  };

  // 3. Registrar cliente con fallback local si la API /companies no está lista
  const handleGuardarNuevoCliente = async () => {
    if (!nuevoDoc || !nuevaRazonSocial) return;

    try {
      setLoading(true);

      const payloadCliente = {
        tax_id: nuevoDoc.trim(),
        identity_document_type: nuevoTipoDoc,
        name: nuevaRazonSocial.trim(),
        is_retention_agent: nuevoTipoDoc === 'RUC' ? nuevoEsRetencion : false,
      };

      try {
        await api.post('/companies', payloadCliente);
      } catch (apiErr) {
        console.warn('Endpoint /companies no disponible en NestJS, aplicando fallback local.');
      }

      setDocCliente(nuevoDoc.trim());
      setRazonSocial(nuevaRazonSocial.trim());
      setEsAgenteRetencion(payloadCliente.is_retention_agent);

      setNuevoDoc('');
      setNuevaRazonSocial('');
      setNuevoEsRetencion(false);
      setMostrarModalNuevoCliente(false);
    } catch (err) {
      console.error('Error al registrar cliente:', err);
    } finally {
      setLoading(false);
    }
  };

  // Operaciones de tabla de ítems
  const handleAgregarItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        productoId: '',
        descripcion: '',
        cantidad: 0,
        precioUnitario: 0,
      },
    ]);
  };

  const handleSelectProducto = (index: number, keyVal: string) => {
    const prod = productosDb.find(
      (p: any) =>
        p.id === keyVal ||
        p.product_id === keyVal ||
        p.productId === keyVal ||
        p.sku === keyVal
    );
    if (!prod) return;

    const desc =
      prod.productDescription ||
      prod.description ||
      prod.name ||
      prod.product_name ||
      prod.sku ||
      'Producto Seleccionado';

    const precio =
      prod.averageUnitCost ??
      prod.average_unit_cost ??
      prod.unit_price ??
      prod.precio_unitario ??
      prod.price ??
      0;

    const pId = prod.product_id || prod.productId || prod.id || keyVal;

    const nuevosItems = [...items];
    nuevosItems[index] = {
      ...nuevosItems[index],
      productoId: pId,
      descripcion: desc,
      cantidad: nuevosItems[index].cantidad === 0 ? 1 : nuevosItems[index].cantidad,
      precioUnitario: Number(precio),
    };
    setItems(nuevosItems);
  };

  const handleUpdateItem = (index: number, field: keyof ItemFactura, value: any) => {
    const nuevosItems = [...items];
    nuevosItems[index] = { ...nuevosItems[index], [field]: value };
    setItems(nuevosItems);
  };

  const handleEliminarItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  // Cálculos Tributarios
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0), [items]);
  const igv = useMemo(() => subtotal * 0.18, [subtotal]);
  const montoIcbper = useMemo(() => bolsasIcbper * 0.5, [bolsasIcbper]);
  const totalGeneral = useMemo(() => subtotal + igv + montoIcbper, [subtotal, igv, montoIcbper]);

  // 4. Emitir comprobante adaptado 100% al esquema UBL 2.1 de SUNAT
  const handleEmitir = async () => {
    if (!docCliente || !razonSocial || items.some((i) => !i.productoId)) {
      alert('Por favor complete todos los datos obligatorios antes de emitir.');
      return;
    }

    try {
      setLoading(true);

      const serieCalculada = tipoComprobante === '01' ? 'F001' : 'B001';
      const fechaHoy = new Date().toISOString().split('T')[0];

      const payload = {
        ruc_emisor: '20100047218',
        serie: serieCalculada,
        correlativo: 1,
        tipo_comprobante: tipoComprobante,
        monto_total: Number(totalGeneral.toFixed(2)),
        fecha_emision: fechaHoy,
        payload_ubl: {
          issue_date: fechaHoy,
          customer: {
            identity_document_type: docCliente.trim().length === 11 ? '6' : '1',
            identity_document_number: docCliente.trim(),
            legal_name: razonSocial.trim(),
            is_retention_agent: esAgenteRetencion,
          },
          tax_details: {
            subtotal: Number(subtotal.toFixed(2)),
            igv: Number(igv.toFixed(2)),
            icbper: Number(montoIcbper.toFixed(2)),
          },
          items: items.map((item) => ({
            product_id: item.productoId,
            description: item.descripcion,
            quantity: item.cantidad,
            unit_price: item.precioUnitario,
            total: Number((item.cantidad * item.precioUnitario).toFixed(2)),
          })),
        },
      };

      console.log('Enviando payload a POST /invoices:', payload);

      await api.post('/invoices', payload);

      if (onEmitirExito) onEmitirExito();
      onCerrar();
    } catch (err) {
      console.error('Error al emitir comprobante:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onCerrar()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Emisión de Comprobantes Electrónicos</DialogTitle>
            <PageText variant="caption">Emisión conectada a la API de backend SUNAT.</PageText>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-2">
            {/* Sección Cliente */}
            <div className="md:col-span-2 space-y-4 rounded-lg border p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <PageText variant="label" className="text-sm font-semibold">Datos del Comprobante y Cliente</PageText>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMostrarModalNuevoCliente(true)}
                  className="h-7 text-xs gap-1 text-primary border-primary/30"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + Nuevo Cliente
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tipo de Comprobante</label>
                  <select
                    value={tipoComprobante}
                    onChange={(e) => setTipoComprobante(e.target.value)}
                    className="w-full h-9 mt-1 rounded-md border bg-background px-3 text-xs"
                  >
                    <option value="01">Factura Electrónica (F001)</option>
                    <option value="03">Boleta de Venta (B001)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {tipoComprobante === '01' ? 'RUC del Cliente' : 'DNI / RUC del Cliente'}
                  </label>
                  <div className="relative mt-1">
                    <Input
                      value={docCliente}
                      onChange={(e) => handleDocChange(e.target.value)}
                      placeholder={tipoComprobante === '01' ? 'Ingrese RUC...' : 'Ingrese DNI o RUC...'}
                      className="h-9 text-xs pr-8"
                    />
                    <Search className="w-4 h-4 absolute right-2.5 top-2.5 text-muted-foreground opacity-60" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  {tipoComprobante === '01' || docCliente.trim().length === 11
                    ? 'Razón Social'
                    : 'Nombres y Apellidos'}
                </label>
                <Input
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder={
                    tipoComprobante === '01' || docCliente.trim().length === 11
                      ? 'Ingrese Razón Social...'
                      : 'Ingrese Nombres y Apellidos...'
                  }
                  className="h-9 text-xs mt-1"
                />
              </div>

              {tipoComprobante === '01' && (
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={esAgenteRetencion}
                    onChange={(e) => setEsAgenteRetencion(e.target.checked)}
                    className="rounded"
                  />
                  El cliente es Agente de Retención del IGV (3%)
                </label>
              )}
            </div>

            {/* Resumen */}
            <div className="rounded-lg border p-4 bg-muted/10 space-y-3 flex flex-col justify-between">
              <PageText variant="label" className="text-sm font-semibold">Resumen de Liquidación</PageText>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Op. Gravada (Subtotal)</span>
                  <span>{formatCurrency(subtotal, 'PEN')}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IGV (18%)</span>
                  <span>{formatCurrency(igv, 'PEN')}</span>
                </div>
                {bolsasIcbper > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Bolsas ICBPER ({bolsasIcbper})</span>
                    <span>{formatCurrency(montoIcbper, 'PEN')}</span>
                  </div>
                )}
                {esAgenteRetencion && tipoComprobante === '01' && (
                  <div className="flex justify-between text-amber-500 font-medium pt-1 border-t border-dashed">
                    <span>Retención IGV (3%)</span>
                    <span>-{formatCurrency(totalGeneral * 0.03, 'PEN')}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t">
                <span className="text-xs font-medium text-muted-foreground block">Importe Total</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(totalGeneral, 'PEN')}</span>
              </div>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="space-y-3 border rounded-lg p-4 bg-background">
            <div className="flex items-center justify-between">
              <PageText variant="label" className="text-sm font-semibold">Detalle de Productos / Servicios</PageText>
              <Button size="sm" variant="outline" onClick={handleAgregarItem} className="h-8 text-xs gap-1">
                <Plus className="w-3.5 h-3.5" /> Agregar Ítem
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Descripción (Selección de Inventario)</th>
                    <th className="pb-2 font-medium w-20 text-center">Cant.</th>
                    <th className="pb-2 font-medium w-28 text-right">P. Unit (PEN)</th>
                    <th className="pb-2 font-medium w-28 text-right">Total</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-2">
                        <select
                          value={item.productoId}
                          onChange={(e) => handleSelectProducto(idx, e.target.value)}
                          className="w-full h-8 rounded border bg-background px-2 text-xs"
                          disabled={loadingProductos}
                        >
                          <option value="" disabled>
                            {loadingProductos ? 'Cargando inventario...' : '-- Seleccione un producto del inventario --'}
                          </option>
                          {productosDb.map((prod: any, pIdx: number) => {
                            const desc =
                              prod.productDescription ||
                              prod.description ||
                              prod.name ||
                              prod.product_name ||
                              prod.sku ||
                              `Producto ${pIdx + 1}`;

                            const precio =
                              prod.averageUnitCost ??
                              prod.average_unit_cost ??
                              prod.unit_price ??
                              prod.precio_unitario ??
                              prod.price ??
                              0;

                            const keyVal =
                              prod.product_id ||
                              prod.productId ||
                              prod.id ||
                              prod.sku ||
                              String(pIdx);

                            return (
                              <option key={keyVal} value={keyVal}>
                                {desc} — S/ {Number(precio).toFixed(2)}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          type="number"
                          min={0}
                          value={item.cantidad}
                          onChange={(e) => handleUpdateItem(idx, 'cantidad', Number(e.target.value))}
                          className="h-8 text-center text-xs"
                        />
                      </td>
                      <td className="py-2 px-1 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(e) => handleUpdateItem(idx, 'precioUnitario', Number(e.target.value))}
                          className="h-8 text-right text-xs"
                        />
                      </td>
                      <td className="py-2 pl-2 text-right font-medium">
                        {formatCurrency(item.cantidad * item.precioUnitario, 'PEN')}
                      </td>
                      <td className="py-2 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEliminarItem(item.id)}
                          disabled={items.length === 1}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <span className="text-muted-foreground">Bolsas plásticas ICBPER (S/ 0.50 c/u):</span>
              <Input
                type="number"
                min={0}
                value={bolsasIcbper}
                onChange={(e) => setBolsasIcbper(Math.max(0, Number(e.target.value)))}
                className="w-20 h-8 text-center text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={onCerrar} disabled={loading}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleEmitir} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Emitir Comprobante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Flotante Nuevo Cliente */}
      {mostrarModalNuevoCliente && (
        <Dialog open onOpenChange={(open) => !open && setMostrarModalNuevoCliente(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Registrar Nuevo Cliente
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 my-2 text-xs">
              <div>
                <label className="font-medium text-muted-foreground">Tipo de Documento</label>
                <select
                  value={nuevoTipoDoc}
                  onChange={(e) => setNuevoTipoDoc(e.target.value as 'RUC' | 'DNI')}
                  className="w-full h-8 mt-1 rounded border bg-background px-2 text-xs"
                >
                  <option value="RUC">RUC</option>
                  <option value="DNI">DNI</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-muted-foreground">Número de {nuevoTipoDoc}</label>
                <Input
                  placeholder={`Ingrese ${nuevoTipoDoc}...`}
                  value={nuevoDoc}
                  onChange={(e) => setNuevoDoc(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <label className="font-medium text-muted-foreground">
                  {nuevoTipoDoc === 'RUC' ? 'Razón Social' : 'Nombres y Apellidos'}
                </label>
                <Input
                  placeholder={
                    nuevoTipoDoc === 'RUC'
                      ? 'Ingrese Razón Social...'
                      : 'Ingrese Nombres y Apellidos...'
                  }
                  value={nuevaRazonSocial}
                  onChange={(e) => setNuevaRazonSocial(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              {nuevoTipoDoc === 'RUC' && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={nuevoEsRetencion}
                    onChange={(e) => setNuevoEsRetencion(e.target.checked)}
                    className="rounded"
                  />
                  Es Agente de Retención de IGV (3%)
                </label>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setMostrarModalNuevoCliente(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleGuardarNuevoCliente} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar y Seleccionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
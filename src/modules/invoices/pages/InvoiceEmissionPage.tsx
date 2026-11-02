/**
 * Emisión de comprobantes en página completa.
 *
 * Es la pantalla que el docente vio desde Contabilidad. Mantiene el detalle
 * multi-ítem y ahora usa el emisor de la sesión, el correlativo real de la
 * serie y el endpoint `POST /invoices`; ya no hay RUC hardcodeado ni un
 * `catch` que simule una emisión exitosa.
 *
 * La lógica tributaria fina (detracción, retención, notas, ICBPER) sigue en
 * `InvoiceEmitModal`; el siguiente paso es reutilizarla aquí.
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Page,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { Plus, Trash2, Send, CheckCircle2, FileText } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { invoicesApi } from '../services/invoicesApi';
import { siguienteCorrelativo } from '../lib/invoiceCorrelativo';
import { aPayloadCreacion } from '../lib/invoiceApiMapper';
import { construir, type ItemDemo } from '../data/invoiceDemoTypes';
import { round2 } from '../lib/invoiceTaxes';
import {
  documentoValidoParaTipo,
  mensajeErrorDocumento,
} from '../lib/invoiceEmitValidation';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

const fechaLocalIso = (fecha: Date): string => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const totalLinea = (item: InvoiceItem): number =>
  round2(item.quantity * item.unitPrice);

export default function InvoiceEmissionPage() {
  const { activeCompany } = useAuthStore();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState<'01' | '03'>('01');
  const [customerDoc, setCustomerDoc] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unitPrice: 0,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<{
    invoiceId: string;
    message: string;
  } | null>(null);

  const serie = docType === '01' ? 'F001' : 'B001';

  const { data: pagina } = useQuery({
    queryKey: ['invoices-emision', serie],
    queryFn: () => invoicesApi.getInvoices(1, { serie, page_size: 100 }),
    staleTime: 30_000,
  });

  const correlativo = useMemo(
    () => siguienteCorrelativo(pagina?.data ?? [], serie),
    [pagina, serie],
  );

  const base = round2(items.reduce((acc, item) => acc + totalLinea(item), 0));
  const igv = round2(base * 0.18);
  const total = round2(base + igv);

  const actualizarItem = (
    id: string,
    campo: keyof Pick<InvoiceItem, 'description' | 'quantity' | 'unitPrice'>,
    valor: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [campo]: valor } : item,
      ),
    );
  };

  const agregarItem = () => {
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const quitarItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const emitir = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResponseStatus(null);

    if (!activeCompany?.ruc || !activeCompany.razonSocial) {
      setError('No hay una empresa activa en la sesión.');
      return;
    }
    if (!documentoValidoParaTipo(docType, customerDoc)) {
      setError(mensajeErrorDocumento(docType));
      return;
    }
    if (!customerName.trim()) {
      setError('Ingresa la razón social o nombre del cliente.');
      return;
    }
    if (base <= 0 || items.some((item) => !item.description.trim())) {
      setError('Cada ítem necesita descripción y un importe mayor que cero.');
      return;
    }

    const lineas: ItemDemo[] = items.map((item, index) => ({
      codigo: `ITM-${index + 1}`,
      descripcion: item.description.trim(),
      unidad: 'NIU',
      cantidad: item.quantity,
      valorUnitario: item.unitPrice,
      afectacion: 'GRAVADA',
    }));

    const comprobante = construir({
      tipo: docType,
      serie,
      correlativo,
      ruc: customerDoc,
      tipoDocCliente: docType === '01' ? '6' : '1',
      razonSocial: customerName.trim(),
      fecha: fechaLocalIso(new Date()),
      base,
      afectacion: 'GRAVADA',
      estado: 'EN_COLA',
      items: lineas,
    });

    const payload = aPayloadCreacion(comprobante, {
      ruc: activeCompany.ruc,
      razonSocial: activeCompany.razonSocial,
    });

    setIsSubmitting(true);
    try {
      const data = await invoicesApi.createInvoice(payload);
      setResponseStatus({
        invoiceId: data.id ?? `${serie}-${correlativo}`,
        message:
          'Comprobante registrado en el outbox. El CDR llegará cuando el worker lo procese.',
      });
      // El correlativo y la grilla deben reflejar el comprobante recién creado:
      // sin esto, dos emisiones seguidas piden el mismo número.
      await queryClient.refetchQueries({ queryKey: ['invoices-emision', serie] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setItems([
        { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0 },
      ]);
      setCustomerDoc('');
      setCustomerName('');
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'No se pudo registrar el comprobante. Revisa los datos, la conexión y la empresa activa.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Emisión de Comprobantes Electrónicos"
        description="Facturas y boletas con detalle multi-ítem, correlativo real y registro en el backend"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={emitir} className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Datos del Comprobante y Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Tipo de Comprobante
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as '01' | '03')}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="01">Factura Electrónica (F001)</option>
                    <option value="03">Boleta de Venta Electrónica (B001)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    {docType === '01' ? 'RUC del Cliente' : 'DNI del Cliente'}
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder={docType === '01' ? '20123456789' : '71234567'}
                    value={customerDoc}
                    onChange={(e) =>
                      setCustomerDoc(e.target.value.replace(/\D/g, ''))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Razón Social / Nombre del Cliente
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Ej. SERVICIOS INTEGRALES S.A.C."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                Serie {serie} · correlativo {correlativo} · emisor{' '}
                {activeCompany?.ruc ?? 'sin empresa activa'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Detalle de Productos / Servicios
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={agregarItem}
              >
                <Plus className="w-4 h-4 mr-1" /> Agregar Ítem
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-24 text-center">Cant.</TableHead>
                    <TableHead className="w-32 text-right">
                      P. Unit (PEN)
                    </TableHead>
                    <TableHead className="w-32 text-right">Subtotal (sin IGV)</TableHead>
                    <TableHead className="w-12 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          type="text"
                          required
                          placeholder="Descripción del ítem"
                          value={item.description}
                          onChange={(e) =>
                            actualizarItem(
                              item.id,
                              'description',
                              e.target.value,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            actualizarItem(
                              item.id,
                              'quantity',
                              Math.max(1, Number(e.target.value) || 1),
                            )
                          }
                          className="text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            actualizarItem(
                              item.id,
                              'unitPrice',
                              Math.max(0, Number(e.target.value) || 0),
                            )
                          }
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        S/ {totalLinea(item).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => quitarItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !activeCompany}
              className="min-w-[200px]"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Registrando...' : 'Emitir Comprobante'}
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Resumen de Liquidación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Op. Gravada (Subtotal)</span>
                <span>S/ {base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>IGV (18%)</span>
                <span>S/ {igv.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-semibold text-lg text-foreground">
                <span>Importe Total</span>
                <span className="text-primary">S/ {total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {responseStatus && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Comprobante registrado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold">ID:</span>
                  <Badge variant="secondary" className="ml-2 font-mono">
                    {responseStatus.invoiceId}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{responseStatus.message}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus, RefreshCw, XCircle } from 'lucide-react';
import { Badge, Button, Card, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { apiClient } from '@/lib/axios';
import { purchaseOrdersApi, type PurchaseOrder } from '../services/purchaseOrdersApi';

const money = (n: number) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
type Row = { sku: string; quantity: number; unitCost: number };
const vacia = (): Row => ({ sku: '', quantity: 1, unitCost: 0 });

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const orders = useQuery({ queryKey: ['purchase-orders'], queryFn: purchaseOrdersApi.list });
  const [form, setForm] = useState({ supplierDocNumber: '', supplierName: '', issueDate: new Date().toISOString().slice(0, 10), expectedDate: '', pricesIncludeIgv: false, notes: '' });
  const [items, setItems] = useState<Row[]>([vacia()]);
  const [msg, setMsg] = useState('');
  const [convertir, setConvertir] = useState<PurchaseOrder | null>(null);
  const [doc, setDoc] = useState({ documentTypeCode: '01', documentSerial: 'F001', documentNumber: '' });
  const totales = useMemo(() => {
    const ingresado = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0);
    const neto = form.pricesIncludeIgv ? ingresado / 1.18 : ingresado;
    const igv = form.pricesIncludeIgv ? ingresado - neto : neto * 0.18;
    return { neto, igv, total: form.pricesIncludeIgv ? ingresado : neto + igv };
  }, [items, form.pricesIncludeIgv]);
  const invalidar = async () => { await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); };
  const crear = useMutation({
    mutationFn: () => purchaseOrdersApi.create({ ...form, expectedDate: form.expectedDate || undefined, items: items.filter((i) => i.sku.trim()).map((i) => ({ sku: i.sku.trim(), quantity: Number(i.quantity), unitCost: Number(i.unitCost) })) }),
    onSuccess: async () => { setMsg('Orden creada.'); setItems([vacia()]); setForm({ ...form, notes: '', supplierDocNumber: '', supplierName: '' }); await invalidar(); },
    onError: (e) => setMsg(extractApiErrorMessage(e, 'No se pudo crear la orden.')),
  });
  const accion = useMutation({
    mutationFn: ({ id, tipo }: { id: string; tipo: 'aprobar' | 'anular' }) => tipo === 'aprobar' ? purchaseOrdersApi.approve(id) : purchaseOrdersApi.cancel(id),
    onSuccess: async () => { setMsg('Orden actualizada.'); await invalidar(); },
    onError: (e) => setMsg(extractApiErrorMessage(e, 'No se pudo actualizar la orden.')),
  });
  const conversion = useMutation({
    mutationFn: () => purchaseOrdersApi.convert(convertir!.id, { ...doc, issueDate: form.issueDate }),
    onSuccess: async () => { setMsg('Orden convertida en compra.'); setConvertir(null); setDoc({ documentTypeCode: '01', documentSerial: 'F001', documentNumber: '' }); await invalidar(); await queryClient.invalidateQueries({ queryKey: ['purchases'] }); },
    onError: (e) => setMsg(extractApiErrorMessage(e, 'No se pudo convertir la orden.')),
  });
  const consultarRuc = async () => {
    if (form.supplierDocNumber.length !== 11) return;
    try { const { data } = await apiClient.get<{ razonSocial?: string }>(`/sunat/ruc/${form.supplierDocNumber}`); if (data.razonSocial) setForm((f) => ({ ...f, supplierName: data.razonSocial! })); } catch { /* manual */ }
  };
  return (
    <Page>
      <PageHeader title="Órdenes de compra" description="Solicitud aprobada que luego se convierte en compra y recepción" />
      {msg ? <p role="status" className="mb-3 text-xs text-muted-foreground">{msg}</p> : null}
      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs">RUC proveedor<Input value={form.supplierDocNumber} inputMode="numeric" maxLength={11} onBlur={() => void consultarRuc()} onChange={(e) => setForm({ ...form, supplierDocNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })} /></label>
          <label className="text-xs">Razón social<Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></label>
          <label className="text-xs">Fecha orden<Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></label>
          <label className="text-xs">Entrega esperada<Input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} /></label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={form.pricesIncludeIgv} onChange={(e) => setForm({ ...form, pricesIncludeIgv: e.target.checked })} />Los costos ya incluyen IGV</label>
        <div className="mt-3 space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_90px_110px_90px_32px] gap-2">
              <Input placeholder="SKU" value={item.sku} onChange={(e) => setItems((p) => p.map((r, i) => i === idx ? { ...r, sku: e.target.value } : r))} />
              <Input type="number" min="0.0001" value={item.quantity} onChange={(e) => setItems((p) => p.map((r, i) => i === idx ? { ...r, quantity: Number(e.target.value) } : r))} />
              <Input type="number" min="0" value={item.unitCost} onChange={(e) => setItems((p) => p.map((r, i) => i === idx ? { ...r, unitCost: Number(e.target.value) } : r))} />
              <span className="self-center text-right font-mono text-xs">{money((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => setItems((p) => p.length === 1 ? [vacia()] : p.filter((_, i) => i !== idx))}>×</Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setItems((p) => [...p, vacia()])}><Plus className="h-3.5 w-3.5" />Ítem</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs">
          <span>Neto {money(totales.neto)} · IGV {money(totales.igv)} · <strong>Total {money(totales.total)}</strong></span>
          <Button size="sm" onClick={() => crear.mutate()} disabled={crear.isPending || !form.supplierDocNumber || !form.supplierName || !items.some((i) => i.sku.trim())}>{crear.isPending ? 'Creando…' : 'Crear orden'}</Button>
        </div>
      </Card>
      {convertir ? (
        <Card className="mb-4 border-primary/40 p-4">
          <p className="mb-2 text-sm font-semibold">Convertir {convertir.orderNumber} en compra</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="h-9 rounded-md border bg-background px-2 text-xs" value={doc.documentTypeCode} onChange={(e) => setDoc({ ...doc, documentTypeCode: e.target.value })}><option value="01">Factura</option><option value="03">Boleta</option></select>
            <Input placeholder="Serie" value={doc.documentSerial} onChange={(e) => setDoc({ ...doc, documentSerial: e.target.value.toUpperCase() })} />
            <Input placeholder="Número" value={doc.documentNumber} onChange={(e) => setDoc({ ...doc, documentNumber: e.target.value })} />
          </div>
          <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => conversion.mutate()} disabled={conversion.isPending || !doc.documentNumber}>Convertir</Button><Button size="sm" variant="outline" onClick={() => setConvertir(null)}>Cancelar</Button></div>
        </Card>
      ) : null}
      <Card flush>
        <Table><TableHeader><TableRow><TableHead>Orden</TableHead><TableHead>Proveedor</TableHead><TableHead align="right">Total</TableHead><TableHead>Estado</TableHead><TableHead align="right">Acciones</TableHead></TableRow></TableHeader><TableBody>
          {(orders.data ?? []).map((o) => <TableRow key={o.id}>
            <TableCell><p className="font-mono text-xs font-medium">{o.orderNumber}</p><p className="text-[11px] text-muted-foreground">{new Date(o.issueDate).toLocaleDateString('es-PE')}</p></TableCell>
            <TableCell className="text-xs">{o.supplierName}<p className="text-[11px] text-muted-foreground">{o.supplierDocNumber}</p></TableCell>
            <TableCell align="right" className="font-mono text-xs">{money(o.totalAmount)}</TableCell>
            <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
            <TableCell align="right"><div className="flex justify-end gap-1">
              {o.status === 'BORRADOR' ? <Button size="sm" variant="outline" onClick={() => accion.mutate({ id: o.id, tipo: 'aprobar' })}><CheckCircle2 className="h-3.5 w-3.5" />Aprobar</Button> : null}
              {o.status === 'APROBADA' ? <Button size="sm" onClick={() => setConvertir(o)}><RefreshCw className="h-3.5 w-3.5" />Convertir</Button> : null}
              {o.status === 'BORRADOR' || o.status === 'APROBADA' ? <Button size="sm" variant="ghost" className="text-destructive" onClick={() => accion.mutate({ id: o.id, tipo: 'anular' })}><XCircle className="h-3.5 w-3.5" />Anular</Button> : null}
            </div></TableCell>
          </TableRow>)}
          {(orders.data ?? []).length === 0 ? <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground">Sin órdenes registradas.</TableCell></TableRow> : null}
        </TableBody></Table>
      </Card>
    </Page>
  );
}

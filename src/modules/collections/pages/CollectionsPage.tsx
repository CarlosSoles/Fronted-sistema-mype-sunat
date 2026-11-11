import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { collectionsApi } from '../services/collectionsApi';
const money = (n: string | number) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['collections'], queryFn: collectionsApi.list });
  const cartera = useQuery({ queryKey: ['collections-receivables'], queryFn: collectionsApi.receivables });
  const [facturaId, setFacturaId] = useState('');
  const [docEstado, setDocEstado] = useState('');
  const [docConsultado, setDocConsultado] = useState('');
  const estado = useQuery({ queryKey: ['collections-statement', docConsultado], queryFn: () => collectionsApi.statement(docConsultado), enabled: Boolean(docConsultado) });
  const factura = (cartera.data ?? []).find((f) => f.id === facturaId);
  const [form, setForm] = useState({ customerName: '', customerDoc: '', invoiceNumber: '', amount: '', date: new Date().toISOString().slice(0, 10), method: 'TRANSFERENCIA', bank: '' });
  const [error, setError] = useState<string | null>(null);
  const anular = useMutation({ mutationFn: (id: string) => collectionsApi.annul(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['collections'] }); await queryClient.invalidateQueries({ queryKey: ['collections-receivables'] }); }, onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo anular el cobro.') });
  const crear = useMutation({ mutationFn: () => collectionsApi.create({ customerName: form.customerName, customerDoc: form.customerDoc || undefined, invoiceNumber: form.invoiceNumber || undefined, collectionDate: form.date, paymentMethod: form.method, bankName: form.bank || undefined, amount: Number(form.amount) }), onSuccess: async () => { setError(null); setForm({ ...form, customerName: '', customerDoc: '', invoiceNumber: '', amount: '' }); await queryClient.invalidateQueries({ queryKey: ['collections'] }); }, onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo registrar el cobro.') });
  return <Page>
    <PageHeader title="Cobros" description="Cobros de cuentas por cobrar con asiento 10/12" />
    {error ? <Card className="p-4 mb-4 text-sm text-destructive">{error}</Card> : null}
    <Card className="p-4 mb-5"><div className="space-y-3"><label className="text-xs block">Factura por cobrar<select className="mt-1 h-9 w-full rounded border bg-background px-2" value={facturaId} onChange={(e) => { const id = e.target.value; setFacturaId(id); const f = (cartera.data ?? []).find((x) => x.id === id); if (f) setForm({ ...form, customerName: f.customerName, customerDoc: f.customerDoc, invoiceNumber: f.numero, amount: String(f.balance) }); }}><option value="">Seleccionar factura</option>{(cartera.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.numero} · {f.customerName} · saldo S/ {f.balance.toFixed(2)}</option>)}</select></label>{factura ? <p className="text-xs text-muted-foreground">Total S/ {factura.total.toFixed(2)} · NC S/ {factura.credited.toFixed(2)} · cobrado S/ {factura.paid.toFixed(2)} · saldo S/ {factura.balance.toFixed(2)}</p> : null}<div className="grid gap-3 md:grid-cols-3">
      <label className="text-xs">Cliente<Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
      <label className="text-xs">RUC / DNI<Input value={form.customerDoc} onChange={(e) => setForm({ ...form, customerDoc: e.target.value.replace(/\D/g, '').slice(0, 11) })} /></label>
      <label className="text-xs">Comprobante<Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="F001-00000001" /></label>
      <label className="text-xs">Monto<Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
      <label className="text-xs">Fecha<Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
      <label className="text-xs">Método<select className="mt-1 h-9 w-full rounded border bg-background px-2" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>TRANSFERENCIA</option><option>EFECTIVO</option><option>DEPOSITO</option><option>CHEQUE</option></select></label>
      <div className="flex items-end"><Button onClick={() => crear.mutate()} disabled={crear.isPending || !form.customerName || !form.amount}>{crear.isPending ? 'Registrando…' : 'Registrar cobro'}</Button></div>
    </div></div></Card>
    <Card flush><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Comprobante</TableHead><TableHead>Método</TableHead><TableHead>Estado</TableHead><TableHead align="right">Monto</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader><TableBody>
      {isLoading ? <TableRow><TableCell colSpan={7}>Cargando…</TableCell></TableRow> : null}
      {!isLoading && data.length === 0 ? <TableRow><TableCell colSpan={7}>Sin cobros registrados.</TableCell></TableRow> : null}
      {data.map((c) => <TableRow key={c.id}><TableCell>{new Date(c.collection_date).toLocaleDateString('es-PE')}</TableCell><TableCell>{c.customer_name}</TableCell><TableCell>{c.invoice_number ?? '—'}</TableCell><TableCell>{c.payment_method}</TableCell><TableCell>{c.status}</TableCell><TableCell align="right">{money(c.amount)}</TableCell><TableCell align="right">{c.status !== 'ANULADO' ? <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('¿Anular este cobro?')) anular.mutate(c.id); }}>Anular</Button> : null}</TableCell></TableRow>)}
    </TableBody></Table></Card>
<Card className="p-4 mt-5 space-y-3">
        <p className="font-semibold text-sm">Estado de cuenta por cliente</p>
        <div className="flex gap-2 items-end"><label className="text-xs flex-1">RUC / DNI<Input value={docEstado} inputMode="numeric" onChange={(e) => setDocEstado(e.target.value.replace(/\D/g, '').slice(0, 11))} /></label><Button variant="outline" onClick={() => setDocConsultado(docEstado)} disabled={!docEstado}>Consultar</Button></div>
        {estado.data ? <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-4 text-xs"><span>Total: <strong>S/ {estado.data.totals.total.toFixed(2)}</strong></span><span>NC: <strong>S/ {estado.data.totals.credited.toFixed(2)}</strong></span><span>Cobrado: <strong>S/ {estado.data.totals.paid.toFixed(2)}</strong></span><span>Saldo: <strong>S/ {estado.data.totals.balance.toFixed(2)}</strong></span></div>
          <Table><TableHeader><TableRow><TableHead>Factura</TableHead><TableHead>Fecha</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">NC</TableHead><TableHead align="right">Cobrado</TableHead><TableHead align="right">Saldo</TableHead></TableRow></TableHeader><TableBody>{estado.data.invoices.map((f) => <TableRow key={f.id}><TableCell>{f.numero}</TableCell><TableCell>{new Date(f.date).toLocaleDateString('es-PE')}</TableCell><TableCell align="right">{money(f.total)}</TableCell><TableCell align="right">{money(f.credited)}</TableCell><TableCell align="right">{money(f.paid)}</TableCell><TableCell align="right">{money(f.balance)}</TableCell></TableRow>)}</TableBody></Table>
        </div> : docConsultado ? <p className="text-xs text-muted-foreground">Sin facturas para ese documento.</p> : null}
      </Card>
  </Page>;
}

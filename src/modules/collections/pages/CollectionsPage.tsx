import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { collectionsApi } from '../services/collectionsApi';
const money = (n: string | number) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['collections'], queryFn: collectionsApi.list });
  const [form, setForm] = useState({ customerName: '', customerDoc: '', invoiceNumber: '', amount: '', date: new Date().toISOString().slice(0, 10), method: 'TRANSFERENCIA', bank: '' });
  const [error, setError] = useState<string | null>(null);
  const crear = useMutation({ mutationFn: () => collectionsApi.create({ customerName: form.customerName, customerDoc: form.customerDoc || undefined, invoiceNumber: form.invoiceNumber || undefined, collectionDate: form.date, paymentMethod: form.method, bankName: form.bank || undefined, amount: Number(form.amount) }), onSuccess: async () => { setError(null); setForm({ ...form, customerName: '', customerDoc: '', invoiceNumber: '', amount: '' }); await queryClient.invalidateQueries({ queryKey: ['collections'] }); }, onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo registrar el cobro.') });
  return <Page>
    <PageHeader title="Cobros" description="Cobros de cuentas por cobrar con asiento 10/12" />
    {error ? <Card className="p-4 mb-4 text-sm text-destructive">{error}</Card> : null}
    <Card className="p-4 mb-5"><div className="grid gap-3 md:grid-cols-3">
      <label className="text-xs">Cliente<Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
      <label className="text-xs">RUC / DNI<Input value={form.customerDoc} onChange={(e) => setForm({ ...form, customerDoc: e.target.value.replace(/\D/g, '').slice(0, 11) })} /></label>
      <label className="text-xs">Comprobante<Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="F001-00000001" /></label>
      <label className="text-xs">Monto<Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
      <label className="text-xs">Fecha<Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
      <label className="text-xs">Método<select className="mt-1 h-9 w-full rounded border bg-background px-2" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>TRANSFERENCIA</option><option>EFECTIVO</option><option>DEPOSITO</option><option>CHEQUE</option></select></label>
      <div className="flex items-end"><Button onClick={() => crear.mutate()} disabled={crear.isPending || !form.customerName || !form.amount}>{crear.isPending ? 'Registrando…' : 'Registrar cobro'}</Button></div>
    </div></Card>
    <Card flush><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Comprobante</TableHead><TableHead>Método</TableHead><TableHead align="right">Monto</TableHead></TableRow></TableHeader><TableBody>
      {isLoading ? <TableRow><TableCell colSpan={5}>Cargando…</TableCell></TableRow> : null}
      {!isLoading && data.length === 0 ? <TableRow><TableCell colSpan={5}>Sin cobros registrados.</TableCell></TableRow> : null}
      {data.map((c) => <TableRow key={c.id}><TableCell>{new Date(c.collection_date).toLocaleDateString('es-PE')}</TableCell><TableCell>{c.customer_name}</TableCell><TableCell>{c.invoice_number ?? '—'}</TableCell><TableCell>{c.payment_method}</TableCell><TableCell align="right">{money(c.amount)}</TableCell></TableRow>)}
    </TableBody></Table></Card>
  </Page>;
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { collectionsApi } from '../services/collectionsApi';
import { accountingApi } from '@/modules/accounting/services/accountingApi';
import { AccountDistributionEditor, toDistributionPayload, type DistributionRow } from '@/modules/accounting/components/AccountDistributionEditor';
const descargarCsv = (nombre: string, filas: Array<Array<string | number>>) => {
  const contenido = filas.map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click(); URL.revokeObjectURL(url);
};
const money = (n: string | number) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['collections'], queryFn: collectionsApi.list });
  const cartera = useQuery({ queryKey: ['collections-receivables'], queryFn: collectionsApi.receivables });
  const carteraTotal = useQuery({ queryKey: ['collections-portfolio'], queryFn: collectionsApi.portfolio });
  const conciliacion = useQuery({ queryKey: ['collections-reconciliation'], queryFn: collectionsApi.reconciliation });
  const [facturaId, setFacturaId] = useState('');
  const [docEstado, setDocEstado] = useState('');
  const [docConsultado, setDocConsultado] = useState('');
  const [historial, setHistorial] = useState<{ invoice: { numero: string; customerName: string; total: number }; collections: Array<{ id: string; date: string; amount: number; paymentMethod: string; bankName?: string | null; status: string }>; paid: number } | null>(null);
  const estado = useQuery({ queryKey: ['collections-statement', docConsultado], queryFn: () => collectionsApi.statement(docConsultado), enabled: Boolean(docConsultado) });
  const factura = (cartera.data ?? []).find((f) => f.id === facturaId);
  const [form, setForm] = useState({ customerName: '', customerDoc: '', invoiceNumber: '', amount: '', date: new Date().toISOString().slice(0, 10), method: 'TRANSFERENCIA', bank: '', treasuryAccountId: '' });
  /** Reparto del cobro entre varias cuentas por cobrar (tarea 2). */
  const [dist, setDist] = useState<DistributionRow[]>([]);
  const cuentas = useQuery({ queryKey: ['accounting-accounts'], queryFn: accountingApi.getAccounts });
  const tesoreria = useQuery({ queryKey: ['treasury-accounts'], queryFn: accountingApi.getTreasuryAccounts });
  const filasDist = toDistributionPayload(dist);
  const repartido = filasDist.reduce((s, d) => s + (d.amount ?? 0), 0);
  const distCuadra = dist.length === 0 || Math.abs(repartido - (Number(form.amount) || 0)) <= 0.01;
  const [error, setError] = useState<string | null>(null);
  const anular = useMutation({ mutationFn: (id: string) => collectionsApi.annul(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['collections'] }); await queryClient.invalidateQueries({ queryKey: ['collections-receivables'] }); }, onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo anular el cobro.') });
  const crear = useMutation({ mutationFn: () => collectionsApi.create({ customerName: form.customerName, customerDoc: form.customerDoc || undefined, invoiceNumber: form.invoiceNumber || undefined, collectionDate: form.date, paymentMethod: form.method, bankName: form.bank || undefined, amount: Number(form.amount), treasuryAccountId: form.treasuryAccountId || undefined, distributions: filasDist.length > 0 ? filasDist : undefined }), onSuccess: async () => { setError(null); setDist([]); setForm({ ...form, customerName: '', customerDoc: '', invoiceNumber: '', amount: '' }); await queryClient.invalidateQueries({ queryKey: ['collections'] }); }, onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo registrar el cobro.') });
  return <Page>
    <PageHeader title="Cuentas por cobrar" description="Cartera, estado de cuenta y cobros con asiento 10/12" />
    {carteraTotal.data ? <Card className="p-4 mb-4 space-y-2"><div className="flex flex-wrap justify-between gap-2 text-sm"><span><Button size="sm" variant="ghost" onClick={() => { if (!carteraTotal.data) return; descargarCsv('cartera.csv', [['Documento','Cliente','Saldo'], ...carteraTotal.data.debtors.map((d) => [d.doc, d.name, d.balance.toFixed(2)])]); }}>Exportar</Button> Cartera: <strong>{money(carteraTotal.data.total)}</strong> · {carteraTotal.data.invoiceCount} facturas</span><span className="text-xs text-muted-foreground">0–30: {money(carteraTotal.data.aging.d0_30)} · 31–60: {money(carteraTotal.data.aging.d31_60)} · 61–90: {money(carteraTotal.data.aging.d61_90)} · +90: {money(carteraTotal.data.aging.d90_plus)}</span></div>{carteraTotal.data.debtors.length > 0 ? <>{carteraTotal.data.overdue.count > 0 ? <p className="text-xs text-destructive">Vencido (+30 días): {money(carteraTotal.data.overdue.total)} · {carteraTotal.data.overdue.count} facturas</p> : null}<p className="text-xs text-muted-foreground">Mayor deudor: {carteraTotal.data.debtors[0].name || carteraTotal.data.debtors[0].doc} · {money(carteraTotal.data.debtors[0].balance)}</p></> : null}</Card> : null}
    {conciliacion.data ? <Card className={`p-4 mb-4 text-xs ${conciliacion.data.reconciled ? 'text-emerald-600' : 'text-destructive'}`}>Conciliación 121: cartera {money(conciliacion.data.receivable)} · contabilidad {money(conciliacion.data.accounting)} · diferencia {money(conciliacion.data.difference)} · {conciliacion.data.reconciled ? 'conciliado' : 'revisar'}</Card> : null}
    {error ? <Card className="p-4 mb-4 text-sm text-destructive">{error}</Card> : null}
    <Card className="p-4 mb-5"><div className="space-y-3"><label className="text-xs block">Factura por cobrar<select className="mt-1 h-9 w-full rounded border bg-background px-2" value={facturaId} onChange={(e) => { const id = e.target.value; setFacturaId(id); const f = (cartera.data ?? []).find((x) => x.id === id); if (f) setForm({ ...form, customerName: f.customerName, customerDoc: f.customerDoc, invoiceNumber: f.numero, amount: String(f.balance) }); }}><option value="">Seleccionar factura</option>{(cartera.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.numero} · {f.customerName} · saldo S/ {f.balance.toFixed(2)}</option>)}</select></label>{factura ? <p className="text-xs text-muted-foreground">Total S/ {factura.total.toFixed(2)} · NC S/ {factura.credited.toFixed(2)} · cobrado S/ {factura.paid.toFixed(2)} · saldo S/ {factura.balance.toFixed(2)}</p> : null}<div className="grid gap-3 md:grid-cols-3">
      <label className="text-xs">Cliente<Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
      <label className="text-xs">RUC / DNI<Input value={form.customerDoc} onChange={(e) => setForm({ ...form, customerDoc: e.target.value.replace(/\D/g, '').slice(0, 11) })} /></label>
      <label className="text-xs">Comprobante<Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="F001-00000001" /></label>
      <label className="text-xs">Monto<Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
      <label className="text-xs">Fecha<Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
      <label className="text-xs">Método<select className="mt-1 h-9 w-full rounded border bg-background px-2" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>TRANSFERENCIA</option><option>EFECTIVO</option><option>DEPOSITO</option><option>CHEQUE</option></select></label>
      <label className="text-xs">Cuenta de tesorería (caja o banco)
        <select className="mt-1 h-9 w-full rounded border bg-background px-2" value={form.treasuryAccountId} onChange={(e) => setForm({ ...form, treasuryAccountId: e.target.value })}>
          <option value="">Usar la cuenta de la regla COBRO</option>
          {(tesoreria.data ?? []).filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name}</option>)}
        </select>
      </label>
      <div className="flex items-end"><Button onClick={() => crear.mutate()} disabled={crear.isPending || !form.customerName || !form.amount || !distCuadra}>{crear.isPending ? 'Registrando…' : 'Registrar cobro'}</Button></div>
      </div>
      <div className="mt-3">
        <AccountDistributionEditor
          label="Distribución del cobro entre cuentas por cobrar (opcional)"
          total={Number(form.amount) || 0}
          accounts={cuentas.data ?? []}
          rows={dist}
          onChange={setDist}
        />
        {!distCuadra ? <p className="mt-1 text-[11px] text-destructive">El reparto debe sumar el importe cobrado para poder registrarlo.</p> : null}
      </div>
    </div></Card>
    <Card flush><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Comprobante</TableHead><TableHead>Método</TableHead><TableHead>Estado</TableHead><TableHead align="right">Monto</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader><TableBody>
      {isLoading ? <TableRow><TableCell colSpan={7}>Cargando…</TableCell></TableRow> : null}
      {!isLoading && data.length === 0 ? <TableRow><TableCell colSpan={7}>Sin cobros registrados.</TableCell></TableRow> : null}
      {data.map((c) => <TableRow key={c.id}><TableCell>{new Date(c.collection_date).toLocaleDateString('es-PE')}</TableCell><TableCell>{c.customer_name}</TableCell><TableCell>{c.invoice_number ?? '—'}</TableCell><TableCell>{c.payment_method}</TableCell><TableCell>{c.status}</TableCell><TableCell align="right">{money(c.amount)}</TableCell><TableCell align="right">{c.status !== 'ANULADO' ? <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('¿Anular este cobro?')) anular.mutate(c.id); }}>Anular</Button> : null}</TableCell></TableRow>)}
    </TableBody></Table></Card>
<Card className="p-4 mt-5 space-y-3">
        <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm">Estado de cuenta por cliente</p>{estado.data ? <Button size="sm" variant="outline" onClick={() => descargarCsv(`estado-${estado.data.customerDoc}.csv`, [["Factura", "Fecha", "Total", "NC", "Cobrado", "Saldo"], ...estado.data.invoices.map((f) => [f.numero, f.date.slice(0, 10), f.total.toFixed(2), f.credited.toFixed(2), f.paid.toFixed(2), f.balance.toFixed(2)]), ["TOTAL", "", estado.data.totals.total.toFixed(2), estado.data.totals.credited.toFixed(2), estado.data.totals.paid.toFixed(2), estado.data.totals.balance.toFixed(2)]])}>Exportar CSV</Button> : null}</div>
        <div className="flex gap-2 items-end"><label className="text-xs flex-1">RUC / DNI<Input value={docEstado} inputMode="numeric" onChange={(e) => setDocEstado(e.target.value.replace(/\D/g, '').slice(0, 11))} /></label><Button variant="outline" onClick={() => setDocConsultado(docEstado)} disabled={!docEstado}>Consultar</Button></div>
        {estado.data ? <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-4 text-xs"><span>Total: <strong>S/ {estado.data.totals.total.toFixed(2)}</strong></span><span>NC: <strong>S/ {estado.data.totals.credited.toFixed(2)}</strong></span><span>Cobrado: <strong>S/ {estado.data.totals.paid.toFixed(2)}</strong></span><span>Saldo: <strong>S/ {estado.data.totals.balance.toFixed(2)}</strong></span></div>
          <div className="grid gap-2 sm:grid-cols-4 text-xs"><span>0–30 días: <strong>S/ {estado.data.aging.d0_30.toFixed(2)}</strong></span><span>31–60: <strong>S/ {estado.data.aging.d31_60.toFixed(2)}</strong></span><span>61–90: <strong>S/ {estado.data.aging.d61_90.toFixed(2)}</strong></span><span>+90: <strong>S/ {estado.data.aging.d90_plus.toFixed(2)}</strong></span></div>
          <Table><TableHeader><TableRow><TableHead>Factura</TableHead><TableHead>Fecha</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">NC</TableHead><TableHead align="right">Cobrado</TableHead><TableHead align="right">Saldo</TableHead><TableHead align="right">Cobros</TableHead></TableRow></TableHeader><TableBody>{estado.data.invoices.map((f) => <TableRow key={f.id}><TableCell>{f.numero}</TableCell><TableCell>{new Date(f.date).toLocaleDateString('es-PE')}</TableCell><TableCell align="right">{money(f.total)}</TableCell><TableCell align="right">{money(f.credited)}</TableCell><TableCell align="right">{money(f.paid)}</TableCell><TableCell align="right">{money(f.balance)}</TableCell><TableCell align="right"><Button size="sm" variant="ghost" onClick={async () => { try { setHistorial(await collectionsApi.invoiceCollections(f.id)); } catch { setError('No se pudo cargar el historial.'); } }}>Ver</Button></TableCell></TableRow>)}</TableBody></Table>
        </div> : docConsultado ? <p className="text-xs text-muted-foreground">Sin facturas para ese documento.</p> : null}
      </Card>
<Dialog open={historial !== null} onOpenChange={(open) => { if (!open) setHistorial(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Cobros de {historial?.invoice.numero}</DialogTitle><DialogDescription>{historial?.invoice.customerName} · Total {historial ? money(historial.invoice.total) : ''} · Abonado {historial ? money(historial.paid) : ''}</DialogDescription></DialogHeader>
          <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Método</TableHead><TableHead>Cobro</TableHead><TableHead align="right">Monto</TableHead></TableRow></TableHeader><TableBody>{(historial?.collections ?? []).map((c) => <TableRow key={c.id}><TableCell>{new Date(c.date).toLocaleDateString('es-PE')}</TableCell><TableCell>{c.paymentMethod}{c.bankName ? ` · ${c.bankName}` : ''}</TableCell><TableCell>{c.status}</TableCell><TableCell align="right">{money(c.amount)}</TableCell></TableRow>)}{(historial?.collections ?? []).length === 0 ? <TableRow><TableCell colSpan={4}>Sin cobros.</TableCell></TableRow> : null}</TableBody></Table>
        </DialogContent>
      </Dialog>
  </Page>;
}

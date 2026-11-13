import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { inventoryPurchasesApi } from '../services/inventoryPurchasesApi';
import { masterDataApi } from '@/modules/customs/services/masterDataApi';
import { PartnerFormDialog } from '@/modules/customs/components/PartnerFormDialog';
import { extractApiErrorMessage } from '@/lib/apiErrors';

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PurchasesPayablesPage() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ['purchase-payables'], queryFn: () => inventoryPurchasesApi.listPayables() });
  const queryClient = useQueryClient();
  const [abrirAlta, setAbrirAlta] = useState(false);
  const { data: proveedores = [] } = useQuery({ queryKey: ['payables-suppliers'], queryFn: () => masterDataApi.getPartners({ role: 'PROVEEDOR' }), enabled: abrirAlta });
  const [errorAlta, setErrorAlta] = useState('');
  const [nuevoProveedor, setNuevoProveedor] = useState(false);
  const [moneda, setMoneda] = useState('PEN');
  const [tipoCambio, setTipoCambio] = useState('');
  const [proveedorTexto, setProveedorTexto] = useState('');
  const [rucTexto, setRucTexto] = useState('');
  const [listaAbierta, setListaAbierta] = useState<'proveedor' | 'ruc' | null>(null);
  const [form, setForm] = useState({ supplierName: '', supplierDocNumber: '', description: '', amount: '', issueDate: new Date().toISOString().slice(0, 10) });
  const crear = useMutation({
    mutationFn: () => inventoryPurchasesApi.createManualPayable({ supplierName: form.supplierName, supplierDocNumber: form.supplierDocNumber, description: form.description, amount: Number(form.amount), issueDate: form.issueDate, currencyCode: moneda, exchangeRate: moneda === 'USD' ? Number(tipoCambio) : undefined }),
    onSuccess: async () => { setAbrirAlta(false); setForm({ supplierName: '', supplierDocNumber: '', description: '', amount: '', issueDate: new Date().toISOString().slice(0, 10) }); setMoneda('PEN'); setTipoCambio(''); setProveedorTexto(''); setRucTexto(''); setListaAbierta(null); setErrorAlta(''); await queryClient.invalidateQueries({ queryKey: ['purchase-payables'] }); },
    onError: (e: unknown) => setErrorAlta(extractApiErrorMessage(e, 'No se pudo crear la CxP.')),
  });
  const [statement, setStatement] = useState<Awaited<ReturnType<typeof inventoryPurchasesApi.supplierStatement>> | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const verEstado = async (doc: string) => { setLoadingStatement(true); try { setStatement(await inventoryPurchasesApi.supplierStatement(doc)); } finally { setLoadingStatement(false); } };
  const total = data.reduce((a, c) => a + c.balance, 0);
  const vencido = data.reduce((a, c) => a + c.overdue, 0);
  return (
    <Page>
      <PageHeader title="Cuentas por pagar" description="Saldo pendiente por proveedor, consolidado de compras no anuladas">
        <Button size="sm" onClick={() => { setProveedorTexto(''); setRucTexto(''); setListaAbierta(null); setForm({ ...form, supplierDocNumber: '', supplierName: '' }); setAbrirAlta(true); }}>Nueva CxP</Button>
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-4 mb-5">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Proveedores</p><p className="text-2xl font-bold">{data.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Documentos</p><p className="text-2xl font-bold">{data.reduce((a, c) => a + c.count, 0)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Saldo total</p><p className="text-2xl font-bold">{money(total)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Vencido (+30 días)</p><p className={`text-2xl font-bold ${vencido > 0 ? 'text-destructive' : ''}`}>{money(vencido)}</p></Card>
      </div>
      <Card flush>
        <Table>
          <TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead>RUC</TableHead><TableHead align="right">Documentos</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">Pagado</TableHead><TableHead align="right">Saldo</TableHead><TableHead>0–30</TableHead><TableHead>31–60</TableHead><TableHead>61–90</TableHead><TableHead>+90</TableHead><TableHead>Estado</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={13}>Cargando…</TableCell></TableRow> : null}
            {!isLoading && data.length === 0 ? <TableRow><TableCell colSpan={13}>Sin cuentas por pagar.</TableCell></TableRow> : null}
            {data.map((c) => <TableRow key={c.supplierDocNumber}><TableCell>{c.supplierName}</TableCell><TableCell className="font-mono text-xs">{c.supplierDocNumber}</TableCell><TableCell align="right">{c.count}</TableCell><TableCell align="right">{money(c.total)}</TableCell><TableCell align="right">{money(c.paid)}</TableCell><TableCell align="right">{money(c.balance)}</TableCell><TableCell align="right">{money(c.aging.d0_30)}</TableCell><TableCell align="right">{money(c.aging.d31_60)}</TableCell><TableCell align="right">{money(c.aging.d61_90)}</TableCell><TableCell align="right">{money(c.aging.d90_plus)}</TableCell><TableCell><Badge variant={c.balance <= 0.005 ? 'outline' : c.overdue > 0 ? 'destructive' : 'secondary'}>{c.balance <= 0.005 ? 'PAGADO' : c.overdue > 0 ? 'VENCIDO' : 'PENDIENTE'}</Badge></TableCell><TableCell align="right"><Button size="sm" variant="ghost" disabled={loadingStatement} onClick={() => void verEstado(c.supplierDocNumber)}>Estado</Button></TableCell></TableRow>)}
          </TableBody>
        </Table>
      </Card>
      {error ? <Card className="p-4 mt-4 text-sm text-destructive">No se pudieron cargar las cuentas por pagar.</Card> : null}
      <Dialog open={statement !== null} onOpenChange={(open) => { if (!open) setStatement(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Estado de cuenta {statement?.supplierDoc}</DialogTitle><DialogDescription>Total {money(statement?.totals.total ?? 0)} · Pagado {money(statement?.totals.paid ?? 0)} · Saldo {money(statement?.totals.balance ?? 0)}</DialogDescription></DialogHeader>
          <Table><TableHeader><TableRow><TableHead>Compra</TableHead><TableHead>Fecha</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">Pagado</TableHead><TableHead align="right">Saldo</TableHead></TableRow></TableHeader><TableBody>{(statement?.purchases ?? []).map((p) => <TableRow key={p.id}><TableCell>{p.number}</TableCell><TableCell>{new Date(p.date).toLocaleDateString('es-PE')}</TableCell><TableCell align="right">{money(p.total)}</TableCell><TableCell align="right">{money(p.paid)}</TableCell><TableCell align="right">{money(p.balance)}</TableCell></TableRow>)}</TableBody></Table>
          <p className="text-xs text-muted-foreground">Pagos registrados: {(statement?.payments ?? []).length}</p>
        </DialogContent>
      </Dialog>
      <Dialog open={abrirAlta} onOpenChange={setAbrirAlta}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva cuenta por pagar</DialogTitle><DialogDescription>Registra una obligación sin compra de inventario. Genera asiento GASTO/421.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs block">Proveedor<Input value={proveedorTexto} placeholder="Escriba o haga clic para ver la lista" onFocus={() => setListaAbierta('proveedor')} onChange={(e) => { setProveedorTexto(e.target.value); setListaAbierta('proveedor'); const exacto = proveedores.find((p) => p.legal_name.toLowerCase() === e.target.value.trim().toLowerCase()); if (exacto) setForm({ ...form, supplierDocNumber: exacto.doc_number, supplierName: exacto.legal_name }); }} /></label>
                {listaAbierta === 'proveedor' ? <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-background shadow">
                  {proveedores.filter((p) => !proveedorTexto.trim() || p.legal_name.toLowerCase().includes(proveedorTexto.trim().toLowerCase()) || p.doc_number.includes(proveedorTexto.trim())).slice(0, 8).map((p) => <button key={p.id} type="button" className="block w-full px-2 py-1 text-left text-xs hover:bg-muted" onClick={() => { setForm({ ...form, supplierDocNumber: p.doc_number, supplierName: p.legal_name }); setProveedorTexto(p.legal_name); setRucTexto(p.doc_number); setListaAbierta(null); }}>{p.legal_name} · {p.doc_number}</button>)}
                  {proveedores.length === 0 ? <p className="p-2 text-xs text-muted-foreground">No hay proveedores registrados.</p> : null}
                </div> : null}
              </div>
              <div>
                <label className="text-xs block">RUC<Input value={rucTexto} inputMode="numeric" maxLength={11} placeholder="Haga clic para ver la lista" onFocus={() => setListaAbierta('ruc')} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); setRucTexto(v); setListaAbierta('ruc'); const exacto = proveedores.find((p) => p.doc_number === v); if (exacto) setForm({ ...form, supplierDocNumber: exacto.doc_number, supplierName: exacto.legal_name }); }} /></label>
                {listaAbierta === 'ruc' ? <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-background shadow">
                  {proveedores.filter((p) => !rucTexto.trim() || p.doc_number.includes(rucTexto.trim())).slice(0, 8).map((p) => <button key={p.id} type="button" className="block w-full px-2 py-1 text-left text-xs hover:bg-muted" onClick={() => { setForm({ ...form, supplierDocNumber: p.doc_number, supplierName: p.legal_name }); setProveedorTexto(p.legal_name); setRucTexto(p.doc_number); setListaAbierta(null); }}>{p.doc_number} · {p.legal_name}</button>)}
                  {proveedores.length === 0 ? <p className="p-2 text-xs text-muted-foreground">No hay proveedores registrados.</p> : null}
                </div> : null}
              </div>
            </div>
            {form.supplierName ? <p className="text-[11px] text-emerald-600">Proveedor: {form.supplierName} · {form.supplierDocNumber}</p> : null}
            {(rucTexto.length === 11 && !proveedores.some((p) => p.doc_number === rucTexto)) || (proveedorTexto.trim().length >= 2 && !proveedores.some((p) => p.legal_name.toLowerCase().includes(proveedorTexto.trim().toLowerCase()))) ? <Button type="button" size="sm" variant="ghost" onClick={() => { setForm({ ...form, supplierDocNumber: rucTexto }); setNuevoProveedor(true); }}>+ Registrar proveedor nuevo</Button> : null}
            <label className="text-xs block">Concepto<Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="text-xs block">Moneda<select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={moneda} onChange={(e) => setMoneda(e.target.value)}><option value="PEN">PEN — Soles</option><option value="USD">USD — Dólares</option></select></label>
            <label className="text-xs block">Monto ({moneda})<Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />{form.amount !== '' && Number(form.amount) <= 0 ? <span className="text-[10px] text-destructive">El monto debe ser mayor a cero.</span> : null}</label>
            {moneda === 'USD' ? <label className="text-xs block">Tipo de cambio<Input type="number" min="0.000001" step="0.001" value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} />{form.amount && tipoCambio ? <span className="text-[10px] text-muted-foreground">Equivalente: S/ {(Number(form.amount) * Number(tipoCambio)).toFixed(2)}</span> : null}</label> : null}
            <label className="text-xs block">Fecha<Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></label>
            {errorAlta ? <p className="text-xs text-destructive">{errorAlta}</p> : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAbrirAlta(false)}>Cancelar</Button><Button onClick={() => crear.mutate()} disabled={crear.isPending || !form.supplierName || form.supplierDocNumber.length !== 11 || !form.description || !(Number(form.amount) > 0) || (moneda === 'USD' && !(Number(tipoCambio) > 0))}>{crear.isPending ? 'Guardando…' : 'Crear CxP'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {nuevoProveedor ? <PartnerFormDialog initialRole="PROVEEDOR" requiredRole="PROVEEDOR" initialDocument={form.supplierDocNumber} initialName={form.supplierName} onClose={() => setNuevoProveedor(false)} onSaved={(p) => { setForm({ ...form, supplierDocNumber: p.doc_number, supplierName: p.legal_name }); setNuevoProveedor(false); void queryClient.invalidateQueries({ queryKey: ['payables-suppliers'] }); }} /> : null}
    </Page>
  );
}

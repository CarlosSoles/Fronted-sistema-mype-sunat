import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { inventoryPurchasesApi } from '../services/inventoryPurchasesApi';
import { masterDataApi } from '@/modules/customs/services/masterDataApi';

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PurchasesPayablesPage() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ['purchase-payables'], queryFn: () => inventoryPurchasesApi.listPayables() });
  const queryClient = useQueryClient();
  const [abrirAlta, setAbrirAlta] = useState(false);
  const { data: proveedores = [] } = useQuery({ queryKey: ['payables-suppliers'], queryFn: () => masterDataApi.getPartners({ role: 'PROVEEDOR' }), enabled: abrirAlta });
  const [errorAlta, setErrorAlta] = useState('');
  const [form, setForm] = useState({ supplierName: '', supplierDocNumber: '', description: '', amount: '', issueDate: new Date().toISOString().slice(0, 10) });
  const crear = useMutation({
    mutationFn: () => inventoryPurchasesApi.createManualPayable({ supplierName: form.supplierName, supplierDocNumber: form.supplierDocNumber, description: form.description, amount: Number(form.amount), issueDate: form.issueDate }),
    onSuccess: async () => { setAbrirAlta(false); setForm({ supplierName: '', supplierDocNumber: '', description: '', amount: '', issueDate: new Date().toISOString().slice(0, 10) }); setErrorAlta(''); await queryClient.invalidateQueries({ queryKey: ['purchase-payables'] }); },
    onError: (e: any) => setErrorAlta(e?.response?.data?.message ?? 'No se pudo crear la CxP.'),
  });
  const [statement, setStatement] = useState<Awaited<ReturnType<typeof inventoryPurchasesApi.supplierStatement>> | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const verEstado = async (doc: string) => { setLoadingStatement(true); try { setStatement(await inventoryPurchasesApi.supplierStatement(doc)); } finally { setLoadingStatement(false); } };
  const total = data.reduce((a, c) => a + c.balance, 0);
  const vencido = data.reduce((a, c) => a + c.overdue, 0);
  return (
    <Page>
      <PageHeader title="Cuentas por pagar" description="Saldo pendiente por proveedor, consolidado de compras no anuladas">
        <Button size="sm" onClick={() => setAbrirAlta(true)}>Nueva CxP</Button>
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
            <label className="text-xs block">Proveedor<select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.supplierDocNumber} onChange={(e) => { const p = proveedores.find((x) => x.doc_number === e.target.value); setForm({ ...form, supplierDocNumber: e.target.value, supplierName: p?.legal_name ?? '' }); }}><option value="">Seleccionar proveedor</option>{proveedores.map((p) => <option key={p.id} value={p.doc_number}>{p.legal_name} · {p.doc_number}</option>)}</select></label>
            <label className="text-xs block">RUC<Input value={form.supplierDocNumber} readOnly /></label>
            <label className="text-xs block">Concepto<Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="text-xs block">Monto<Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
            <label className="text-xs block">Fecha<Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></label>
            {errorAlta ? <p className="text-xs text-destructive">{errorAlta}</p> : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAbrirAlta(false)}>Cancelar</Button><Button onClick={() => crear.mutate()} disabled={crear.isPending || !form.supplierName || form.supplierDocNumber.length !== 11 || !form.description || !form.amount}>{crear.isPending ? 'Guardando…' : 'Crear CxP'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

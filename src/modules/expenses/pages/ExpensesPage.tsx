import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { expensesApi } from '../services/expensesApi';
import { accountingApi } from '@/modules/accounting/services/accountingApi';
import { AccountDistributionEditor, toDistributionPayload, type DistributionRow } from '@/modules/accounting/components/AccountDistributionEditor';
import { rucValido } from '@/modules/invoices/lib/invoiceEmitValidation';

const money = (n: string | number) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list });
  const [form, setForm] = useState({ description: '', supplierName: '', supplierDoc: '', documentNumber: '', expenseDate: new Date().toISOString().slice(0, 10), baseAmount: '', igvAmount: '', totalAmount: '' });
  const [error, setError] = useState<string | null>(null);
  const [pagos, setPagos] = useState<Array<{ id: string; date: string; amount: number; paymentMethod: string; bankName?: string | null; concept: string }> | null>(null);
  /** Reparto de la base entre varias cuentas contables (tarea 2). */
  const [dist, setDist] = useState<DistributionRow[]>([]);
  /** Diálogo de pago: importe y subcuenta de tesorería (tarea 3). */
  const [pago, setPago] = useState<{ id: string; amount: string; treasuryAccountId: string } | null>(null);

  const cuentas = useQuery({ queryKey: ['accounting-accounts'], queryFn: accountingApi.getAccounts });
  const tesoreria = useQuery({ queryKey: ['treasury-accounts'], queryFn: accountingApi.getTreasuryAccounts });

  const base = Number(form.baseAmount) || 0;
  const filasDist = useMemo(() => toDistributionPayload(dist), [dist]);
  const repartido = filasDist.reduce((s, d) => s + (d.amount ?? 0), 0);
  const distCuadra = dist.length === 0 || Math.abs(repartido - base) <= 0.01;

  const rucOk = !form.supplierDoc || rucValido(form.supplierDoc);
  const anular = useMutation({ mutationFn: (id: string) => expensesApi.annul(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['expenses'] }); }, onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo anular el gasto.') });
  const verPagos = async (id: string) => { try { setPagos(await expensesApi.listPayments(id)); } catch { setError('No se pudo cargar el historial de pagos.'); } };
  const pagar = useMutation({
    mutationFn: (datos: { id: string; amount: number; treasuryAccountId?: string }) =>
      expensesApi.pay(datos.id, datos.amount, datos.treasuryAccountId),
    onSuccess: async () => { setPago(null); await queryClient.invalidateQueries({ queryKey: ['expenses'] }); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo pagar el gasto.'),
  });
  const crear = useMutation({
    mutationFn: () => expensesApi.create({
      description: form.description,
      supplierName: form.supplierName,
      supplierDoc: form.supplierDoc || undefined,
      documentNumber: form.documentNumber || undefined,
      expenseDate: form.expenseDate,
      baseAmount: Number(form.baseAmount),
      igvAmount: Number(form.igvAmount),
      totalAmount: Number(form.totalAmount),
      distributions: filasDist.length > 0 ? filasDist : undefined,
    }),
    onSuccess: async () => {
      setError(null);
      setDist([]);
      setForm({ ...form, description: '', supplierName: '', supplierDoc: '', documentNumber: '', baseAmount: '', igvAmount: '', totalAmount: '' });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo registrar el gasto.'),
  });

  return (
    <Page>
      <PageHeader title="Gastos" description="Gastos operativos con IGV, distribución por cuentas y asiento contable automático" />
      {error ? <Card className="p-4 mb-4 text-sm text-destructive">{error}</Card> : null}
      <Card className="p-4 mb-5">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs">Descripción<Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="text-xs">Proveedor<Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></label>
          <label className="text-xs">RUC<Input value={form.supplierDoc} inputMode="numeric" maxLength={11} onChange={(e) => setForm({ ...form, supplierDoc: e.target.value.replace(/\D/g, '').slice(0, 11) })} />{!rucOk ? <span className="text-[10px] text-destructive">RUC inválido (módulo 11)</span> : null}</label>
          <label className="text-xs">Documento<Input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} /></label>
          <label className="text-xs">Fecha<Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} /></label>
          <label className="text-xs">Base<Input type="number" value={form.baseAmount} onChange={(e) => setForm({ ...form, baseAmount: e.target.value })} /></label>
          <label className="text-xs">IGV<Input type="number" value={form.igvAmount} onChange={(e) => setForm({ ...form, igvAmount: e.target.value })} /></label>
          <label className="text-xs">Total<Input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} /></label>
          <div className="flex items-end"><Button onClick={() => crear.mutate()} disabled={crear.isPending || !form.description || !form.supplierName || !rucOk || !distCuadra}>{crear.isPending ? 'Registrando…' : 'Registrar gasto'}</Button></div>
        </div>
        <div className="mt-4">
          <AccountDistributionEditor
            label="Distribución de la base entre cuentas contables (opcional)"
            total={base}
            accounts={cuentas.data ?? []}
            rows={dist}
            onChange={setDist}
          />
          {!distCuadra ? <p className="mt-1 text-[11px] text-destructive">El reparto debe sumar la base ({money(base)}) para poder registrar el gasto.</p> : null}
        </div>
      </Card>
      <Card flush><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Proveedor</TableHead><TableHead>Descripción</TableHead><TableHead>Estado</TableHead><TableHead align="right">Base</TableHead><TableHead align="right">IGV</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">Pagado</TableHead><TableHead align="right">Saldo</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader><TableBody>
        {isLoading ? <TableRow><TableCell colSpan={10}>Cargando…</TableCell></TableRow> : null}
        {!isLoading && data.length === 0 ? <TableRow><TableCell colSpan={10}>Sin gastos registrados.</TableCell></TableRow> : null}
        {data.map((g) => <TableRow key={g.id}><TableCell>{new Date(g.expense_date).toLocaleDateString('es-PE')}</TableCell><TableCell>{g.supplier_name}</TableCell><TableCell>{g.description}</TableCell><TableCell>{g.status}</TableCell><TableCell align="right">{money(g.base_amount)}</TableCell><TableCell align="right">{money(g.igv_amount)}</TableCell><TableCell align="right">{money(g.total_amount)}</TableCell><TableCell align="right">{money(g.paid_amount ?? 0)}</TableCell><TableCell align="right">{money(Number(g.total_amount) - Number(g.paid_amount ?? 0))}</TableCell><TableCell align="right"><div className="flex justify-end gap-1">{Number(g.paid_amount ?? 0) > 0 ? <Button size="sm" variant="ghost" onClick={() => verPagos(g.id)}>Pagos</Button> : null}{g.status !== 'ANULADO' ? <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('¿Anular este gasto? Se revertirán pagos y asientos.')) anular.mutate(g.id); }}>Anular</Button> : null}{g.status !== 'PAGADO' && g.status !== 'ANULADO' ? <Button size="sm" variant="outline" onClick={() => setPago({ id: g.id, amount: String(Math.round((Number(g.total_amount) - Number(g.paid_amount ?? 0)) * 100) / 100), treasuryAccountId: '' })}>Pagar</Button> : null}</div></TableCell></TableRow>)}
      </TableBody></Table></Card>

      <Dialog open={pago !== null} onOpenChange={(open) => { if (!open) setPago(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pagar gasto</DialogTitle><DialogDescription>La subcuenta elegida es la que se usa en el asiento de tesorería.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <label className="text-xs block">Importe<Input type="number" value={pago?.amount ?? ''} onChange={(e) => setPago(pago ? { ...pago, amount: e.target.value } : pago)} /></label>
            <label className="text-xs block">Cuenta de tesorería (caja o banco)
              <select className="mt-1 h-9 w-full rounded border bg-background px-2" value={pago?.treasuryAccountId ?? ''} onChange={(e) => setPago(pago ? { ...pago, treasuryAccountId: e.target.value } : pago)}>
                <option value="">Usar la cuenta de la regla PAGO</option>
                {(tesoreria.data ?? []).filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name}</option>)}
              </select>
            </label>
            {(tesoreria.data ?? []).length === 0 ? <p className="text-[11px] text-muted-foreground">Aún no hay cuentas de tesorería. Créelas en Contabilidad → Plan de cuentas.</p> : null}
            <Button disabled={pagar.isPending || !pago?.amount} onClick={() => pago ? pagar.mutate({ id: pago.id, amount: Number(pago.amount), treasuryAccountId: pago.treasuryAccountId || undefined }) : undefined}>{pagar.isPending ? 'Pagando…' : 'Confirmar pago'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pagos !== null} onOpenChange={(open) => { if (!open) setPagos(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Historial de pagos</DialogTitle><DialogDescription>Abonos registrados en tesorería.</DialogDescription></DialogHeader>
          <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Método</TableHead><TableHead align="right">Monto</TableHead></TableRow></TableHeader><TableBody>
            {(pagos ?? []).map((p) => <TableRow key={p.id}><TableCell>{new Date(p.date).toLocaleDateString('es-PE')}</TableCell><TableCell>{p.paymentMethod}{p.bankName ? ` · ${p.bankName}` : ''}</TableCell><TableCell align="right">{money(p.amount)}</TableCell></TableRow>)}
            {(pagos ?? []).length === 0 ? <TableRow><TableCell colSpan={3}>Sin pagos registrados.</TableCell></TableRow> : null}
          </TableBody></Table>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

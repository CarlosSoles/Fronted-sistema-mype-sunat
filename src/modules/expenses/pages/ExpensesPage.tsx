import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { expensesApi } from '../services/expensesApi';

const money = (n: string | number) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list });
  const [form, setForm] = useState({ description: '', supplierName: '', supplierDoc: '', documentNumber: '', expenseDate: new Date().toISOString().slice(0, 10), baseAmount: '', igvAmount: '', totalAmount: '' });
  const [error, setError] = useState<string | null>(null);
  const pagar = useMutation({ mutationFn: (id: string) => expensesApi.pay(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['expenses'] }); }, onError: () => setError('No se pudo pagar el gasto.') });
  const crear = useMutation({
    mutationFn: () => expensesApi.create({ description: form.description, supplierName: form.supplierName, supplierDoc: form.supplierDoc || undefined, documentNumber: form.documentNumber || undefined, expenseDate: form.expenseDate, baseAmount: Number(form.baseAmount), igvAmount: Number(form.igvAmount), totalAmount: Number(form.totalAmount) }),
    onSuccess: async () => { setError(null); setForm({ ...form, description: '', supplierName: '', supplierDoc: '', documentNumber: '', baseAmount: '', igvAmount: '', totalAmount: '' }); await queryClient.invalidateQueries({ queryKey: ['expenses'] }); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo registrar el gasto.'),
  });
  return (
    <Page>
      <PageHeader title="Gastos" description="Gastos operativos con IGV y asiento contable automático" />
      {error ? <Card className="p-4 mb-4 text-sm text-destructive">{error}</Card> : null}
      <Card className="p-4 mb-5">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs">Descripción<Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="text-xs">Proveedor<Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></label>
          <label className="text-xs">RUC<Input value={form.supplierDoc} onChange={(e) => setForm({ ...form, supplierDoc: e.target.value.replace(/\D/g, '').slice(0, 11) })} /></label>
          <label className="text-xs">Documento<Input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} /></label>
          <label className="text-xs">Fecha<Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} /></label>
          <label className="text-xs">Base<Input type="number" value={form.baseAmount} onChange={(e) => setForm({ ...form, baseAmount: e.target.value })} /></label>
          <label className="text-xs">IGV<Input type="number" value={form.igvAmount} onChange={(e) => setForm({ ...form, igvAmount: e.target.value })} /></label>
          <label className="text-xs">Total<Input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} /></label>
          <div className="flex items-end"><Button onClick={() => crear.mutate()} disabled={crear.isPending || !form.description || !form.supplierName}>{crear.isPending ? 'Registrando…' : 'Registrar gasto'}</Button></div>
        </div>
      </Card>
      <Card flush><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Proveedor</TableHead><TableHead>Descripción</TableHead><TableHead align="right">Base</TableHead><TableHead align="right">IGV</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">Pagado</TableHead><TableHead align="right">Saldo</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader><TableBody>
        {isLoading ? <TableRow><TableCell colSpan={9}>Cargando…</TableCell></TableRow> : null}
        {!isLoading && data.length === 0 ? <TableRow><TableCell colSpan={9}>Sin gastos registrados.</TableCell></TableRow> : null}
        {data.map((g) => <TableRow key={g.id}><TableCell>{new Date(g.expense_date).toLocaleDateString('es-PE')}</TableCell><TableCell>{g.supplier_name}</TableCell><TableCell>{g.description}</TableCell><TableCell align="right">{money(g.base_amount)}</TableCell><TableCell align="right">{money(g.igv_amount)}</TableCell><TableCell align="right">{money(g.total_amount)}</TableCell><TableCell align="right">{money(g.paid_amount ?? 0)}</TableCell><TableCell align="right">{money(Number(g.total_amount) - Number(g.paid_amount ?? 0))}</TableCell><TableCell align="right">{g.status !== 'PAGADO' ? <Button size="sm" variant="outline" onClick={() => pagar.mutate(g.id)}>Pagar</Button> : null}</TableCell></TableRow>)}
      </TableBody></Table></Card>
    </Page>
  );
}

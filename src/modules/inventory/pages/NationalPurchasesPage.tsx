import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Receipt } from 'lucide-react';
import {
  Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, Input, Page, PageHeader, Table, TableBody,
  TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui';
import { inventoryPurchasesApi, type NationalPurchaseRecord } from '../services/inventoryPurchasesApi';

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function NationalPurchasesPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<NationalPurchaseRecord | null>(null);
  const [method, setMethod] = useState('TRANSFERENCIA');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');
  const [historial, setHistorial] = useState<Array<{ id: string; date: string; amount: number; paymentMethod: string; bankName?: string | null; concept: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['national-purchases'],
    queryFn: () => inventoryPurchasesApi.listPurchases(),
  });

  const verPagos = async (p: NationalPurchaseRecord) => {
    try { setHistorial(await inventoryPurchasesApi.listPayments(p.id)); } catch { setError('No se pudo cargar el historial de pagos.'); }
  };

  const payment = useMutation({
    mutationFn: () => inventoryPurchasesApi.payPurchase(selected!.id, {
      amount: amount ? Number(amount) : undefined,
      paymentMethod: method,
      bankName: method === 'EFECTIVO' ? undefined : bank || undefined,
    }),
    onSuccess: async () => {
      setSelected(null);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['national-purchases'] });
    },
    onError: () => setError('No se pudo registrar el pago. Verifica el monto y la compra.'),
  });

  const pendientes = useMemo(() => (data?.items ?? []).filter((p) => p.status !== 'PAGADA' && p.status !== 'ANULADA'), [data]);

  return (
    <Page>
      <PageHeader title="Compras nacionales" description="Comprobantes de compra, estado de pago y asiento contable" />

      {error || queryError ? <Card className="p-4 mb-4 text-sm text-destructive">{error ?? 'No se pudieron cargar las compras.'}</Card> : null}

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Compras registradas</p><p className="text-2xl font-bold">{data?.total ?? 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Pendientes de pago</p><p className="text-2xl font-bold">{pendientes.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total pendiente</p><p className="text-2xl font-bold">{money(pendientes.reduce((a, p) => a + (p.balance ?? p.totalAmount - (p.paidAmount ?? 0)), 0))}</p></Card>
      </div>

      <Card flush>
        <Table>
          <TableHeader><TableRow><TableHead>Compra</TableHead><TableHead>Proveedor</TableHead><TableHead>Documento</TableHead><TableHead>Fecha</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">Pagado</TableHead><TableHead align="right">Saldo</TableHead><TableHead>Estado</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={9}>Cargando compras…</TableCell></TableRow> : null}
            {!isLoading && (data?.items.length ?? 0) === 0 ? <TableRow><TableCell colSpan={9}>No hay compras registradas.</TableCell></TableRow> : null}
            {data?.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.purchaseNumber}</TableCell>
                <TableCell>{p.supplierName}<p className="text-xs text-muted-foreground">{p.supplierDocNumber}</p></TableCell>
                <TableCell>{p.documentSerial}-{p.documentNumber}</TableCell>
                <TableCell>{new Date(p.issueDate).toLocaleDateString('es-PE')}</TableCell>
                <TableCell align="right">{money(p.totalAmount)}</TableCell><TableCell align="right">{money(p.paidAmount ?? 0)}</TableCell><TableCell align="right">{money(p.balance ?? p.totalAmount - (p.paidAmount ?? 0))}</TableCell>
                <TableCell><Badge variant={p.status === 'PAGADA' ? 'outline' : 'secondary'}>{p.status}</Badge></TableCell>
                <TableCell align="right">
                  <div className="flex justify-end gap-1">
                    {(p.paidAmount ?? 0) > 0 ? <Button size="sm" variant="ghost" onClick={() => verPagos(p)}>Pagos</Button> : null}
                    {p.status !== 'PAGADA' && p.status !== 'ANULADA' ? (
                      <Button size="sm" variant="outline" onClick={() => { setSelected(p); setMethod('TRANSFERENCIA'); setBank(''); setAmount(String(p.totalAmount - (p.paidAmount ?? 0))); }}>
                        <CreditCard className="h-3.5 w-3.5 mr-1" /> Pagar
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Registrar pago</DialogTitle>
            <DialogDescription>{selected?.purchaseNumber} · {selected?.supplierName} · saldo {selected ? money(selected.totalAmount - (selected.paidAmount ?? 0)) : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label htmlFor="payment-amount" className="text-xs font-medium">Monto a pagar</label>
              <Input id="payment-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="payment-method" className="text-xs font-medium">Método de pago</label>
              <select id="payment-method" value={method} onChange={(e) => setMethod(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="DEPOSITO">Depósito</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            {method !== 'EFECTIVO' ? (
              <div className="space-y-1.5">
                <label htmlFor="payment-bank" className="text-xs font-medium">Banco</label>
                <Input id="payment-bank" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="BCP, BBVA, Interbank…" />
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">Se registrará el abono y el asiento 42/10 por el monto indicado.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={() => payment.mutate()} disabled={payment.isPending}>{payment.isPending ? 'Registrando…' : 'Confirmar pago'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historial !== null} onOpenChange={(open) => { if (!open) setHistorial(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Historial de pagos</DialogTitle><DialogDescription>Abonos registrados en tesorería.</DialogDescription></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Método</TableHead><TableHead align="right">Monto</TableHead></TableRow></TableHeader>
            <TableBody>
              {(historial ?? []).map((h) => <TableRow key={h.id}><TableCell>{new Date(h.date).toLocaleDateString('es-PE')}</TableCell><TableCell>{h.paymentMethod}{h.bankName ? ` · ${h.bankName}` : ''}</TableCell><TableCell align="right">{money(h.amount)}</TableCell></TableRow>)}
              {(historial ?? []).length === 0 ? <TableRow><TableCell colSpan={3}>Sin pagos registrados.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

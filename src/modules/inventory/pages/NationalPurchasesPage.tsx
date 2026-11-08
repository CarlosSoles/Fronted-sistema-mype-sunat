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
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['national-purchases'],
    queryFn: () => inventoryPurchasesApi.listPurchases(),
  });

  const payment = useMutation({
    mutationFn: () => inventoryPurchasesApi.payPurchase(selected!.id, {
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

  const pendientes = useMemo(() => (data?.items ?? []).filter((p) => p.status === 'REGISTRADA'), [data]);

  return (
    <Page>
      <PageHeader title="Compras nacionales" description="Comprobantes de compra, estado de pago y asiento contable" />

      {error || queryError ? <Card className="p-4 mb-4 text-sm text-destructive">{error ?? 'No se pudieron cargar las compras.'}</Card> : null}

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Compras registradas</p><p className="text-2xl font-bold">{data?.total ?? 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Pendientes de pago</p><p className="text-2xl font-bold">{pendientes.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total pendiente</p><p className="text-2xl font-bold">{money(pendientes.reduce((a, p) => a + p.totalAmount, 0))}</p></Card>
      </div>

      <Card flush>
        <Table>
          <TableHeader><TableRow><TableHead>Compra</TableHead><TableHead>Proveedor</TableHead><TableHead>Documento</TableHead><TableHead>Fecha</TableHead><TableHead align="right">Total</TableHead><TableHead>Estado</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7}>Cargando compras…</TableCell></TableRow> : null}
            {!isLoading && (data?.items.length ?? 0) === 0 ? <TableRow><TableCell colSpan={7}>No hay compras registradas.</TableCell></TableRow> : null}
            {data?.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.purchaseNumber}</TableCell>
                <TableCell>{p.supplierName}<p className="text-xs text-muted-foreground">{p.supplierDocNumber}</p></TableCell>
                <TableCell>{p.documentSerial}-{p.documentNumber}</TableCell>
                <TableCell>{new Date(p.issueDate).toLocaleDateString('es-PE')}</TableCell>
                <TableCell align="right">{money(p.totalAmount)}</TableCell>
                <TableCell><Badge variant={p.status === 'PAGADA' ? 'outline' : 'secondary'}>{p.status}</Badge></TableCell>
                <TableCell align="right">
                  {p.status === 'REGISTRADA' ? (
                    <Button size="sm" variant="outline" onClick={() => { setSelected(p); setMethod('TRANSFERENCIA'); setBank(''); }}>
                      <CreditCard className="h-3.5 w-3.5 mr-1" /> Pagar
                    </Button>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
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
            <DialogDescription>{selected?.purchaseNumber} · {selected?.supplierName} · {selected ? money(selected.totalAmount) : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
            <p className="text-xs text-muted-foreground">Se pagará el total de la compra y se generará el asiento 42/10.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={() => payment.mutate()} disabled={payment.isPending}>{payment.isPending ? 'Registrando…' : 'Confirmar pago'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

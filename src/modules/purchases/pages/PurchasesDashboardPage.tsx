import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, Receipt, WalletCards } from 'lucide-react';
import { Badge, Card, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { purchasesApi } from '../services/purchasesApi';
const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function PurchasesDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['purchases-dashboard'], queryFn: () => purchasesApi.listPurchases() });
  const compras = data?.items ?? [];
  const total = compras.reduce((s, c) => s + c.totalAmount, 0);
  const pagado = compras.reduce((s, c) => s + c.paidAmount, 0);
  const saldo = compras.reduce((s, c) => s + c.pendingAmount, 0);
  const vencidas = compras.filter((c) => c.pendingAmount > 0 && Date.now() - new Date(c.issueDate).getTime() > 30 * 86400000);
  return <Page>
    <PageHeader title="Resumen de compras" description="Compras nacionales, pagos y cuentas por pagar" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-5">
      {[{ k: 'Compras registradas', v: compras.length, icon: Receipt }, { k: 'Total comprado', v: money(total), icon: WalletCards }, { k: 'Pagado', v: money(pagado), icon: CheckCircle2 }, { k: 'Saldo por pagar', v: money(saldo), icon: Clock }].map(({ k, v, icon: Icon }) => <Card key={k} className="p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">{k}</span><Icon className="h-4 w-4" /></div><p className="text-2xl font-bold mt-2">{v}</p></Card>)}
    </div>
    {vencidas.length > 0 ? <Card className="p-4 mb-4 text-sm text-destructive"><AlertCircle className="inline h-4 w-4 mr-1" />{vencidas.length} compras con saldo y más de 30 días: {money(vencidas.reduce((s, c) => s + c.pendingAmount, 0))}</Card> : null}
    <Card flush><Table><TableHeader><TableRow><TableHead>Compra</TableHead><TableHead>Proveedor</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">Saldo</TableHead></TableRow></TableHeader><TableBody>
      {isLoading ? <TableRow><TableCell colSpan={6}>Cargando…</TableCell></TableRow> : null}
      {!isLoading && compras.length === 0 ? <TableRow><TableCell colSpan={6}>Sin compras registradas.</TableCell></TableRow> : null}
      {compras.slice(0, 10).map((c) => <TableRow key={c.id}><TableCell><Link className="underline" to="/purchases">{c.purchaseNumber || `${c.documentSerial}-${c.documentNumber}`}</Link></TableCell><TableCell>{c.supplierName}</TableCell><TableCell>{new Date(c.issueDate).toLocaleDateString('es-PE')}</TableCell><TableCell><Badge variant={c.status === 'PAGADA' ? 'secondary' : 'outline'}>{c.status}</Badge></TableCell><TableCell align="right">{money(c.totalAmount)}</TableCell><TableCell align="right">{money(c.pendingAmount)}</TableCell></TableRow>)}
    </TableBody></Table></Card>
  </Page>;
}

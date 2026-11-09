import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { inventoryPurchasesApi } from '../services/inventoryPurchasesApi';

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PurchasesPayablesPage() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ['purchase-payables'], queryFn: () => inventoryPurchasesApi.listPayables() });
  const total = data.reduce((a, c) => a + c.balance, 0);
  return (
    <Page>
      <PageHeader title="Cuentas por pagar" description="Saldo pendiente por proveedor, consolidado de compras no anuladas" />
      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Proveedores</p><p className="text-2xl font-bold">{data.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Documentos</p><p className="text-2xl font-bold">{data.reduce((a, c) => a + c.count, 0)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Saldo total</p><p className="text-2xl font-bold">{money(total)}</p></Card>
      </div>
      <Card flush>
        <Table>
          <TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead>RUC</TableHead><TableHead align="right">Documentos</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">Pagado</TableHead><TableHead align="right">Saldo</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7}>Cargando…</TableCell></TableRow> : null}
            {!isLoading && data.length === 0 ? <TableRow><TableCell colSpan={7}>Sin cuentas por pagar.</TableCell></TableRow> : null}
            {data.map((c) => <TableRow key={c.supplierDocNumber}><TableCell>{c.supplierName}</TableCell><TableCell className="font-mono text-xs">{c.supplierDocNumber}</TableCell><TableCell align="right">{c.count}</TableCell><TableCell align="right">{money(c.total)}</TableCell><TableCell align="right">{money(c.paid)}</TableCell><TableCell align="right">{money(c.balance)}</TableCell><TableCell><Badge variant={c.balance <= 0.005 ? 'outline' : 'secondary'}>{c.balance <= 0.005 ? 'PAGADO' : 'PENDIENTE'}</Badge></TableCell></TableRow>)}
          </TableBody>
        </Table>
      </Card>
      {error ? <Card className="p-4 mt-4 text-sm text-destructive">No se pudieron cargar las cuentas por pagar.</Card> : null}
    </Page>
  );
}

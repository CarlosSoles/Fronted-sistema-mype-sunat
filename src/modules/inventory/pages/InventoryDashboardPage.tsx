import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, Warehouse } from 'lucide-react';
import { Badge, Card, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { inventoryApi } from '../services/inventoryApi';

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InventoryDashboardPage() {
  const stocks = useQuery({ queryKey: ['inventory-dashboard-stocks'], queryFn: () => inventoryApi.getStockBalances() });
  const movements = useQuery({ queryKey: ['inventory-dashboard-movements'], queryFn: () => inventoryApi.listMovements() });

  const balances = stocks.data?.balances ?? [];
  const items = movements.data?.items ?? [];
  const almacenes = new Set(balances.map((b) => b.warehouseCode)).size;
  const bajoMinimo = balances.filter((b) => b.minStockAlert != null && b.currentStock <= b.minStockAlert).length;
  const entradas = items.filter((m) => m.direction === 'ENTRADA').length;
  const salidas = items.filter((m) => m.direction === 'SALIDA').length;

  return (
    <Page>
      <PageHeader title="Resumen de inventario" description="Valorización, almacenes y movimientos recientes del Kardex" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-5">
        {[
          { label: 'Valorización total', value: money(stocks.data?.totalValuationPen ?? 0), icon: Boxes },
          { label: 'Ítems en catálogo', value: stocks.data?.totalItemsCount ?? balances.length, icon: Warehouse },
          { label: 'Almacenes con stock', value: almacenes, icon: Warehouse },
          { label: 'Bajo mínimo', value: bajoMinimo, icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">{label}</span><Icon className="h-4 w-4" /></div>
            <p className="text-2xl font-bold mt-2">{value}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 mb-5">
        <Badge variant="outline"><ArrowDownToLine className="h-3.5 w-3.5 mr-1" />{entradas} entradas</Badge>
        <Badge variant="outline"><ArrowUpFromLine className="h-3.5 w-3.5 mr-1" />{salidas} salidas</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-5">
        {[
          ['Existencias y catálogo', '/inventory/stocks'],
          ['Movimientos', '/inventory/movements'],
          ['Transferencias', '/inventory/transfers'],
          ['Ajustes y toma física', '/inventory/adjustments'],
          ['Saldo inicial', '/inventory/opening'],
          ['Kardex valorizado', '/kardex/general'],
        ].map(([title, to]) => (
          <Link key={to} to={to} className="rounded-lg border bg-card p-4 hover:bg-muted/40 transition-colors">
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">Ir al módulo de inventario</p>
          </Link>
        ))}
      </div>

      <Card flush>
        <div className="p-4 border-b"><p className="font-semibold text-sm">Últimos movimientos</p></div>
        <Table>
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>SKU</TableHead><TableHead>Movimiento</TableHead><TableHead>Almacén</TableHead><TableHead align="right">Cantidad</TableHead><TableHead align="right">Costo total</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.slice(0, 8).map((m) => (
              <TableRow key={m.id}>
                <TableCell>{new Date(m.movementDate).toLocaleDateString('es-PE')}</TableCell>
                <TableCell className="font-mono text-xs">{m.sku}</TableCell>
                <TableCell><Badge variant={m.direction === 'ENTRADA' ? 'outline' : 'secondary'}>{m.direction}</Badge></TableCell>
                <TableCell>{m.warehouseCode}</TableCell>
                <TableCell align="right">{m.quantity}</TableCell>
                <TableCell align="right">{money(m.totalCost)}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? <TableRow><TableCell colSpan={6}>Sin movimientos registrados.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </Card>
    </Page>
  );
}

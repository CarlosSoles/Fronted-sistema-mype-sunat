import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { PeriodInput } from '@/components/common/PeriodInput';
import { invoicesApi } from '@/modules/invoices/services/invoicesApi';
import { inventoryPurchasesApi } from '@/modules/inventory/services/inventoryPurchasesApi';

const money = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rango = (periodo: string) => {
  const [y, m] = periodo.split('-').map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return { desde: `${periodo}-01`, hasta: `${periodo}-${String(ultimo).padStart(2, '0')}` };
};
const descargar = (nombre: string, filas: string[][]) => {
  const contenido = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = nombre; a.click(); URL.revokeObjectURL(url);
};

export default function AccountingTaxBooksPage() {
  const [periodo, setPeriodo] = useState(() => {
    const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`;
  });
  const r = rango(periodo);
  const ventas = useQuery({ queryKey: ['tax-book-sales', periodo], queryFn: () => invoicesApi.getInvoices(1, { ...r, page_size: 100 }) });
  const compras = useQuery({ queryKey: ['tax-book-purchases'], queryFn: () => inventoryPurchasesApi.listPurchases() });

  const comprasPeriodo = useMemo(
    () => (compras.data?.items ?? []).filter((p) => p.issueDate.slice(0, 7) === periodo),
    [compras.data, periodo],
  );
  const ventasItems = ventas.data?.data ?? [];
  const totalVentas = ventasItems.reduce((a, v) => ({ base: a.base + v.subtotal, igv: a.igv + v.igv, total: a.total + v.total }), { base: 0, igv: 0, total: 0 });
  const totalCompras = comprasPeriodo.reduce((a, p) => ({ base: a.base + p.netAmount, igv: a.igv + p.igvAmount, total: a.total + p.totalAmount }), { base: 0, igv: 0, total: 0 });

  return (
    <Page>
      <PageHeader title="Libro de Ventas y Compras" description="Registros del período para revisión y exportación CSV; base para el PLE 14.1 y 8.1" />
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="space-y-1.5"><label className="text-xs font-medium">Período</label><PeriodInput value={periodo} onChange={setPeriodo} /></div>
        <Badge variant="outline">Ventas: {ventasItems.length}</Badge>
        <Badge variant="outline">Compras: {comprasPeriodo.length}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Base ventas</p><p className="text-xl font-bold">S/ {money(totalVentas.base)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">IGV ventas</p><p className="text-xl font-bold">S/ {money(totalVentas.igv)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Base compras</p><p className="text-xl font-bold">S/ {money(totalCompras.base)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">IGV compras</p><p className="text-xl font-bold">S/ {money(totalCompras.igv)}</p></Card>
      </div>

      <Card flush className="mb-5">
        <div className="flex items-center justify-between p-4 border-b">
          <p className="font-semibold text-sm">Registro de Ventas 14.1</p>
          <Button size="sm" variant="outline" onClick={() => descargar(`ventas-${periodo}.csv`, [['Tipo','Serie','Número','Fecha','Cliente','RUC','Base','IGV','Total'], ...ventasItems.map((v) => [v.tipoComprobante ?? '', v.serie, v.numero, v.fechaEmision, v.clienteRazonSocial, v.clienteRuc, v.subtotal.toFixed(2), v.igv.toFixed(2), v.total.toFixed(2)])])}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Número</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead align="right">Base</TableHead><TableHead align="right">IGV</TableHead><TableHead align="right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {ventasItems.map((v) => <TableRow key={v.id}><TableCell>{v.tipoComprobante ?? '—'}</TableCell><TableCell className="font-mono text-xs">{v.numero}</TableCell><TableCell>{v.fechaEmision}</TableCell><TableCell>{v.clienteRazonSocial}</TableCell><TableCell align="right">{money(v.subtotal)}</TableCell><TableCell align="right">{money(v.igv)}</TableCell><TableCell align="right">{money(v.total)}</TableCell></TableRow>)}
            {ventasItems.length === 0 ? <TableRow><TableCell colSpan={7}>Sin ventas en el período.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </Card>

      <Card flush>
        <div className="flex items-center justify-between p-4 border-b">
          <p className="font-semibold text-sm">Registro de Compras 8.1</p>
          <Button size="sm" variant="outline" onClick={() => descargar(`compras-${periodo}.csv`, [['Documento','Serie','Número','Fecha','Proveedor','RUC','Base','IGV','Total','Estado'], ...comprasPeriodo.map((p) => [p.documentTypeCode, p.documentSerial, p.documentNumber, p.issueDate, p.supplierName, p.supplierDocNumber, p.netAmount.toFixed(2), p.igvAmount.toFixed(2), p.totalAmount.toFixed(2), p.status])])}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Proveedor</TableHead><TableHead>Fecha</TableHead><TableHead align="right">Base</TableHead><TableHead align="right">IGV</TableHead><TableHead align="right">Total</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>
            {comprasPeriodo.map((p) => <TableRow key={p.id}><TableCell className="font-mono text-xs">{p.documentSerial}-{p.documentNumber}</TableCell><TableCell>{p.supplierName}<p className="text-xs text-muted-foreground">{p.supplierDocNumber}</p></TableCell><TableCell>{new Date(p.issueDate).toLocaleDateString('es-PE')}</TableCell><TableCell align="right">{money(p.netAmount)}</TableCell><TableCell align="right">{money(p.igvAmount)}</TableCell><TableCell align="right">{money(p.totalAmount)}</TableCell><TableCell><Badge variant={p.status === 'PAGADA' ? 'outline' : 'secondary'}>{p.status}</Badge></TableCell></TableRow>)}
            {comprasPeriodo.length === 0 ? <TableRow><TableCell colSpan={7}>Sin compras en el período.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </Card>
    </Page>
  );
}

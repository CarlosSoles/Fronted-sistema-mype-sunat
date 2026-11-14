import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search } from 'lucide-react';
import { Badge, Button, Card, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { invoicesApi } from '@/modules/invoices/services/invoicesApi';

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoy = new Date().toISOString().slice(0, 10);
const inicioMes = `${hoy.slice(0, 7)}-01`;

export default function SalesHistoryPage() {
  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const ventas = useQuery({
    queryKey: ['sales-history', desde, hasta, estado],
    queryFn: () => invoicesApi.getInvoices(1, { desde, hasta, ...(estado ? { estado } : {}), page_size: 100 }),
  });
  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (ventas.data?.data ?? []).filter((v) => !q || v.numero.toLowerCase().includes(q) || v.clienteRazonSocial.toLowerCase().includes(q) || v.clienteRuc.includes(q));
  }, [ventas.data, busqueda]);
  const total = filas.reduce((sum, v) => sum + Number(v.total ?? 0), 0);
  const exportar = () => {
    const contenido = [['Número', 'Cliente', 'Documento', 'Fecha', 'Estado', 'Total'], ...filas.map((v) => [v.numero, v.clienteRazonSocial, v.clienteRuc, v.fechaEmision.slice(0, 10), v.cdrStatus, Number(v.total).toFixed(2)])].map((f) => f.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'historial-ventas.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <Page>
      <PageHeader title="Historial de ventas" description="Comprobantes emitidos por el módulo de Ventas">
        <Button variant="outline" size="sm" onClick={exportar}><Download className="mr-1 h-3.5 w-3.5" />Exportar CSV</Button>
      </PageHeader>
      <Card className="mb-4 p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs">Desde<Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
          <label className="text-xs">Hasta<Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
          <label className="text-xs">Estado<select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-xs" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos</option><option value="ACEPTADO">Aceptado</option><option value="OBSERVADO">Observado</option><option value="RECHAZADO">Rechazado</option><option value="ERROR_RED">Error de red</option><option value="ANULADO">Anulado</option></select></label>
          <label className="text-xs sm:col-span-2">Buscar<Input placeholder="Número, cliente o documento" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label>
        </div>
      </Card>
      <Card flush>
        <div className="flex items-center justify-between border-b p-3 text-xs text-muted-foreground"><span>{filas.length} comprobantes</span><span>Total: <strong className="text-foreground">{money(total)}</strong></span></div>
        <Table>
          <TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Cliente</TableHead><TableHead>Documento</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead align="right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {ventas.isLoading ? <TableRow><TableCell colSpan={6}>Cargando ventas…</TableCell></TableRow> : null}
            {!ventas.isLoading && filas.length === 0 ? <TableRow><TableCell colSpan={6}><Search className="mr-1 inline h-3 w-3" />Sin ventas en el rango.</TableCell></TableRow> : null}
            {filas.map((v) => <TableRow key={v.id}><TableCell className="font-mono text-xs">{v.numero}</TableCell><TableCell className="text-xs">{v.clienteRazonSocial}</TableCell><TableCell className="font-mono text-xs">{v.clienteRuc}</TableCell><TableCell className="text-xs">{new Date(v.fechaEmision).toLocaleDateString('es-PE')}</TableCell><TableCell><Badge variant="outline">{v.cdrStatus}</Badge></TableCell><TableCell align="right" className="font-mono text-xs">{money(Number(v.total))}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </Card>
    </Page>
  );
}

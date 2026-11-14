import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { salesQuotesApi, type QuoteStatus, type SalesQuote } from '../services/salesQuotesApi';

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const estadoColor: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = { ACEPTADA: 'default', CONVERTIDA: 'default', ENVIADA: 'secondary', RECHAZADA: 'destructive' };
const vacio = () => ({ description: '', quantity: '1', unitPrice: '' });

export default function SalesQuotesPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const kind = location.pathname.includes('/pedidos') ? 'PEDIDO' : 'COTIZACION';
  const etiqueta = kind === 'PEDIDO' ? 'pedido' : 'cotización';
  const cotizaciones = useQuery({ queryKey: ['sales-quotes', kind], queryFn: () => salesQuotesApi.list(kind) });
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState('');
  const [cliente, setCliente] = useState('');
  const [documento, setDocumento] = useState('');
  const [validez, setValidez] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([vacio()]);
  const total = useMemo(() => items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0), [items]);
  const crear = useMutation({
    mutationFn: () => salesQuotesApi.create({ kind, customerName: cliente, customerDocNumber: documento || undefined, validUntil: validez || undefined, notes: notas || undefined, items: items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })) }),
    onSuccess: async () => { setAbierto(false); setCliente(''); setDocumento(''); setValidez(''); setNotas(''); setItems([vacio()]); setError(''); await queryClient.invalidateQueries({ queryKey: ['sales-quotes'] }); },
    onError: (e: unknown) => setError(extractApiErrorMessage(e, 'No se pudo crear la cotización.')),
  });
  const cambiarEstado = useMutation({ mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) => salesQuotesApi.status(id, status), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-quotes'] }), onError: (e: unknown) => setError(extractApiErrorMessage(e, 'No se pudo actualizar la cotización.')) });
  const convertir = (q: SalesQuote) => { window.location.href = `/sales/pos?quote=${encodeURIComponent(q.id)}`; };
  return (
    <Page>
      <PageHeader title={kind === 'PEDIDO' ? 'Pedidos de venta' : 'Cotizaciones'} description={kind === 'PEDIDO' ? 'Pedidos confirmados pendientes de comprobante' : 'Propuestas de venta antes de emitir el comprobante'}>
        <Button size="sm" onClick={() => setAbierto(true)}><Plus className="mr-1 h-3.5 w-3.5" />Nuevo {etiqueta}</Button>
      </PageHeader>
      {error ? <p className="mb-3 text-xs text-destructive">{error}</p> : null}
      <Card flush>
        <Table>
          <TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Cliente</TableHead><TableHead>Validez</TableHead><TableHead>Estado</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {cotizaciones.isLoading ? <TableRow><TableCell colSpan={6}>{`Cargando ${etiqueta}s…`}</TableCell></TableRow> : null}
            {!cotizaciones.isLoading && (cotizaciones.data ?? []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground">{`Sin ${etiqueta}s registradas.`}</TableCell></TableRow> : null}
            {(cotizaciones.data ?? []).map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-mono text-xs">{q.quoteNumber}</TableCell>
                <TableCell className="text-xs"><p className="font-medium">{q.customerName}</p><p className="text-[11px] text-muted-foreground">{q.customerDocNumber ?? 'Sin documento'}</p></TableCell>
                <TableCell className="text-xs">{q.validUntil ? new Date(q.validUntil).toLocaleDateString('es-PE') : '—'}</TableCell>
                <TableCell>
                  <select aria-label={`Estado ${q.quoteNumber}`} className="h-7 rounded border bg-background px-1 text-[10px]" value={q.status} onChange={(e) => cambiarEstado.mutate({ id: q.id, status: e.target.value as QuoteStatus })}>
                    {['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'CONVERTIDA', 'ANULADA'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <Badge variant={estadoColor[q.status] ?? 'outline'} className="ml-1 text-[10px]">{q.items.length} ítems</Badge>
                </TableCell>
                <TableCell align="right" className="font-mono text-xs">{money(q.totalAmount)}</TableCell>
                <TableCell align="right"><Button size="sm" variant="outline" disabled={q.status === 'CONVERTIDA' || q.status === 'ANULADA'} onClick={() => convertir(q)}>Convertir a venta</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />{`Nuevo ${etiqueta}`}</DialogTitle><DialogDescription>{kind === 'PEDIDO' ? 'Pedido confirmado; no mueve inventario ni genera asiento hasta emitir.' : 'No mueve inventario ni genera asiento; es una propuesta.'}</DialogDescription></DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="grid gap-2 sm:grid-cols-3">
              <label>Cliente<Input value={cliente} onChange={(e) => setCliente(e.target.value)} /></label>
              <label>Documento<Input value={documento} onChange={(e) => setDocumento(e.target.value.replace(/\D/g, '').slice(0, 11))} /></label>
              <label>Válida hasta<Input type="date" value={validez} onChange={(e) => setValidez(e.target.value)} /></label>
            </div>
            <label className="block">Observaciones<Input value={notas} onChange={(e) => setNotas(e.target.value)} /></label>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_120px_30px] gap-2">
                  <Input placeholder="Descripción" value={item.description} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                  <Input type="number" min="0.0001" value={item.quantity} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} />
                  <Input type="number" min="0" step="0.01" placeholder="Precio final" value={item.unitPrice} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, unitPrice: e.target.value } : x))} />
                  <Button size="sm" variant="ghost" disabled={items.length === 1} onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setItems([...items, vacio()])}><Plus className="mr-1 h-3.5 w-3.5" />Agregar ítem</Button>
            </div>
            <div className="flex justify-between border-t pt-2 text-sm"><span>Total</span><strong>{money(total)}</strong></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button><Button onClick={() => crear.mutate()} disabled={crear.isPending || !cliente.trim() || items.some((i) => !i.description.trim() || !(Number(i.quantity) > 0))}>{crear.isPending ? 'Guardando…' : `Guardar ${etiqueta}`}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

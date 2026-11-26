import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { paymentSchedulesApi, type SchedulePurchase } from '../services/paymentSchedulesApi';

const money = (n: number) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoy = new Date().toISOString().slice(0, 10);

export default function PaymentSchedulePage() {
  const queryClient = useQueryClient();
  const data = useQuery({ queryKey: ['payment-schedules'], queryFn: paymentSchedulesApi.list });
  const [target, setTarget] = useState<SchedulePurchase | null>(null);
  const [fecha, setFecha] = useState(hoy);
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const [vencimiento, setVencimiento] = useState<{ purchase: SchedulePurchase; fecha: string } | null>(null);
  const totales = useMemo(() => data.data?.summary ?? { totalBalance: 0, scheduled: 0, overdue: 0 }, [data.data]);
  const invalidar = async () => { await queryClient.invalidateQueries({ queryKey: ['payment-schedules'] }); await queryClient.invalidateQueries({ queryKey: ['purchase-payables'] }); };
  const crear = useMutation({
    mutationFn: () => paymentSchedulesApi.create({ purchaseId: target!.id, scheduledDate: fecha, amount: Number(monto), notes: notas || undefined }),
    onSuccess: async () => { setTarget(null); setMonto(''); setNotas(''); setError(''); await invalidar(); },
    onError: (e) => setError(extractApiErrorMessage(e, 'No se pudo programar el pago.')),
  });
  const anular = useMutation({ mutationFn: (id: string) => paymentSchedulesApi.cancel(id), onSuccess: invalidar, onError: (e) => setError(extractApiErrorMessage(e, 'No se pudo anular la programación.')) });
  const guardarVencimiento = useMutation({ mutationFn: () => paymentSchedulesApi.updateDueDate(vencimiento!.purchase.id, vencimiento!.fecha || null), onSuccess: async () => { setVencimiento(null); await invalidar(); }, onError: (e) => setError(extractApiErrorMessage(e, 'No se pudo guardar el vencimiento.')) });
  return (
    <Page>
      <PageHeader title="Programación de pagos" description="Vencimientos y cuotas programadas de cuentas por pagar" />
      {error ? <p className="mb-3 text-xs text-destructive">{error}</p> : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-3"><p className="text-[11px] text-muted-foreground">Saldo por pagar</p><p className="font-mono text-lg font-semibold">{money(totales.totalBalance)}</p></Card>
        <Card className="p-3"><p className="text-[11px] text-muted-foreground">Programado</p><p className="font-mono text-lg font-semibold">{money(totales.scheduled)}</p></Card>
        <Card className="p-3"><p className="text-[11px] text-muted-foreground">Vencido</p><p className={`font-mono text-lg font-semibold ${totales.overdue > 0 ? 'text-destructive' : ''}`}>{money(totales.overdue)}</p></Card>
      </div>
      <Card flush>
        <Table>
          <TableHeader><TableRow><TableHead>Compra</TableHead><TableHead>Proveedor</TableHead><TableHead>Vence</TableHead><TableHead align="right">Saldo</TableHead><TableHead align="right">Programado</TableHead><TableHead>Cuotas</TableHead><TableHead align="right">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.isLoading ? <TableRow><TableCell colSpan={7}>Cargando…</TableCell></TableRow> : null}
            {(data.data?.purchases ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell><p className="font-mono text-xs">{p.purchaseNumber}</p><p className="text-[10px] text-muted-foreground">{p.document}</p></TableCell>
                <TableCell className="text-xs">{p.supplierName}<p className="text-[10px] text-muted-foreground">{p.supplierDocNumber}</p></TableCell>
                <TableCell><button className="text-xs underline-offset-2 hover:underline" onClick={() => setVencimiento({ purchase: p, fecha: p.dueDate?.slice(0, 10) ?? '' })}>{p.dueDate ? new Date(p.dueDate).toLocaleDateString('es-PE') : 'Sin fecha'}</button>{p.overdue ? <Badge variant="destructive" className="ml-1 text-[9px]">VENCIDO</Badge> : null}</TableCell>
                <TableCell align="right" className="font-mono text-xs">{money(p.balance)}</TableCell>
                <TableCell align="right" className="font-mono text-xs">{money(p.scheduledAmount)}</TableCell>
                <TableCell><div className="space-y-1">{p.schedules.map((s) => <div key={s.id} className="flex items-center gap-2 text-[11px]"><span>{new Date(s.scheduledDate).toLocaleDateString('es-PE')}</span><span className="font-mono">{money(s.amount)}</span><button aria-label="Anular cuota" onClick={() => anular.mutate(s.id)}><Trash2 className="h-3 w-3 text-destructive" /></button></div>)}{p.schedules.length === 0 ? <span className="text-[11px] text-muted-foreground">Sin cuotas</span> : null}</div></TableCell>
                <TableCell align="right"><Button size="sm" variant="outline" disabled={p.availableToSchedule <= 0} onClick={() => { setTarget(p); setFecha(hoy); setMonto(String(p.availableToSchedule)); setNotas(''); }}><Plus className="h-3.5 w-3.5" />Programar</Button></TableCell>
              </TableRow>
            ))}
            {!data.isLoading && (data.data?.purchases ?? []).length === 0 ? <TableRow><TableCell colSpan={7} className="text-xs text-muted-foreground">Sin cuentas por pagar pendientes.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={target !== null} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <DialogContent className="text-xs">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4" />Programar pago</DialogTitle><DialogDescription>{target?.purchaseNumber} · {target?.supplierName} · disponible {money(target?.availableToSchedule ?? 0)}</DialogDescription></DialogHeader>
          <label className="text-xs">Fecha<Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
          <label className="mt-2 block text-xs">Importe<Input type="number" min="0.01" max={target?.availableToSchedule ?? 0} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
          <label className="mt-2 block text-xs">Notas<Input value={notas} onChange={(e) => setNotas(e.target.value)} /></label>
          <DialogFooter><Button variant="outline" onClick={() => setTarget(null)}>Cancelar</Button><Button disabled={crear.isPending || !(Number(monto) > 0)} onClick={() => crear.mutate()}>{crear.isPending ? 'Guardando…' : 'Programar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={vencimiento !== null} onOpenChange={(open) => { if (!open) setVencimiento(null); }}>
        <DialogContent className="text-xs">
          <DialogHeader><DialogTitle>Vencimiento de la compra</DialogTitle><DialogDescription>{vencimiento?.purchase.purchaseNumber}</DialogDescription></DialogHeader>
          <label className="text-xs">Fecha de vencimiento<Input type="date" value={vencimiento?.fecha ?? ''} onChange={(e) => setVencimiento((v) => v ? { ...v, fecha: e.target.value } : v)} /></label>
          <DialogFooter><Button variant="outline" onClick={() => setVencimiento(null)}>Cancelar</Button><Button disabled={guardarVencimiento.isPending} onClick={() => guardarVencimiento.mutate()}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

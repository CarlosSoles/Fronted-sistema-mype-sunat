import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, CheckCircle2, XCircle } from 'lucide-react';
import { Badge, Button, Card, Input, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { extractApiErrorMessage } from '@/lib/apiErrors';
import { cashClosuresApi } from '../services/cashClosuresApi';

const money = (n: number) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoy = new Date().toISOString().slice(0, 10);

export default function CashClosurePage() {
  const queryClient = useQueryClient();
  const [fecha, setFecha] = useState(hoy);
  const [contado, setContado] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const resumen = useQuery({ queryKey: ['cash-summary', fecha], queryFn: () => cashClosuresApi.summary(fecha) });
  const cierres = useQuery({ queryKey: ['cash-closures'], queryFn: cashClosuresApi.list });
  const cerrado = (cierres.data ?? []).find((c) => c.date.slice(0, 10) === fecha);
  const diferencia = useMemo(() => Number(contado || 0) - Number(resumen.data?.expectedCash ?? 0), [contado, resumen.data]);
  const cerrar = useMutation({
    mutationFn: () => cashClosuresApi.close({ date: fecha, countedCash: Number(contado), notes: notas || undefined }),
    onSuccess: async () => { setError(''); setContado(''); setNotas(''); await queryClient.invalidateQueries({ queryKey: ['cash-closures'] }); },
    onError: (e: unknown) => setError(extractApiErrorMessage(e, 'No se pudo cerrar la caja.')),
  });
  return (
    <Page>
      <PageHeader title="Cierre de caja" description="Resumen diario de ventas, cobros, egresos y efectivo contado" />
      {error ? <p className="mb-3 text-xs text-destructive">{error}</p> : null}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs">Fecha<Input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setContado(''); }} /></label>
          {cerrado ? <Badge variant="default"><CheckCircle2 className="mr-1 h-3 w-3" />Caja cerrada · diferencia {money(cerrado.difference)}</Badge> : <Badge variant="outline"><XCircle className="mr-1 h-3 w-3" />Caja abierta</Badge>}
        </div>
      </Card>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[['Ventas', resumen.data?.salesTotal], ['Cobros', resumen.data?.collectionsTotal], ['Efectivo cobrado', resumen.data?.cashCollections], ['Egresos efectivo', resumen.data?.cashExpenses], ['Efectivo esperado', resumen.data?.expectedCash]].map(([label, value]) => <Card key={String(label)} className="p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="font-mono text-lg font-semibold">{money(Number(value ?? 0))}</p></Card>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold">Cobros por medio de pago</p>
          <Table><TableHeader><TableRow><TableHead>Medio</TableHead><TableHead align="right">Monto</TableHead></TableRow></TableHeader><TableBody>
            {(resumen.data?.collectionsByMethod ?? []).map((m) => <TableRow key={m.method}><TableCell className="text-xs">{m.method}</TableCell><TableCell align="right" className="font-mono text-xs">{money(m.amount)}</TableCell></TableRow>)}
            {(resumen.data?.collectionsByMethod ?? []).length === 0 ? <TableRow><TableCell colSpan={2} className="text-xs text-muted-foreground">Sin cobros en la fecha.</TableCell></TableRow> : null}
          </TableBody></Table>
          <p className="mt-4 mb-2 text-sm font-semibold">Egresos por medio de pago</p>
          <Table><TableHeader><TableRow><TableHead>Medio</TableHead><TableHead align="right">Monto</TableHead></TableRow></TableHeader><TableBody>
            {(resumen.data?.expensesByMethod ?? []).map((m) => <TableRow key={m.method}><TableCell className="text-xs">{m.method}</TableCell><TableCell align="right" className="font-mono text-xs">{money(m.amount)}</TableCell></TableRow>)}
            {(resumen.data?.expensesByMethod ?? []).length === 0 ? <TableRow><TableCell colSpan={2} className="text-xs text-muted-foreground">Sin egresos en la fecha.</TableCell></TableRow> : null}
          </TableBody></Table>
        </Card>
        <Card className="p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Banknote className="h-4 w-4" />Conteo de caja</p>
          <label className="text-xs">Efectivo contado<Input type="number" min="0" step="0.01" value={contado} onChange={(e) => setContado(e.target.value)} disabled={Boolean(cerrado)} /></label>
          <label className="mt-3 block text-xs">Observaciones<Input value={notas} onChange={(e) => setNotas(e.target.value)} disabled={Boolean(cerrado)} /></label>
          <div className={`mt-3 rounded border p-2 text-xs ${diferencia === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>Diferencia: <strong>{money(diferencia)}</strong></div>
          <Button className="mt-3 w-full" disabled={Boolean(cerrado) || cerrar.isPending || contado === ''} onClick={() => cerrar.mutate()}>{cerrado ? 'Caja ya cerrada' : cerrar.isPending ? 'Cerrando…' : 'Cerrar caja'}</Button>
        </Card>
      </div>
      <Card flush className="mt-4">
        <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead align="right">Ventas</TableHead><TableHead align="right">Cobros</TableHead><TableHead align="right">Esperado</TableHead><TableHead align="right">Contado</TableHead><TableHead align="right">Diferencia</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
          {(cierres.data ?? []).map((c) => <TableRow key={c.id}><TableCell className="text-xs">{new Date(c.date).toLocaleDateString('es-PE')}</TableCell><TableCell align="right" className="font-mono text-xs">{money(c.salesTotal)}</TableCell><TableCell align="right" className="font-mono text-xs">{money(c.collectionsTotal)}</TableCell><TableCell align="right" className="font-mono text-xs">{money(c.expectedCash)}</TableCell><TableCell align="right" className="font-mono text-xs">{money(c.countedCash)}</TableCell><TableCell align="right" className={`font-mono text-xs ${c.difference === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{money(c.difference)}</TableCell><TableCell><Badge variant="outline">{c.status}</Badge></TableCell></TableRow>)}
          {(cierres.data ?? []).length === 0 ? <TableRow><TableCell colSpan={7} className="text-xs text-muted-foreground">Sin cierres registrados.</TableCell></TableRow> : null}
        </TableBody></Table>
      </Card>
    </Page>
  );
}

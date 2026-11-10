import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save } from 'lucide-react';
import {
  Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, Page, PageHeader, Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui';
import { accountingApi, type AccountingRuleInput } from '../services/accountingApi';

const VACIA: AccountingRuleInput = { processCode: 'VENTA', documentType: '*', lineOrder: 1, accountCode: '', side: 'DEBE', baseCalculation: 'TOTAL', description: '' };

export default function AccountingRulesPage() {
  const queryClient = useQueryClient();
  const [editar, setEditar] = useState<AccountingRuleInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ['accounting-rules'], queryFn: () => accountingApi.getRules() });
  const cuentas = useQuery({ queryKey: ['accounting-accounts'], queryFn: () => accountingApi.getAccounts() });

  const guardar = useMutation({
    mutationFn: () => accountingApi.upsertRule(editar!),
    onSuccess: async () => { setEditar(null); setError(null); await queryClient.invalidateQueries({ queryKey: ['accounting-rules'] }); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo guardar la regla.'),
  });

  return (
    <Page>
      <PageHeader title="Reglas de contabilización" description="Cuentas por proceso, lado y base de cálculo. Si falta una regla, la operación debe fallar.">
        <Button size="sm" onClick={() => setEditar({ ...VACIA, lineOrder: data.length + 1 })}><Plus className="h-4 w-4 mr-1" /> Nueva regla</Button>
      </PageHeader>
      {error ? <Card className="p-4 mb-4 text-sm text-destructive">{error}</Card> : null}
      <Card flush>
        <Table>
          <TableHeader><TableRow><TableHead>Proceso</TableHead><TableHead>Documento</TableHead><TableHead>Orden</TableHead><TableHead>Cuenta</TableHead><TableHead>Lado</TableHead><TableHead>Base</TableHead><TableHead>Descripción</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8}>Cargando reglas…</TableCell></TableRow> : null}
            {!isLoading && data.length === 0 ? <TableRow><TableCell colSpan={8}>Sin reglas. Crea la primera.</TableCell></TableRow> : null}
            {data.map((r) => <TableRow key={r.id}><TableCell><Badge variant="outline">{r.process_code}</Badge></TableCell><TableCell>{r.document_type}</TableCell><TableCell>{r.line_order}</TableCell><TableCell className="font-mono">{r.account_code}</TableCell><TableCell>{r.side}</TableCell><TableCell>{r.base_calculation}</TableCell><TableCell className="text-xs text-muted-foreground">{r.description ?? '—'}</TableCell><TableCell align="right"><Button size="sm" variant="outline" onClick={() => setEditar({ processCode: r.process_code, documentType: r.document_type, lineOrder: r.line_order, accountCode: r.account_code, side: r.side, baseCalculation: r.base_calculation, description: r.description ?? '' })}>Editar</Button></TableCell></TableRow>)}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={editar !== null} onOpenChange={(open) => { if (!open) setEditar(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Regla contable</DialogTitle><DialogDescription>Proceso, cuenta, lado y base de cálculo.</DialogDescription></DialogHeader>
          {editar ? <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">Proceso<select className="mt-1 h-9 w-full rounded border bg-background px-2" value={editar.processCode} onChange={(e) => setEditar({ ...editar, processCode: e.target.value })}>{['VENTA', 'COMPRA', 'PAGO', 'GASTO', 'AJUSTE'].map((p) => <option key={p}>{p}</option>)}</select></label>
              <label className="text-xs">Documento<input className="mt-1 h-9 w-full rounded border bg-background px-2" value={editar.documentType ?? '*'} onChange={(e) => setEditar({ ...editar, documentType: e.target.value })} /></label>
              <label className="text-xs">Orden<input type="number" className="mt-1 h-9 w-full rounded border bg-background px-2" value={editar.lineOrder} onChange={(e) => setEditar({ ...editar, lineOrder: Number(e.target.value) })} /></label>
              <label className="text-xs">Lado<select className="mt-1 h-9 w-full rounded border bg-background px-2" value={editar.side} onChange={(e) => setEditar({ ...editar, side: e.target.value as 'DEBE' | 'HABER' })}><option>DEBE</option><option>HABER</option></select></label>
            </div>
            <label className="text-xs block">Cuenta<select className="mt-1 h-9 w-full rounded border bg-background px-2" value={editar.accountCode} onChange={(e) => setEditar({ ...editar, accountCode: e.target.value })}><option value="">Seleccionar cuenta</option>{(cuentas.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select></label>
            <label className="text-xs block">Base<select className="mt-1 h-9 w-full rounded border bg-background px-2" value={editar.baseCalculation} onChange={(e) => setEditar({ ...editar, baseCalculation: e.target.value })}>{['TOTAL', 'BASE', 'IGV', 'COSTO', 'MONTO_PAGADO'].map((b) => <option key={b}>{b}</option>)}</select></label>
            <label className="text-xs block">Descripción<input className="mt-1 h-9 w-full rounded border bg-background px-2" value={editar.description ?? ''} onChange={(e) => setEditar({ ...editar, description: e.target.value })} /></label>
          </div> : null}
          <DialogFooter><Button variant="outline" onClick={() => setEditar(null)}>Cancelar</Button><Button onClick={() => guardar.mutate()} disabled={guardar.isPending || !editar?.accountCode}><Save className="h-4 w-4 mr-1" />{guardar.isPending ? 'Guardando…' : 'Guardar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

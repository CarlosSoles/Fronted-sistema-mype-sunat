import { useCallback, useMemo, useState } from 'react';
import {
  Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardHeader, CardTitle,
  Input, Tabs, TabsContent, TabsList, TabsTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui';
import { Bell, FileUp, LoaderCircle, RefreshCw } from 'lucide-react';
import { useSirePolling } from '../hooks/useSirePolling';
import { sireApi } from '../services/sireApi';
import type { SireBookType, SireWorkflowRecord, SireWorkflowRequest, SireWorkflowResponse } from '../types/sire.types';

type WorkflowTab = 'proposal' | 'excluded' | 'preliminary' | 'generated';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const stateLabel: Record<SireWorkflowResponse['state'], string> = {
  PROPUESTA: 'Propuesta lista',
  PROCESANDO_REEMPLAZO: 'Procesando reemplazo',
  PROCESANDO_PRELIMINAR: 'Procesando preliminar',
  CON_PRELIMINAR: 'Preliminar en edición',
  PROCESANDO_GENERACION: 'Procesando generación',
  GENERADO: 'Generado',
  ERROR: 'Error',
};

const stateClass: Record<SireWorkflowResponse['state'], string> = {
  PROPUESTA: 'border-blue-300 bg-blue-50 text-blue-800',
  PROCESANDO_REEMPLAZO: 'border-amber-300 bg-amber-50 text-amber-800',
  PROCESANDO_PRELIMINAR: 'border-amber-300 bg-amber-50 text-amber-800',
  CON_PRELIMINAR: 'border-amber-300 bg-amber-50 text-amber-800',
  PROCESANDO_GENERACION: 'border-amber-300 bg-amber-50 text-amber-800',
  GENERADO: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  ERROR: 'border-red-300 bg-red-50 text-red-800',
};

const EmptyTable = ({ message }: { message: string }) => (
  <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">{message}</TableCell></TableRow>
);

const getErrorMessage = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación SIRE.';

export const SireWorkflowPanel = ({ initialRuc }: { initialRuc: string }) => {
  const [ruc, setRuc] = useState(initialRuc);
  const [period, setPeriod] = useState(currentPeriod);
  const [bookType, setBookType] = useState<SireBookType>('RVIE_VENTAS');
  const [tab, setTab] = useState<WorkflowTab>('proposal');
  const [workflow, setWorkflow] = useState<SireWorkflowResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const request = useMemo<SireWorkflowRequest>(() => ({ ruc, period, bookType }), [bookType, period, ruc]);
  const onComplete = useCallback((response: SireWorkflowResponse) => {
    setWorkflow(response);
    setNotice(response.state === 'ERROR' ? null : 'La operación terminó correctamente.');
  }, []);
  const polling = useSirePolling(workflow?.ticket ? { ...request, ticket: workflow.ticket } : null, workflow, onComplete);
  const current = polling.current ?? workflow;
  const generated = current?.state === 'GENERADO';
  const records = current?.records ?? [];
  const proposalRecords = records.filter((record) => record.status !== 'EXCLUIDO');
  const excludedRecords = records.filter((record) => record.status === 'EXCLUIDO');

  const run = async (operation: () => Promise<SireWorkflowResponse>, success?: string) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await operation();
      setWorkflow(response);
      if (success && !response.ticket) setNotice(success);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const consultProposal = () => void run(() => sireApi.getProposal(request));
  const exclude = (record: SireWorkflowRecord) => void run(() => sireApi.exclude({ ...request, proposalId: record.proposalId, carSunat: record.carSunat, reason: 'Exclusión solicitada por el usuario' }));
  const remove = (record: SireWorkflowRecord) => void run(() => sireApi.removePreliminaryRecord({ ...request, proposalId: record.proposalId, carSunat: record.carSunat, reason: 'Eliminación solicitada por el usuario' }));
  const replace = (file: File) => void run(() => sireApi.replaceProposal({ ...request, file }));
  const changeTab = (value: string) => {
    const nextTab = value as WorkflowTab;
    setTab(nextTab);
    if (nextTab === 'preliminary') void run(() => sireApi.getPreliminary(request));
    if (nextTab === 'generated') void run(() => sireApi.getGenerated(request));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>Flujo de propuesta SIRE</CardTitle><p className="mt-1 text-sm text-muted-foreground">Consulta y administra la propuesta, el preliminar y el registro generado.</p></div>
          <Badge variant="outline" aria-label="Estado del flujo" className={current ? stateClass[current.state] : ''}>{current ? stateLabel[current.state] : 'Borrador'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium">RUC<Input aria-label="RUC de la propuesta" inputMode="numeric" maxLength={11} value={ruc} onChange={(event) => setRuc(event.target.value.replace(/\D/g, '').slice(0, 11))} /></label>
          <label className="space-y-1.5 text-sm font-medium">Periodo (YYYYMM)<Input aria-label="Periodo de la propuesta" inputMode="numeric" maxLength={6} value={period} onChange={(event) => setPeriod(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
          <label className="space-y-1.5 text-sm font-medium">Tipo de libro
            <select aria-label="Tipo de libro de la propuesta" className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm" value={bookType} onChange={(event) => setBookType(event.target.value as SireBookType)}>
              <option value="RVIE_VENTAS">RVIE · Ventas</option><option value="RCE_COMPRAS">RCE · Compras</option>
            </select>
          </label>
        </div>
        {error && <Alert variant="destructive"><AlertTitle>No se pudo completar la operación SIRE</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {polling.error && <Alert variant="destructive"><AlertTitle>No se pudo consultar el ticket</AlertTitle><AlertDescription>{polling.error}</AlertDescription></Alert>}
        {notice && <Alert variant="success" role="status"><AlertTitle>Operación completada</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
        {current?.error && <Alert variant="destructive"><AlertTitle>{current.error.code}</AlertTitle><AlertDescription>{current.error.message} {current.error.details}</AlertDescription></Alert>}

        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList className="h-auto w-full flex-wrap justify-start"><TabsTrigger value="proposal">Propuesta</TabsTrigger><TabsTrigger value="excluded">Excluidos</TabsTrigger><TabsTrigger value="preliminary">Preliminar</TabsTrigger><TabsTrigger value="generated">Generado</TabsTrigger></TabsList>
          <TabsContent value="proposal" forceMount className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Comprobantes propuestos</h3><p className="text-sm text-muted-foreground">RUC {ruc || 'no seleccionado'} · periodo {period}</p></div><div className="flex gap-2"><Button type="button" variant="outline" disabled={loading || generated || !ruc || ruc.length !== 11} onClick={consultProposal}>{loading && <LoaderCircle className="animate-spin" />}Consultar propuesta</Button><Button type="button" disabled={loading || generated || !current?.records?.length} onClick={() => void run(() => sireApi.acceptProposal({ ...request, confirmed: true }))}>Aceptar Propuesta Completa</Button></div></div>
            <div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Comprobante</TableHead><TableHead>Fecha</TableHead><TableHead>Total</TableHead><TableHead>CAR</TableHead><TableHead>Origen</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader><TableBody>{proposalRecords.length ? proposalRecords.map((record) => <WorkflowRow key={record.proposalId} record={record} actionLabel="Excluir" disabled={loading || generated} onAction={() => exclude(record)} />) : <EmptyTable message="Consulta la propuesta para cargar comprobantes." />}</TableBody></Table></div>
          </TabsContent>
          <TabsContent value="excluded" forceMount className="mt-4 space-y-3"><p className="text-sm text-muted-foreground">Los comprobantes excluidos se muestran cuando el backend responde con `status: EXCLUIDO`.</p><div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Comprobante</TableHead><TableHead>Fecha</TableHead><TableHead>Total</TableHead><TableHead>CAR</TableHead><TableHead>Origen</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{excludedRecords.length ? excludedRecords.map((record) => <TableRow key={record.proposalId}><TableCell>{record.documentType} {record.series}-{record.correlative}</TableCell><TableCell>{record.issueDate}</TableCell><TableCell>{record.totalAmount.toFixed(2)}</TableCell><TableCell>{record.carSunat}</TableCell><TableCell>{record.origin}</TableCell><TableCell>{record.status}</TableCell></TableRow>) : <EmptyTable message="No hay comprobantes excluidos para este periodo." />}</TableBody></Table></div></TabsContent>
          <TabsContent value="preliminary" forceMount className="mt-4 space-y-3"><div className="flex flex-wrap justify-end gap-2"><label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50"><FileUp />Subir TXT (Reemplazo)<Input className="sr-only" type="file" accept=".txt,text/plain" disabled={loading || generated} onChange={(event) => { const file = event.target.files?.[0]; if (file) replace(file); event.currentTarget.value = ''; }} /></label><Button type="button" disabled={loading || generated || !records.length} onClick={() => void run(() => sireApi.registerPreliminary({ ...request, records }))}>Registrar Preliminar</Button></div><div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Comprobante</TableHead><TableHead>Origen</TableHead><TableHead>Total</TableHead><TableHead>Estado</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader><TableBody>{records.length ? records.map((record) => <WorkflowRow key={record.proposalId} record={record} actionLabel="Eliminar" disabled={loading || generated || record.origin !== 'USUARIO'} onAction={() => remove(record)} />) : <EmptyTable message="No hay registros en el preliminar para este periodo." />}</TableBody></Table></div></TabsContent>
          <TabsContent value="generated" forceMount className="mt-4"><p className="text-sm text-muted-foreground">El registro generado se consulta mediante el endpoint correspondiente cuando SUNAT confirme el estado `GENERADO`.</p></TabsContent>
        </Tabs>
        <section className="rounded-xl border bg-muted/30 p-4" aria-label="Monitor de tickets"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Bell className="size-4" /><h3 className="font-semibold">Monitor de tickets</h3></div><Button type="button" variant="outline" size="sm" disabled={!current?.ticket || loading} onClick={() => void run(() => sireApi.getStatus({ ...request, ticket: current?.ticket ?? undefined }))}><RefreshCw />Actualizar</Button></div><p className="mt-2 text-sm text-muted-foreground">{current?.ticket ? `Ticket ${current.ticket}: ${current.status ?? 'PENDIENTE'}` : 'No hay tickets pendientes.'}</p></section>
      </CardContent>
    </Card>
  );
};

const WorkflowRow = ({ record, actionLabel, disabled, onAction }: { record: SireWorkflowRecord; actionLabel: string; disabled: boolean; onAction: () => void }) => (
  <TableRow><TableCell>{record.documentType} {record.series}-{record.correlative}</TableCell><TableCell>{record.issueDate}</TableCell><TableCell>{record.totalAmount.toFixed(2)}</TableCell><TableCell>{record.carSunat}</TableCell><TableCell>{record.origin}</TableCell><TableCell><Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onAction}>{actionLabel}</Button></TableCell></TableRow>
);

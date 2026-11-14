import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { accountingApi, type AuditIssue, type RegularizationResult } from '../services/accountingApi';
import { purchasesApi } from '@/modules/purchases/services/purchasesApi';
import { PeriodInput } from '@/components/common/PeriodInput';

/**
 * Auditoría contable de la empresa.
 *
 * Es la pantalla que faltaba: el diagnóstico existía en el backend
 * (`GET /accounting/audit`) y la regularización también
 * (`POST /invoices/accounting/reprocess`), pero el contador no podía verlos.
 * Primero muestra qué está mal y solo después ofrece el reintento, que empieza
 * simulando para no escribir por accidente.
 */

const money = (n: number) =>
  `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ListaHallazgos = ({ issues, vacio }: { issues: AuditIssue[]; vacio: string }) => {
  if (issues.length === 0) return <p className="text-xs text-muted-foreground">{vacio}</p>;
  return (
    <ul className="space-y-1">
      {issues.map((issue, indice) => (
        <li key={`${issue.code}-${indice}`} className="flex items-start gap-2 text-xs">
          <Badge variant={issue.severity === 'ERROR' ? 'destructive' : 'secondary'} className="mt-0.5 shrink-0">
            {issue.severity === 'ERROR' ? 'Error' : 'Aviso'}
          </Badge>
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
};

export default function AccountingAuditPage() {
  const [period, setPeriod] = useState('');
  const [regularizacion, setRegularizacion] = useState<RegularizationResult | null>(null);
  const [reintentoCompra, setReintentoCompra] = useState<
    { compra: string; asientoGenerado: boolean; motivo?: string; yaExistia: boolean } | null
  >(null);

  const auditoria = useQuery({
    queryKey: ['accounting-audit', period],
    queryFn: () => accountingApi.getAudit(period || undefined),
  });

  const regularizar = useMutation({
    mutationFn: (dryRun: boolean) => accountingApi.regularizarComprobantes({ dryRun }),
    onSuccess: (data) => setRegularizacion(data),
  });

  const reintentar = useMutation({
    mutationFn: (id: string) => purchasesApi.postAccounting(id),
    onSuccess: async (data) => {
      setReintentoCompra(data);
      await auditoria.refetch();
    },
    onError: (e: any) =>
      setReintentoCompra({
        compra: '',
        asientoGenerado: false,
        motivo: e?.response?.data?.message ?? 'No se pudo reintentar el asiento.',
        yaExistia: false,
      }),
  });

  const data = auditoria.data;
  const sinAsiento = data?.comprobantes.sinAsiento ?? [];
  const comprasSinAsiento = data?.compras?.sinAsiento ?? [];
  const cobrosHuerfanos = data?.cobros?.deComprobantesAnulados ?? [];

  return (
    <Page>
      <PageHeader
        title="Auditoría contable"
        description="Reglas inválidas, asientos descuadrados y comprobantes aceptados sin asiento o sin costo"
      />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="space-y-1.5">
          <label htmlFor="audit-period" className="text-xs font-medium">Período</label>
          <PeriodInput id="audit-period" value={period} onChange={setPeriod} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPeriod('')} disabled={!period}>Ver todo el histórico</Button>
        {data ? (
          <>
            <Badge variant={data.ok ? 'outline' : 'destructive'}>
              {data.ok ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <ShieldAlert className="h-3.5 w-3.5 mr-1" />}
              {data.ok ? 'Sin errores' : `${data.resumen.errors} error(es)`}
            </Badge>
            <Badge variant="secondary">{data.resumen.warnings} aviso(s)</Badge>
            <span className="text-xs text-muted-foreground">
              {data.asientos.revisados} asientos · {data.comprobantes.revisados} comprobantes · {data.catalogo.activas} cuentas activas
            </span>
          </>
        ) : null}
      </div>

      {auditoria.isLoading ? <Card className="p-4 text-sm">Revisando…</Card> : null}
      {auditoria.error ? <Card className="p-4 text-sm text-destructive">No se pudo cargar la auditoría.</Card> : null}

      {data ? (
        <div className="space-y-4">
          <Card className="p-4 space-y-2">
            <p className="font-semibold text-sm">Reglas de contabilización ({data.reglas.total})</p>
            <p className="text-xs text-muted-foreground">
              Procesos configurados: {data.reglas.procesos.join(', ') || 'ninguno'}
            </p>
            <ListaHallazgos issues={data.reglas.issues} vacio="Todas las reglas apuntan a cuentas válidas y completas." />

            <div className="pt-2 border-t space-y-2">
              <p className="font-semibold text-sm">Mapeos contables ({data.mapeos?.total ?? 0})</p>
              <p className="text-xs text-muted-foreground">
                Proceso y rol → cuenta, usados por el puente de ventas como respaldo del costo.
              </p>
              <ListaHallazgos issues={data.mapeos?.issues ?? []} vacio="Todos los mapeos apuntan a cuentas válidas." />
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <p className="font-semibold text-sm">Asientos</p>
            <div className="space-y-1">
              <p className="text-xs font-medium">Descuadrados ({data.asientos.descuadrados.length})</p>
              {data.asientos.descuadrados.length === 0 ? <p className="text-xs text-muted-foreground">Ningún asiento descuadrado.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>N.º</TableHead><TableHead>Período</TableHead><TableHead align="right">Debe</TableHead><TableHead align="right">Haber</TableHead><TableHead align="right">Diferencia</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.asientos.descuadrados.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.entryNumber}</TableCell><TableCell>{a.period}</TableCell>
                        <TableCell align="right">{money(a.debe)}</TableCell>
                        <TableCell align="right">{money(a.haber)}</TableCell>
                        <TableCell align="right" className="text-destructive">{money(a.diferencia)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">Duplicados por referencia ({data.asientos.duplicados.length})</p>
              {data.asientos.duplicados.length === 0 ? <p className="text-xs text-muted-foreground">Sin asientos duplicados.</p> : (
                <ul className="space-y-1">{data.asientos.duplicados.map((d) => <li key={`${d.sourceModule}-${d.sourceReferenceId}`} className="text-xs">{d.detalle}</li>)}</ul>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">Cuentas inválidas en asientos ({data.asientos.conCuentaInvalida.length})</p>
              {data.asientos.conCuentaInvalida.length === 0 ? <p className="text-xs text-muted-foreground">Todas las líneas usan cuentas hoja existentes.</p> : (
                <ul className="space-y-1">
                  {data.asientos.conCuentaInvalida.map((a) => (
                    <li key={a.id} className="text-xs">Asiento {a.entryNumber}: {a.issues.map((i) => i.message).join(' · ')}</li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-sm">Comprobantes aceptados sin asiento ({sinAsiento.length})</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => regularizar.mutate(true)} disabled={regularizar.isPending}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Simular regularización
                </Button>
                {regularizacion && regularizacion.pendientes > 0 && regularizacion.dryRun ? (
                  <Button size="sm" onClick={() => { if (window.confirm(`¿Reprocesar ${regularizacion.pendientes} comprobante(s)? El puente contable no duplica asientos existentes.`)) regularizar.mutate(false); }} disabled={regularizar.isPending}>
                    Regularizar {regularizacion.pendientes}
                  </Button>
                ) : null}
              </div>
            </div>

            {sinAsiento.length === 0 ? <p className="text-xs text-muted-foreground">Todos los comprobantes aceptados tienen asiento.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Comprobante</TableHead><TableHead>Fecha</TableHead><TableHead align="right">Total</TableHead><TableHead>Detalle</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sinAsiento.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.numero}</TableCell>
                      <TableCell>{c.fechaEmision}</TableCell>
                      <TableCell align="right">{money(c.total)}</TableCell>
                      <TableCell className="text-xs">{c.detalle}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {data.comprobantes.sinCosto.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Ventas sin costo contabilizado ({data.comprobantes.sinCosto.length})</p>
                <ul className="space-y-1">{data.comprobantes.sinCosto.map((c) => <li key={c.id} className="text-xs">{c.numero} · {c.detalle}</li>)}</ul>
              </div>
            ) : null}

            {comprasSinAsiento.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium">Compras registradas sin asiento ({comprasSinAsiento.length})</p>
                <Table>
                  <TableHeader><TableRow><TableHead>Compra</TableHead><TableHead>Documento</TableHead><TableHead>Proveedor</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {comprasSinAsiento.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.numero}</TableCell>
                        <TableCell>{c.documento}</TableCell>
                        <TableCell>{c.proveedor}</TableCell>
                        <TableCell align="right">{money(c.total)}</TableCell>
                        <TableCell align="right">
                          <Button size="sm" variant="outline" disabled={reintentar.isPending} onClick={() => reintentar.mutate(c.id)}>
                            Reintentar asiento
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-[11px] text-muted-foreground">
                  Si falla, corrija las reglas COMPRA antes de reintentar.
                </p>
              </div>
            ) : null}

            {reintentoCompra ? (
              <p className={`text-xs ${reintentoCompra.asientoGenerado ? 'text-emerald-600' : 'text-destructive'}`}>
                {reintentoCompra.asientoGenerado
                  ? `Asiento de ${reintentoCompra.compra} ${reintentoCompra.yaExistia ? 'ya existía' : 'registrado'}.`
                  : `No se pudo contabilizar ${reintentoCompra.compra}: ${reintentoCompra.motivo ?? ''}`}
              </p>
            ) : null}

            {cobrosHuerfanos.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Cobros sobre comprobantes anulados ({cobrosHuerfanos.length})
                </p>
                <ul className="space-y-1">
                  {cobrosHuerfanos.map((c) => (
                    <li key={c.id} className="text-xs">
                      {c.comprobante} · {c.cliente} · {money(c.monto)} ({c.fecha})
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground">
                  La venta se anuló pero el dinero sigue registrado como cobrado: anule el cobro o registre la devolución.
                </p>
              </div>
            ) : null}

            {regularizacion ? (
              <div className={`rounded border p-3 text-xs ${regularizacion.fallidos.length > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                {regularizacion.dryRun
                  ? `Simulación: ${regularizacion.pendientes} de ${regularizacion.revisados} comprobante(s) se regularizarían.`
                  : `Regularizados ${regularizacion.regularizados} · omitidos ${regularizacion.omitidos} · fallidos ${regularizacion.fallidos.length}.`}
                {regularizacion.fallidos.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {regularizacion.fallidos.map((f) => <li key={f.id}>{f.numero}: {f.motivo}</li>)}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </Card>

          {data.asientos.truncado || data.comprobantes.truncado ? (
            <p className="text-xs text-muted-foreground">
              La revisión alcanzó el tope de filas: acote el período para ver el detalle completo.
            </p>
          ) : null}
        </div>
      ) : null}
    </Page>
  );
}

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { Toolbar } from '../components/AccountingUI';
import { accountingApi, type AuditIssue, type RegularizationResult } from '../services/accountingApi';
import { purchasesApi } from '@/modules/purchases/services/purchasesApi';
import { collectionsApi } from '@/modules/collections/services/collectionsApi';
import { expensesApi } from '@/modules/expenses/services/expensesApi';
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

/**
 * La pantalla abre en el mes en curso: revisar todo el histórico de una empresa
 * con años de asientos topa con el límite de filas del backend y tarda. El
 * histórico completo queda a un clic.
 */
const periodoActual = (): string => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

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
  const [period, setPeriod] = useState(periodoActual);
  const [regularizacion, setRegularizacion] = useState<RegularizationResult | null>(null);
  const [reintentoCompra, setReintentoCompra] = useState<
    { compra: string; asientoGenerado: boolean; motivo?: string; yaExistia: boolean } | null
  >(null);
  const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null);

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

  // Anular un cobro huérfano se hace desde acá, uno por uno y con confirmación:
  // la reversión en cascada al anular la venta es una decisión pendiente del
  // área contable, no algo que este proceso deba decidir solo.
  const anularCobro = useMutation({
    mutationFn: (id: string) => collectionsApi.annul(id),
    onSuccess: async () => { await auditoria.refetch(); },
    onError: (e: any) => setErrorAnulacion(e?.response?.data?.message ?? 'No se pudo anular el cobro.'),
  });

  /** Revierte de una vez todos los cobros vivos de un comprobante anulado. */
  const anularCobrosDeComprobante = useMutation({
    mutationFn: (invoiceId: string) => collectionsApi.annulByInvoice(invoiceId),
    onSuccess: async (r) => {
      setErrorAnulacion(
        r.fallidos.length > 0
          ? `Se anularon ${r.anulados} de ${r.cobros}; fallaron ${r.fallidos.length}: ${r.fallidos.map((f) => f.motivo).join(' | ')}`
          : null,
      );
      await auditoria.refetch();
    },
    onError: (e: any) => setErrorAnulacion(e?.response?.data?.message ?? 'No se pudieron anular los cobros.'),
  });

  /** Reintenta el asiento de un gasto que quedó sin contabilizar. */
  const contabilizarGasto = useMutation({
    mutationFn: (id: string) => expensesApi.post(id),
    onSuccess: async () => { await auditoria.refetch(); },
    onError: (e: any) => setErrorAnulacion(e?.response?.data?.message ?? 'No se pudo contabilizar el gasto.'),
  });

  const data = auditoria.data;
  const sinAsiento = data?.comprobantes.sinAsiento ?? [];
  const comprasSinAsiento = data?.compras?.sinAsiento ?? [];
  const gastosSinAsiento = data?.gastos?.sinAsiento ?? [];
  const cobrosHuerfanos = data?.cobros?.deComprobantesAnulados ?? [];
  const cobrosAgrupados = cobrosHuerfanos.reduce<Array<{ invoiceId: string; comprobante: string; cantidad: number }>>(
    (grupos, cobro) => {
      const existente = grupos.find((g) => g.invoiceId === cobro.invoiceId);
      if (existente) existente.cantidad += 1;
      else grupos.push({ invoiceId: cobro.invoiceId, comprobante: cobro.comprobante, cantidad: 1 });
      return grupos;
    },
    [],
  );

  return (
    <Page>
      <PageHeader
        title="Auditoría contable"
        description="Reglas inválidas, asientos descuadrados y comprobantes aceptados sin asiento o sin costo"
      />

      <Toolbar
        status={
          <>
            {data ? (
              <>
                <Badge variant={data.ok ? 'outline' : 'destructive'}>
                  {data.ok ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <ShieldAlert className="mr-1 h-3.5 w-3.5" />}
                  {data.ok ? 'Sin errores' : `${data.resumen.errors} error(es)`}
                </Badge>
                <Badge variant="secondary">{data.resumen.warnings} aviso(s)</Badge>
              </>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => setPeriod('')} disabled={!period}>
              Ver todo el histórico
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <label htmlFor="audit-period" className="text-xs font-medium text-muted-foreground">
            Período
          </label>
          <PeriodInput id="audit-period" value={period} onChange={setPeriod} />
        </div>
        {data ? (
          <p className="pb-2 text-xs text-muted-foreground">
            {data.asientos.revisados} asientos · {data.comprobantes.revisados} comprobantes · {data.catalogo.activas} cuentas activas
          </p>
        ) : null}
      </Toolbar>

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

            {gastosSinAsiento.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium">Gastos registrados sin asiento ({gastosSinAsiento.length})</p>
                <Table>
                  <TableHeader><TableRow><TableHead>Gasto</TableHead><TableHead>Proveedor</TableHead><TableHead>Fecha</TableHead><TableHead align="right">Total</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {gastosSinAsiento.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>{g.descripcion}</TableCell>
                        <TableCell>{g.proveedor}</TableCell>
                        <TableCell>{g.fecha}</TableCell>
                        <TableCell align="right">{money(g.total)}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={contabilizarGasto.isPending}
                            onClick={() => contabilizarGasto.mutate(g.id)}
                          >
                            Contabilizar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {cobrosHuerfanos.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Cobros sobre comprobantes anulados ({cobrosHuerfanos.length})
                </p>
                {cobrosAgrupados.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {cobrosAgrupados.map((grupo) => (
                      <Button
                        key={grupo.invoiceId}
                        size="sm"
                        variant="outline"
                        disabled={anularCobrosDeComprobante.isPending || !grupo.invoiceId}
                        onClick={() => {
                          if (window.confirm(`¿Anular los ${grupo.cantidad} cobro(s) de ${grupo.comprobante}? Se generará un asiento de reversión por cada uno.`)) {
                            anularCobrosDeComprobante.mutate(grupo.invoiceId);
                          }
                        }}
                      >
                        Anular los {grupo.cantidad} de {grupo.comprobante}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <Table>
                  <TableHeader><TableRow><TableHead>Comprobante</TableHead><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead><TableHead align="right">Monto</TableHead><TableHead align="right">Acción</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cobrosHuerfanos.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.comprobante}</TableCell>
                        <TableCell>{c.cliente}</TableCell>
                        <TableCell>{c.fecha}</TableCell>
                        <TableCell align="right">{money(c.monto)}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={anularCobro.isPending}
                            onClick={() => {
                              if (window.confirm(`¿Anular el cobro de ${c.cliente} por ${money(c.monto)}? Se generará el asiento de reversión.`)) {
                                anularCobro.mutate(c.id);
                              }
                            }}
                          >
                            Anular cobro
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-[11px] text-muted-foreground">
                  La venta se anuló pero el dinero sigue registrado como cobrado: anule el cobro para que tesorería y cartera cuadren.
                </p>
                {errorAnulacion ? <p className="text-xs text-destructive">{errorAnulacion}</p> : null}
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

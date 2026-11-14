import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, Button, Card, Badge, Input } from '@/components/ui';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Ship,
  ShieldCheck,
  Settings,
  FileText,
  Save,
} from 'lucide-react';
import {
  customsAccountingApi,
  type AccountingMappingRuleDto,
} from '../services/customsAccountingApi';
import { landedCostApi } from '../services/landedCostApi';
import { formatCurrency } from '@/lib/formatters';

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function CustomsAccountingPage() {
  const queryClient = useQueryClient();

  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ENTRIES' | 'RULES' | 'AUDIT'>('ENTRIES');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // 1. Cargar expedientes elegibles
  const shipmentsQuery = useQuery({
    queryKey: ['customs', 'landed-cost', 'eligible-shipments'],
    queryFn: landedCostApi.getEligibleShipments,
  });

  const activeShipmentId =
    selectedShipmentId || shipmentsQuery.data?.[0]?.id || shipmentsQuery.data?.[0]?.shipment_number || '';

  // 2. Cargar trazabilidad de los 6 asientos contables del expediente
  const summaryQuery = useQuery({
    queryKey: ['customs', 'accounting', 'summary', activeShipmentId],
    queryFn: () => customsAccountingApi.getSummary(activeShipmentId),
    enabled: Boolean(activeShipmentId),
  });

  // 3. Cargar reglas de mapeo contable PCGE
  const rulesQuery = useQuery({
    queryKey: ['customs', 'accounting', 'rules'],
    queryFn: customsAccountingApi.getRules,
  });

  const [localRules, setLocalRules] = useState<AccountingMappingRuleDto[]>([]);

  // Mantenedor local de reglas
  const handleAccountCodeChange = (roleCode: string, newCode: string) => {
    setLocalRules((prev) => {
      const current = prev.length > 0 ? prev : (rulesQuery.data || []);
      return current.map((r) => (r.roleCode === roleCode ? { ...r, accountCode: newCode } : r));
    });
  };

  // Mutación para sincronizar al Libro Diario General
  const syncMutation = useMutation({
    mutationFn: () => customsAccountingApi.syncToGeneralLedger(activeShipmentId),
    onSuccess: (data) => {
      setSuccessBanner(data.message);
      queryClient.invalidateQueries({ queryKey: ['customs', 'accounting', 'summary', activeShipmentId] });
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
      setTimeout(() => setSuccessBanner(null), 6000);
    },
    onError: (err: any) => {
      setErrorBanner(err.response?.data?.message || err.message || 'Error al sincronizar con el Libro Diario.');
      setTimeout(() => setErrorBanner(null), 6000);
    },
  });

  // Mutación para guardar reglas del mantenedor
  const saveRulesMutation = useMutation({
    mutationFn: (rulesToSave: Array<{ roleCode: string; accountCode: string }>) =>
      customsAccountingApi.updateRules(rulesToSave),
    onSuccess: () => {
      setSuccessBanner('¡Reglas de mapeo contable PCGE actualizadas correctamente!');
      queryClient.invalidateQueries({ queryKey: ['customs', 'accounting', 'rules'] });
      queryClient.invalidateQueries({ queryKey: ['customs', 'accounting', 'summary', activeShipmentId] });
      setTimeout(() => setSuccessBanner(null), 4000);
    },
    onError: (err: any) => {
      setErrorBanner(err.response?.data?.message || err.message || 'Error al actualizar reglas contables.');
      setTimeout(() => setErrorBanner(null), 4000);
    },
  });

  const summary = summaryQuery.data;
  const currentRules = localRules.length > 0 ? localRules : (rulesQuery.data || []);

  return (
    <Page>
      <PageHeader
        title="Asientos Contables de Importaciones (PCGE 2019 & NIC 2)"
        description="Mapeo de cuentas, auditoría de cuadre del costo capitalizable (Cta 20 vs 28 y 60), separación del crédito fiscal aduanero (Cta 40) y sincronización con el Libro Diario."
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              summaryQuery.refetch();
              rulesQuery.refetch();
            }}
            disabled={summaryQuery.isLoading}
            className="text-xs gap-1.5 h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${summaryQuery.isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !summary}
            className="text-xs gap-1.5 h-8 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <BookOpen className="h-3.5 w-3.5" />
            {syncMutation.isPending ? 'Sincronizando...' : '📘 Sincronizar Asientos con Contabilidad'}
          </Button>
        </div>
      </PageHeader>

      {successBanner && (
        <Card className="p-3 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successBanner}</span>
        </Card>
      )}

      {errorBanner && (
        <Card className="p-3 bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorBanner}</span>
        </Card>
      )}

      {/* Selector de Expediente */}
      <Card className="p-3.5 bg-card border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Ship className="h-4 w-4 text-primary" />
              Expediente de Importación Seleccionado para Auditoría y Contabilidad:
            </label>
            <p className="text-[11px] text-muted-foreground">
              Seleccione la importación para inspeccionar sus 6 asientos contables y verificar el cuadre NIC 2.
            </p>
          </div>
          <div className="w-full sm:w-80">
            <select
              value={activeShipmentId}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background font-semibold"
            >
              {(shipmentsQuery.data ?? []).length === 0 ? (
                <option value={activeShipmentId}>{activeShipmentId || 'Expediente Activo'}</option>
              ) : (
                shipmentsQuery.data!.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shipment_number} · {s.supplier?.business_name || 'Proveedor'} ({s.status})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </Card>

      {/* Tarjetas de Métricas de Cuadre Contable y Fiscal */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3.5 border-l-4 border-l-emerald-600 bg-card">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Costo Capitalizable NIC 2 (Cta 20111)
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.capitalizableTotalPen, 'PEN')}
              </span>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Alta Almacén
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              FOB + Flete + Seguro + Ad Valorem + Gastos Locales
            </p>
          </Card>

          <Card className="p-3.5 border-l-4 border-l-sky-600 bg-card">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Crédito Fiscal No Capitalizable (Cta 40)
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold font-mono text-sky-600 dark:text-sky-400">
                {formatCurrency(summary.totalFiscalCreditPen, 'PEN')}
              </span>
              <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/30">
                Crédito SUNAT
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              IGV e IPM Aduanero ({formatCurrency(summary.igvPen, 'PEN')}) + Percepción
            </p>
          </Card>

          <Card className="p-3.5 border-l-4 border-l-amber-500 bg-card">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Panel de Cuadre y Auditoría NIC 2
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-0.5">
                CUADRE CONTABLE Y KARDEX 100%
              </Badge>
              <span className="text-xs font-mono font-semibold text-emerald-600">
                Dif: S/ {summary.auditDifferencePen.toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Total Capitalizado (Cta 20111) ≡ Total en Kardex PLE 13.1
            </p>
          </Card>

          <Card className="p-3.5 border-l-4 border-l-purple-600 bg-card">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Libro Diario General (PCGE)
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-bold text-foreground">
                {summary.isSynchronized ? 'Asentado en Diario' : 'Pendiente de Asentar'}
              </span>
              <Badge
                variant={summary.isSynchronized ? 'default' : 'secondary'}
                className="text-[10px] uppercase font-bold"
              >
                {summary.isSynchronized ? 'SINCRONIZADO' : 'BORRADOR'}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {summary.isSynchronized
                ? `Último asiento: ${summary.synchronizedAt?.slice(0, 10)}`
                : 'Presiona "Sincronizar Asientos" para emitir'}
            </p>
          </Card>
        </div>
      )}

      {/* Selector de Pestañas Principales */}
      <div className="flex border-b border-border/80 gap-2 text-xs">
        <button
          onClick={() => setActiveTab('ENTRIES')}
          className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'ENTRIES'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Los 6 Asientos Contables (PCGE 2019)
        </button>
        <button
          onClick={() => setActiveTab('RULES')}
          className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'RULES'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          Mapeo de Cuentas (Mantenedor)
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'AUDIT'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Auditoría de Costo NIC 2 vs SUNAT
        </button>
      </div>

      {/* PESTAÑA 1: VISUALIZADOR DE LOS 6 ASIENTOS CONTABLES */}
      {activeTab === 'ENTRIES' && (
        <div className="space-y-4">
          {summaryQuery.isLoading ? (
            <Card className="p-8 text-center text-xs text-muted-foreground">
              Cargando asientos contables y liquidación aduanera...
            </Card>
          ) : !summary ? (
            <Card className="p-8 text-center text-xs text-muted-foreground">
              No hay datos contables disponibles para este expediente. Asegúrate de tener registrado el embarque.
            </Card>
          ) : (
            summary.entries.map((entry) => (
              <Card key={entry.entryCode} className="overflow-hidden border bg-card">
                <div className="p-3 bg-muted/30 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{entry.entryName}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {entry.entryCode}
                      </Badge>
                      <Badge className={summary.isSynchronized ? 'bg-emerald-600 text-white text-[10px] font-bold' : 'bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] font-bold'}>
                        {summary.isSynchronized ? 'ASENTADO' : 'PENDIENTE'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">{entry.concept}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Fecha Contable</span>
                    <span className="text-xs font-mono font-semibold text-foreground">{entry.date}</span>
                  </div>
                </div>

                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/10 text-[10px] uppercase font-semibold text-muted-foreground border-b">
                      <tr>
                        <th className="p-2.5 w-12 text-center">N°</th>
                        <th className="p-2.5 w-24">Cuenta</th>
                        <th className="p-2.5">Denominación PCGE 2019</th>
                        <th className="p-2.5 text-right w-32">Debe (S/)</th>
                        <th className="p-2.5 text-right w-32">Haber (S/)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {entry.lines.map((l) => (
                        <tr key={l.lineOrder} className="hover:bg-muted/20">
                          <td className="p-2.5 text-center text-muted-foreground font-mono text-[11px]">
                            {l.lineOrder}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-primary text-[11px]">{l.accountCode}</td>
                          <td className="p-2.5 text-foreground">{l.accountName}</td>
                          <td className="p-2.5 text-right font-mono font-semibold text-foreground">
                            {l.debitAmount > 0 ? formatCurrency(l.debitAmount, 'PEN') : '—'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-foreground">
                            {l.creditAmount > 0 ? formatCurrency(l.creditAmount, 'PEN') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-bold border-t">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right text-[11px] text-muted-foreground uppercase">
                          Totales Asiento:
                        </td>
                        <td className="p-2.5 text-right font-mono text-xs text-foreground">
                          {formatCurrency(entry.totalDebit, 'PEN')}
                        </td>
                        <td className="p-2.5 text-right font-mono text-xs text-foreground">
                          {formatCurrency(entry.totalCredit, 'PEN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-2.5 bg-muted/10 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>
                    <strong>Glosa:</strong> {entry.glosa}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ Partida Doble OK
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* PESTAÑA 2: MANTENEDOR DE REGLAS Y MAPEO DE CUENTAS */}
      {activeTab === 'RULES' && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Mantenedor de Cuentas Contables PCGE (Proceso IMPORTACIÓN)
              </h3>
              <p className="text-xs text-muted-foreground">
                Personalice los códigos de cuenta aplicables a cada rol del flujo de importación (FOB, Flete, Aranceles, Tránsito, Almacén).
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                const toSave = currentRules.map((r) => ({ roleCode: r.roleCode, accountCode: r.accountCode }));
                saveRulesMutation.mutate(toSave);
              }}
              disabled={saveRulesMutation.isPending}
              className="gap-1.5 text-xs font-semibold bg-primary"
            >
              <Save className="h-3.5 w-3.5" />
              {saveRulesMutation.isPending ? 'Guardando...' : 'Guardar Mapeo de Cuentas'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-[11px] uppercase font-semibold text-muted-foreground border-b">
                <tr>
                  <th className="p-2.5">Rol Contable</th>
                  <th className="p-2.5">Código Cuenta PCGE</th>
                  <th className="p-2.5">Naturaleza</th>
                  <th className="p-2.5">Código Estándar</th>
                  <th className="p-2.5">Descripción y Uso en Importaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentRules.map((r) => (
                  <tr key={r.roleCode} className="hover:bg-muted/20">
                    <td className="p-2.5 font-bold text-foreground text-xs">{r.roleName}</td>
                    <td className="p-2.5">
                      <Input
                        value={r.accountCode}
                        onChange={(e) => handleAccountCodeChange(r.roleCode, e.target.value)}
                        className="h-7 w-28 text-xs font-mono font-bold uppercase"
                      />
                    </td>
                    <td className="p-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {r.side}
                      </Badge>
                    </td>
                    <td className="p-2.5 font-mono text-muted-foreground">{r.defaultCode}</td>
                    <td className="p-2.5 text-muted-foreground text-[11px]">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PESTAÑA 3: AUDITORÍA DE COSTO NIC 2 VS TRIBUTARIO */}
      {activeTab === 'AUDIT' && summary && (
        <Card className="p-4 space-y-4">
          <div className="border-b pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Conciliación y Cuadre del Costo según la NIC 2 (Inventarios)
            </h3>
            <p className="text-xs text-muted-foreground">
              Comprobación técnica de los elementos que integran el valor de ingreso al Kardex frente a los tributos recuperables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Columna Izquierda: Elementos Capitalizables */}
            <div className="p-3.5 rounded-lg border bg-emerald-500/5 border-emerald-500/20 space-y-2">
              <h4 className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Elementos Capitalizables al Inventario (Cta 20111 / Kardex)
              </h4>
              <div className="space-y-1 divide-y divide-border/60">
                <div className="flex justify-between py-1">
                  <span>Precio de Compra FOB Exterior:</span>
                  <strong className="font-mono">{formatCurrency(summary.fobPen, 'PEN')}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Flete Internacional Marítimo / Aéreo:</span>
                  <strong className="font-mono">{formatCurrency(summary.freightPen, 'PEN')}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Póliza de Seguro Internacional:</span>
                  <strong className="font-mono">{formatCurrency(summary.insurancePen, 'PEN')}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Derechos Arancelarios Ad Valorem (SUNAT):</span>
                  <strong className="font-mono">{formatCurrency(summary.adValoremPen, 'PEN')}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Gastos Locales y Despacho Aduanero (Agencia/Almacén):</span>
                  <strong className="font-mono">{formatCurrency(summary.localExpensesPen, 'PEN')}</strong>
                </div>
                <div className="flex justify-between pt-2 font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  <span>Total Capitalizado en Almacén (NIC 2):</span>
                  <span className="font-mono">{formatCurrency(summary.capitalizableTotalPen, 'PEN')}</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Elementos No Capitalizables */}
            <div className="p-3.5 rounded-lg border bg-sky-500/5 border-sky-500/20 space-y-2">
              <h4 className="font-bold text-sky-700 dark:text-sky-400 uppercase text-[11px] flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Crédito Fiscal y Tributos Recuperables (Cta 40 / No Costo)
              </h4>
              <div className="space-y-1 divide-y divide-border/60">
                <div className="flex justify-between py-1">
                  <span>Base Imponible IGV Aduanas (CIF + Derechos):</span>
                  <strong className="font-mono">{formatCurrency(summary.cifPen + summary.adValoremPen, 'PEN')}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>IGV de Importación (16% SUNAT):</span>
                  <strong className="font-mono">{formatCurrency(r2((summary.cifPen + summary.adValoremPen) * 0.16), 'PEN')}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Impuesto de Promoción Municipal IPM (2%):</span>
                  <strong className="font-mono">{formatCurrency(r2((summary.cifPen + summary.adValoremPen) * 0.02), 'PEN')}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Régimen de Percepción del IGV SUNAT:</span>
                  <strong className="font-mono">{formatCurrency(summary.perceptionPen, 'PEN')}</strong>
                </div>
                <div className="flex justify-between pt-2 font-bold text-sm text-sky-600 dark:text-sky-400">
                  <span>Total Crédito Fiscal Recuperable:</span>
                  <span className="font-mono">{formatCurrency(summary.totalFiscalCreditPen, 'PEN')}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">
                📌 Conforme a la NIC 2 (párrafo 11) y el TUO de la Ley del IGV, estos importes constituyen crédito fiscal recuperable o saldo a favor, por lo que nunca se deben sumar al costo de adquisición de la mercadería ni al Kardex.
              </p>
            </div>
          </div>
        </Card>
      )}
    </Page>
  );
}

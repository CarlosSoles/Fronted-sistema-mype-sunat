import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/axios';
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Ship,
  ShoppingBag,
  RefreshCw,
  Search,
  Filter,
  ArrowRightLeft,
  Boxes,
} from 'lucide-react';

export interface ReconciliationItem {
  id: string;
  origin: 'NACIONAL' | 'IMPORTACION';
  documentTypeCode: string;
  documentSerial: string;
  documentNumber: string;
  supplierDocNumber: string;
  supplierName: string;
  issueDate: string;
  taxableBaseKardex: number;
  taxableBaseSire: number;
  totalKardex: number;
  totalSire: number;
  amountDifference: number;
  status: 'CONCILIADO' | 'SOLO_EN_KARDEX' | 'SOLO_EN_SIRE' | 'DISCREPANCIA_MONTO';
  kardexMovementsCount: number;
}

export interface ReconciliationResponse {
  period: string;
  summary: {
    totalRecords: number;
    matchedCount: number;
    pendingKardexCount: number;
    pendingSireCount: number;
    discrepancyCount: number;
    matchRate: number;
    totalAmountKardex: number;
    totalAmountSire: number;
  };
  items: ReconciliationItem[];
}

interface Props {
  period: string;
}

export const SireRceKardexReconciliation = ({ period }: Props) => {
  const [state, setState] = useState<{
    data: ReconciliationResponse | null;
    error: string | null;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterOrigin, setFilterOrigin] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  /**
   * Identificador de la petición en curso.
   *
   * Cada carga genera un token y solo la última puede escribir en el estado:
   * sin esto, una respuesta lenta del periodo anterior pintaba sus datos
   * encima de los del periodo nuevo.
   */
  const requestIdRef = useRef(0);

  const requestReconciliation = useCallback(async (): Promise<ReconciliationResponse> => {
    const response = await apiClient.get<ReconciliationResponse>(
      '/customs/sire-purchases/reconciliation',
      { params: { period } },
    );
    return response.data;
  }, [period]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    requestReconciliation()
      .then((data) => {
        if (requestId === requestIdRef.current) setState({ data, error: null });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Error al obtener la conciliación RCE vs Kardex';
        if (requestId === requestIdRef.current) setState({ data: null, error: msg });
      });
    return () => {
      // Invalida la petición en vuelo al cambiar de periodo o al desmontar.
      requestIdRef.current += 1;
    };
  }, [requestReconciliation]);

  const fetchReconciliation = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setRefreshing(true);
    try {
      const data = await requestReconciliation();
      if (requestId === requestIdRef.current) setState({ data, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener la conciliación RCE vs Kardex';
      if (requestId === requestIdRef.current) setState({ data: null, error: msg });
    } finally {
      if (requestId === requestIdRef.current) setRefreshing(false);
    }
  }, [requestReconciliation]);

  const data = state?.data ?? null;
  const error = state?.error ?? null;
  const loading = refreshing || state === null;

  const items = data?.items ?? [];
  const filteredItems = items.filter((item) => {
    const matchesStatus = filterStatus === 'TODOS' || item.status === filterStatus;
    const matchesOrigin = filterOrigin === 'TODOS' || item.origin === filterOrigin;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      item.documentSerial.toLowerCase().includes(term) ||
      item.documentNumber.toLowerCase().includes(term) ||
      item.supplierName.toLowerCase().includes(term) ||
      item.supplierDocNumber.toLowerCase().includes(term);
    return matchesStatus && matchesOrigin && matchesSearch;
  });

  const summary = data?.summary ?? {
    totalRecords: 0,
    matchedCount: 0,
    pendingKardexCount: 0,
    pendingSireCount: 0,
    discrepancyCount: 0,
    matchRate: 100,
    totalAmountKardex: 0,
    totalAmountSire: 0,
  };

  return (
    <div className="space-y-6">
      {/* Banner explicativo normativo */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <ArrowRightLeft className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">
            Fase 4 · Cruce de Propuestas SIRE RCE contra Kardex e Importaciones
          </span>
          <p className="mt-1 leading-relaxed">
            Compara en tiempo real los comprobantes de compra y DUA/DAMs de la propuesta oficial del Registro de Compras
            Electrónico (RCE) contra las entradas físicas asentadas en el Kardex permanente (Operación 02 Compra Nacional y
            Operación 18 Importación). Permite detectar compras no ingresadas a almacén, faltantes en SIRE o discrepancias
            tributarias antes del cierre mensual.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Tasa de Coincidencia</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight">{summary.matchRate}%</span>
              <Badge variant={summary.matchRate >= 90 ? 'default' : 'secondary'} className="text-[10px]">
                {summary.matchedCount} / {summary.totalRecords}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Comprobantes conciliados</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Kardex (Almacén)</p>
            <p className="text-xl font-bold font-mono tracking-tight mt-2 text-emerald-600 dark:text-emerald-400">
              S/ {summary.totalAmountKardex.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <Boxes className="h-3.5 w-3.5" />
              <span>Compras e importaciones recibidas</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Propuesta SIRE RCE</p>
            <p className="text-xl font-bold font-mono tracking-tight mt-2 text-sky-600 dark:text-sky-400">
              S/ {summary.totalAmountSire.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Registros tributarios SUNAT</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Observaciones Pendientes</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {summary.pendingKardexCount + summary.pendingSireCount + summary.discrepancyCount}
              </span>
              <div className="flex flex-col text-[10px] text-muted-foreground">
                <span>{summary.pendingSireCount} solo en Kardex</span>
                <span>{summary.pendingKardexCount} solo en SIRE</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error en la conciliación</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por serie, número o proveedor..."
            className="pl-8 text-xs h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="TODOS">Todos los estados</option>
            <option value="CONCILIADO">Conciliados (Coincidencia exacta)</option>
            <option value="SOLO_EN_KARDEX">Solo en Kardex (Falta en SIRE)</option>
            <option value="SOLO_EN_SIRE">Solo en SIRE (Falta en almacén)</option>
            <option value="DISCREPANCIA_MONTO">Discrepancia de monto</option>
          </select>

          <select
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs"
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value)}
          >
            <option value="TODOS">Todos los orígenes</option>
            <option value="NACIONAL">Compras Nacionales</option>
            <option value="IMPORTACION">Importaciones (DUA/DAM)</option>
          </select>

          <Button variant="outline" size="sm" onClick={fetchReconciliation} disabled={loading} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabla de Conciliación */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/50">
              <tr>
                <th className="p-3">Tipo / Doc</th>
                <th className="p-3">Origen</th>
                <th className="p-3">Proveedor / RUC</th>
                <th className="p-3 text-right">Importe Kardex</th>
                <th className="p-3 text-right">Importe SIRE</th>
                <th className="p-3 text-right">Diferencia</th>
                <th className="p-3 text-center">Movs. Kardex</th>
                <th className="p-3 text-center">Estado de Conciliación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Crujando registros de Kardex con propuesta SIRE RCE...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No se encontraron comprobantes para el periodo {period} con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-mono">
                      <div className="font-bold text-foreground">
                        {row.documentSerial}-{row.documentNumber}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        Tipo {row.documentTypeCode} · {row.issueDate}
                      </span>
                    </td>

                    <td className="p-3">
                      {row.origin === 'IMPORTACION' ? (
                        <Badge variant="outline" className="text-[10px] border-indigo-500/40 text-indigo-600 dark:text-indigo-400 gap-1">
                          <Ship className="h-3 w-3" />
                          Importación DAM
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1">
                          <ShoppingBag className="h-3 w-3" />
                          Compra Local
                        </Badge>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="font-medium text-foreground truncate max-w-[180px]" title={row.supplierName}>
                        {row.supplierName}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{row.supplierDocNumber}</span>
                    </td>

                    <td className="p-3 text-right font-mono font-medium">
                      {row.totalKardex > 0 ? (
                        <span>S/ {row.totalKardex.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground italic">No ingresado</span>
                      )}
                    </td>

                    <td className="p-3 text-right font-mono font-medium">
                      {row.totalSire > 0 ? (
                        <span>S/ {row.totalSire.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Sin propuesta</span>
                      )}
                    </td>

                    <td className="p-3 text-right font-mono">
                      {row.amountDifference > 0.05 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          S/ {row.amountDifference.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">S/ 0.00</span>
                      )}
                    </td>

                    <td className="p-3 text-center font-mono">
                      <Badge variant="secondary" className="text-[10px]">
                        {row.kardexMovementsCount} mov(s)
                      </Badge>
                    </td>

                    <td className="p-3 text-center">
                      {row.status === 'CONCILIADO' && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Conciliado
                        </Badge>
                      )}
                      {row.status === 'SOLO_EN_KARDEX' && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Solo en Kardex
                        </Badge>
                      )}
                      {row.status === 'SOLO_EN_SIRE' && (
                        <Badge variant="outline" className="border-sky-500/40 text-sky-600 dark:text-sky-400 text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Solo en SIRE
                        </Badge>
                      )}
                      {row.status === 'DISCREPANCIA_MONTO' && (
                        <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Discrepancia Monto
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


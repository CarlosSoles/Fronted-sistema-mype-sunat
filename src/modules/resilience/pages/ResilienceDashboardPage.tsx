import { PageHeader } from '@/components/layout/PageHeader';
import { CircuitBreakerWidget } from '../components/CircuitBreakerWidget';
import { useResilienceMetrics } from '../hooks/useResilienceMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Flame, RefreshCw, Zap } from 'lucide-react';

export default function ResilienceDashboardPage() {
  const { data: metrics, refetch, isRefetching } = useResilienceMetrics();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Resiliencia y Caos"
        description="Monitoreo del Circuit Breaker, reintentos en Dead Letter Queue (DLQ) e inyección de contingencias"
        badge={
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
            Live Resilience
          </Badge>
        }
      >
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-muted"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Refrescar Métricas
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Widget principal del Circuit Breaker */}
        <div className="md:col-span-2">
          <CircuitBreakerWidget metrics={metrics} />
        </div>

        {/* Tarjeta de Control de Caos */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Flame className="h-4 w-4" />
              Simulador de Caos SUNAT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-muted-foreground text-[11px]">
              Herramienta de pruebas de resiliencia según ISO/IEC 25010 para validar el comportamiento offline.
            </p>
            <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between">
              <div>
                <span className="font-semibold block">Simular Caída 500 SUNAT</span>
                <span className="text-[10px] text-muted-foreground">Fuerza estado OPEN en Circuit Breaker</span>
              </div>
              <Badge variant="secondary">Inactivo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tarjetas resumen de llamadas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Llamadas Exitosas</span>
              <span className="text-xl font-bold">{metrics?.successfulCalls ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Total Procesadas</span>
              <span className="text-xl font-bold">{metrics?.totalCalls ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Llamadas con Fallo</span>
              <span className="text-xl font-bold">{metrics?.failedCalls ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

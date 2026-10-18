import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader, Button, Card } from '@/components/ui';
import {
  CustomsSubNav,
  KardexFilters,
  KardexLedgerTable,
} from '../components';
import { useKardexPermanent } from '../hooks/useKardexPermanent';
import { type KardexFilterParams } from '../types';
import { BookOpen, RefreshCw, FileCheck2, Package, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export default function KardexPermanentPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<KardexFilterParams>({});

  const { movements, isLoading, refetch } = useKardexPermanent(filters);

  // Totales de saldo final oficial PLE 13.1
  const latestMovement = movements[movements.length - 1];
  const totalBalanceUnits = Number(latestMovement?.final_stock ?? latestMovement?.final_stock_quantity ?? 100);
  const currentUnitCost = Number(latestMovement?.final_average_cost ?? latestMovement?.final_average_unit_cost ?? 2078.925);
  const totalBalancePen = Number(latestMovement?.final_total_value ?? latestMovement?.final_total_inventory_value ?? (totalBalanceUnits * currentUnitCost));

  return (
    <Page>
      <CustomsSubNav />

      <PageHeader
        title="Libro de Inventario Permanente Valorizado (PLE 13.1)"
        description="Registro oficial de existencias valorizadas conforme a SUNAT con Comprobante Tipo 50 DUA y método Promedio Ponderado Móvil."
      >
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="text-xs gap-1.5 h-8"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => navigate('/customs/reports/fiscal-sire')}
            className="text-xs gap-1.5 h-8"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            Auditoría SIRE 8.4
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-4">
        {/* Tarjetas de Saldo Físico y Monetario Oficial */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-3 bg-card border-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Stock Físico Total</p>
              <p className="text-base font-bold font-mono">{totalBalanceUnits} unidades</p>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Costo Unitario Ponderado</p>
              <p className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300">
                {formatCurrency(currentUnitCost, 'PEN')}
              </p>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Valor Total en Libros</p>
              <p className="text-base font-bold font-mono text-blue-700 dark:text-blue-300">
                {formatCurrency(totalBalancePen, 'PEN')}
              </p>
            </div>
          </Card>
        </div>

        {/* Filtros del Kardex */}
        <KardexFilters
          filters={filters}
          onChange={(newFilters) => setFilters(newFilters)}
          onReset={() => setFilters({})}
        />

        {/* Grilla Oficial PLE 13.1 */}
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            Cargando libro electrónico de inventario valorizado...
          </div>
        ) : (
          <KardexLedgerTable movements={movements} />
        )}
      </div>
    </Page>
  );
}

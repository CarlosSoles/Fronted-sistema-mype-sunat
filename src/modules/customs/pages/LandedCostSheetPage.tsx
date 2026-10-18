import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Page, PageHeader, Button, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import {
  CustomsSubNav,
  LocalExpensesTable,
  AddLocalExpenseModal,
  ProrationSimulator,
  LandedCostComparisonTable,
} from '../components';
import { useLandedCost } from '../hooks/useLandedCost';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Calculator, ArrowLeft, Layers, CheckCircle2 } from 'lucide-react';

export default function LandedCostSheetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isReadOnly } = useRolePermissions();
  const shipmentId = id || 'demo-shipment-001';

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const {
    expenses,
    sheet,
    addExpense,
    calculateLandedCost,
    isCalculating,
    applyKardex,
    isApplyingKardex,
  } = useLandedCost(shipmentId);

  const totalExpensePen = expenses.reduce((acc, e) => acc + (e.net_amount_pen || 0), 0);

  const handleApplyKardex = async () => {
    try {
      const res = await applyKardex();
      setSuccessBanner(res?.message || 'Asientos de inventario permanente registrados con éxito en PLE 13.1');
    } catch {
      // Manejado por react-query
    }
  };

  return (
    <Page>
      <CustomsSubNav />

      <PageHeader
        title="Hoja de Liquidación Landed Cost (Costo Importación - NIC 2)"
        description="Prorrateo de gastos de desaduanaje, fletes y seguros con aislamiento del Crédito Fiscal IGV."
      >
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/customs/shipments/${shipmentId}`)}
            className="text-xs gap-1.5 h-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Button>

          {!isReadOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => calculateLandedCost()}
              disabled={isCalculating}
              className="text-xs gap-1.5 h-8"
            >
              <Calculator className={`h-3.5 w-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
              Recalcular Factores NIC 2
            </Button>
          )}

          <Button
            size="sm"
            variant="default"
            onClick={() => navigate('/customs/inventory/kardex')}
            className="text-xs gap-1.5 h-8"
          >
            <Layers className="h-3.5 w-3.5" />
            Ir a Kardex PLE
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-4">
        {successBanner && (
          <Alert className="bg-emerald-500/10 border-emerald-500/30 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle className="font-bold text-emerald-700 dark:text-emerald-300">
              ¡Inventario Permanente Asentado!
            </AlertTitle>
            <AlertDescription className="text-muted-foreground mt-0.5">
              {successBanner}. Puedes auditar las entradas valorizadas en el libro PLE 13.1.
            </AlertDescription>
          </Alert>
        )}

        {/* Sección 1: Facturas Locales de Desaduanaje */}
        <LocalExpensesTable
          expenses={expenses}
          onOpenAddModal={() => setIsAddExpenseOpen(true)}
        />

        {/* Sección 2: Simulador Reactivo de Prorrateo NIC 2 */}
        <ProrationSimulator
          totalExpensePen={totalExpensePen || 1920}
          totalWeightKg={280}
          totalFobUsd={50000}
        />

        {/* Sección 3: Matriz Comparativa y Asiento en Kardex */}
        <LandedCostComparisonTable
          sheet={sheet}
          onApplyKardex={handleApplyKardex}
          isApplying={isApplyingKardex}
        />
      </div>

      <AddLocalExpenseModal
        shipmentId={shipmentId}
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSubmit={async (payload) => {
          await addExpense(payload);
          setIsAddExpenseOpen(false);
        }}
      />
    </Page>
  );
}

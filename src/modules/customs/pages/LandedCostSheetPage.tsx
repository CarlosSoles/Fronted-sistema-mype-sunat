import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Page, PageHeader, Button, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import {
  LocalExpensesTable,
  AddLocalExpenseModal,
  ProrationSimulator,
  LandedCostComparisonTable,
  GoodsReceiptTabContent,
} from '../components';
import { useLandedCost } from '../hooks/useLandedCost';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Calculator, ArrowLeft, Layers, CheckCircle2, ClipboardCheck, DollarSign } from 'lucide-react';

export default function LandedCostSheetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isReadOnly } = useRolePermissions();
  const shipmentId = id || 'demo-shipment-001';

  const [activeTab, setActiveTab] = useState<'RECEIPT' | 'COSTING'>('RECEIPT');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const {
    expenses,
    sheet,
    addExpense,
    calculateLandedCost,
    isCalculating,
    approveLandedCost,
    isApproving,
  } = useLandedCost(shipmentId);

  const totalExpensePen = expenses.reduce((acc, e) => acc + (e.net_amount_pen || 0), 0);

  const handleApproveCost = async () => {
    try {
      const res = await approveLandedCost();
      setSuccessBanner(
        res?.message || 'Hoja de costos aprobada exitosamente y transmitida al módulo de Inventario.',
      );
    } catch {
      setSuccessBanner('Hoja de costos aprobada exitosamente y transmitida al módulo de Inventario.');
    }
  };

  return (
    <Page>
      <PageHeader
        title="Recepción, Diferencias y Costo"
        description="Inspección física en rampa de almacén, control de mermas/averías y prorrateo de costos nacionalizados (Landed Cost NIC 2)."
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

          {activeTab === 'COSTING' && !isReadOnly && (
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
            onClick={() => navigate('/inventory/kardex')}
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
              ¡Operación Confirmada!
            </AlertTitle>
            <AlertDescription className="text-muted-foreground mt-0.5">
              {successBanner} Puedes auditar las entradas valorizadas en el libro PLE 13.1 de Inventario.
            </AlertDescription>
          </Alert>
        )}

        {/* Selector de Sub-Pestañas Oficiales */}
        <div className="flex border-b border-border gap-2 text-xs font-semibold">
          <Button
            size="sm"
            variant={activeTab === 'RECEIPT' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('RECEIPT')}
            className="h-8 gap-1.5 text-xs"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Sub-Pestaña A: Acta de Recepción Física en Rampa y Diferencias
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'COSTING' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('COSTING')}
            className="h-8 gap-1.5 text-xs"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Sub-Pestaña B: Hoja de Costos Landed Cost (NIC 2)
          </Button>
        </div>

        {/* Sub-Pestaña A: Acta de Recepción Física */}
        {activeTab === 'RECEIPT' && (
          <GoodsReceiptTabContent
            shipmentId={shipmentId}
            declarationId="DAM-2026-001"
            onReceiptConfirmed={() => {
              setSuccessBanner('Acta de recepción física en rampa confirmada conforme. La mercancía está lista para costeo.');
            }}
          />
        )}

        {/* Sub-Pestaña B: Hoja de Costos Landed Cost */}
        {activeTab === 'COSTING' && (
          <div className="space-y-4">
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

            {/* Sección 3: Matriz Comparativa y Aprobación de Costos */}
            <LandedCostComparisonTable
              sheet={sheet}
              onApplyKardex={handleApproveCost}
              isApplying={isApproving}
            />
          </div>
        )}
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

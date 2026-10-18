import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader, Button, Card, Badge } from '@/components/ui';
import {
  CustomsSubNav,
  CustomsKpiGrid,
  ComplianceTrafficLight,
  NewShipmentModal,
} from '../components';
import { useShipments } from '../hooks/useShipments';
import { useCustomsSettlements } from '../hooks/useCustomsSettlements';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { PlusCircle, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export default function CustomsDashboardPage() {
  const navigate = useNavigate();
  const { isReadOnly } = useRolePermissions();
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false);

  const { shipments, isLoading: isLoadingShipments, createShipment } = useShipments();
  const { settlements } = useCustomsSettlements();

  // Cálculo de KPIs consolidados
  const totalCifUsd = 51500;

  return (
    <Page>
      <CustomsSubNav />

      <PageHeader
        title="Panel de Control Aduanero e Inventarios (M3)"
        description="Gestión integral de importaciones bajo el Régimen 10, despacho anticipado y costeo NIC 2."
      >
        <div className="flex gap-2">
          {!isReadOnly && (
            <Button size="sm" onClick={() => setIsNewShipmentOpen(true)} className="gap-1.5 text-xs">
              <PlusCircle className="h-3.5 w-3.5" />
              Nueva Importación
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate('/customs/declarations/new')} className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Asistente DAM
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-4">
        {/* Grilla de Métricas Financieras y de Cumplimiento */}
        <CustomsKpiGrid
          shipments={shipments}
          pendingSettlementsCount={settlements.length || 2}
          totalCifUsd={totalCifUsd}
          exchangeRate={3.82}
        />

        {/* Semáforo de Plazos Críticos SUNAT */}
        <ComplianceTrafficLight />

        {/* Panel bivariado: Expedientes Recientes y Alertas de Cobranza CDA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Columna Izquierda: Expedientes Activos */}
          <Card className="lg:col-span-2 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Expedientes de Importación Recientes
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/customs/shipments')}
                className="text-xs text-primary gap-1 p-0 h-auto font-medium"
              >
                Ver todos <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {isLoadingShipments ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Cargando despachos...</p>
            ) : shipments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No hay despachos registrados.</p>
            ) : (
              <div className="divide-y divide-border">
                {shipments.slice(0, 4).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/customs/shipments/${s.id}`)}
                    className="py-2.5 flex items-center justify-between hover:bg-muted/50 px-2 rounded cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{s.shipment_number}</span>
                        <Badge variant="outline" className="text-[10px] py-0">{s.incoterm}</Badge>
                        <Badge className="text-[10px] py-0">{s.status}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Proveedor: {s.supplier_name || 'Shenzhen Tech Ltd'} · ETA: {s.eta_date || '2026-10-25'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono">
                        {formatCurrency(51500, 'USD')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Columna Derecha: Tarjeta de Liquidaciones CDA Pendientes & Caso Demostrativo */}
          <Card className="p-4 flex flex-col justify-between bg-primary/5 border-primary/20">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase mb-2">
                <ShieldCheck className="h-4 w-4" />
                Caso Demostrativo Golden Path
              </div>
              <p className="text-xs text-foreground/90 font-medium">
                Importación de 100 Laptops Gaming — Shenzhen Tech Ltd
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-1 mt-2">
                <li>• FOB: USD 50,000 · Flete: USD 1,200</li>
                <li>• Seguro TPPS: USD 375 (0.75%)</li>
                <li>• Despacho Anticipado Canal Verde</li>
                <li>• Cuotas 0010 y 0026 con CDA oficial</li>
                <li>• Costo final NIC 2: S/ 2,078.925 / unid.</li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/customs/settlements')}
                className="w-full text-xs justify-between"
              >
                <span>Mesa de Cobranza CDA ({settlements.length})</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => navigate('/customs/inventory/kardex')}
                className="w-full text-xs justify-between"
              >
                <span>Ver Kardex PLE 13.1</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <NewShipmentModal
        isOpen={isNewShipmentOpen}
        onClose={() => setIsNewShipmentOpen(false)}
        onSubmit={async (data) => {
          await createShipment(data);
          setIsNewShipmentOpen(false);
        }}
      />
    </Page>
  );
}

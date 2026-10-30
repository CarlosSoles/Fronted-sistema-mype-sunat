import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader, Button, Card, Badge } from '@/components/ui';
import {
  CustomsSubNav,
  CustomsKpiGrid,
  ComplianceTrafficLight,
  NewShipmentModal,
  QuickTariffCalculatorModal,
} from '../components';
import { useShipments } from '../hooks/useShipments';
import { useCustomsSettlements } from '../hooks/useCustomsSettlements';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { PlusCircle, FileText, ArrowRight, ShieldCheck, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { type CustomsShipmentSummary } from '../types';

export default function CustomsDashboardPage() {
  const navigate = useNavigate();
  const { isReadOnly } = useRolePermissions();
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const { shipments, createShipment } = useShipments();
  const { settlements } = useCustomsSettlements();

  const activeShipmentsList: CustomsShipmentSummary[] = shipments.length > 0 ? shipments : [
    {
      id: 'EXP-2026-00042',
      company_id: 'demo-company',
      shipment_number: 'EXP-2026-00042',
      supplier_id: 'SUP-001',
      supplier_name: 'Shenzhen Tech Ltd (China)',
      incoterm: 'FOB',
      currency_code: 'USD',
      status: 'EN_TRANSITO',
      eta_date: '2026-10-31',
      transport_mode: 'MARITIMO',
      origin_country_code: 'CN',
      destination_customs: '118',
      is_observed: false,
      created_at: '2026-10-20T10:00:00Z',
      updated_at: '2026-10-20T10:00:00Z',
    },
  ];

  const pendingSettlementsCount = settlements.length > 0 ? settlements.length : 2;
  const totalCifUsd = 51500;

  return (
    <Page>
      <CustomsSubNav />

      <PageHeader
        title="Panel General de Importaciones"
        description="Monitoreo de expedientes comerciales, levante aduanero, liquidación de tributos y recepción física."
      >
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCalculatorOpen(true)}
            className="gap-1.5 text-xs text-primary"
          >
            <Calculator className="h-3.5 w-3.5" />
            Simulador Arancelario
          </Button>

          {!isReadOnly && (
            <Button size="sm" onClick={() => setIsNewShipmentOpen(true)} className="gap-1.5 text-xs">
              <PlusCircle className="h-3.5 w-3.5" />
              Aperturar Expediente
            </Button>
          )}

          <Button size="sm" variant="default" onClick={() => navigate('/customs/declarations')} className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            DAM y Valoración
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-4">
        {/* Grilla de Métricas Financieras y Canales SUNAT */}
        <CustomsKpiGrid
          shipments={activeShipmentsList}
          pendingSettlementsCount={pendingSettlementsCount}
          totalCifUsd={totalCifUsd}
          exchangeRate={3.82}
        />

        {/* Semáforo de Plazos Críticos SUNAT */}
        <ComplianceTrafficLight />

        {/* Panel bivariado: Expedientes Recientes y Despacho en Curso */}
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

            <div className="divide-y divide-border">
              {activeShipmentsList.slice(0, 4).map((s) => (
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
                      Proveedor: {s.supplier_name} · ETA: {s.eta_date || '2026-10-31'}
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
          </Card>

          {/* Columna Derecha: Tarjeta de Despacho Aduanero en Curso */}
          <Card className="p-4 flex flex-col justify-between bg-primary/5 border-primary/20">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase mb-2">
                <ShieldCheck className="h-4 w-4" />
                Despacho Aduanero en Curso
              </div>
              <p className="text-xs text-foreground/90 font-medium">
                Expediente EXP-2026-00042 · 100 Laptops Gaming (China)
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-1 mt-2">
                <li>• Proveedor: Shenzhen Tech Ltd · FOB: USD 50,000</li>
                <li>• Flete: USD 1,200 · Seguro TPPS: USD 375 (0.75%)</li>
                <li>• Modalidad: Despacho Anticipado 01 · Canal Verde</li>
                <li>• Liquidaciones: Cuotas 0010 y 0026 con CDA oficial</li>
                <li>• Costo final nacionalizado NIC 2: S/ 2,078.925 / unid.</li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/customs/settlements')}
                className="w-full text-xs justify-between"
              >
                <span>Mesa de Cobranza CDA ({pendingSettlementsCount})</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => navigate('/inventory/kardex')}
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

      <QuickTariffCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </Page>
  );
}

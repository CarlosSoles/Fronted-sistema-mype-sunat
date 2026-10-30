import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Page, Button } from '@/components/ui';
import {
  CustomsSubNav,
  ShipmentHeaderCard,
  ChecklistSunat,
  VuceDocumentList,
  AddDocumentModal,
  CustomsTimelineWidget,
  AddEventModal,
  GoodsReceiptModal,
} from '../components';
import { useShipmentDetail } from '../hooks/useShipmentDetail';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { ArrowLeft, FileText, Calculator, RefreshCw, PackageCheck } from 'lucide-react';

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isReadOnly } = useRolePermissions();

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const {
    shipment,
    isLoading,
    refetch,
    addDocument,
    addEvent,
  } = useShipmentDetail(id || 'demo');

  if (isLoading || !shipment) {
    return (
      <Page>
        <CustomsSubNav />
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span>Cargando expediente aduanero 360°...</span>
        </div>
      </Page>
    );
  }

  const primaryDeclaration = shipment.declarations?.[0] as any;
  const itemsForReceipt = ((primaryDeclaration?.items || primaryDeclaration?.series || []) as any[]).map((it: any) => ({
    id: it.id,
    productCode: it.product_code || it.hs_code || 'PROD',
    commercialDescription: it.commercial_description || 'Mercancía importada',
    quantity: Number(it.physical_quantity || it.quantity || 1),
    unitCode: it.physical_unit || it.unit_code || 'NIU',
    destinationType: it.destination_type || 'MERCADERIA',
  }));

  return (
    <Page>
      <CustomsSubNav />

      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/customs/shipments')}
          className="text-xs gap-1.5 pl-0 hover:pl-1 transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Expedientes
        </Button>

        <div className="flex gap-2">
          {!isReadOnly && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/customs/declarations/new?shipmentId=${shipment.id}`)}
                className="text-xs gap-1.5 h-8"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                Registrar DAM
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsReceiptModalOpen(true)}
                className="text-xs gap-1.5 h-8"
              >
                <PackageCheck className="h-3.5 w-3.5 text-blue-500" />
                Recepción Rampa
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/customs/shipments/${shipment.id}/landed-cost`)}
                className="text-xs gap-1.5 h-8"
              >
                <Calculator className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Hoja Landed Cost (NIC 2)
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            className="h-8 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Cabecera Técnica del Expediente */}
        <ShipmentHeaderCard shipment={shipment} />

        {/* Contenedor bivariado: Documentación SUNAT/VUCE vs. Bitácora de Trazabilidad */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Columna Izquierda (7/12): Checklist Comercial y Repositorio VUCE */}
          <div className="lg:col-span-7 space-y-4">
            <ChecklistSunat />
            <VuceDocumentList
              documents={shipment.documents || []}
              onOpenAddModal={() => setIsDocModalOpen(true)}
            />
          </div>

          {/* Columna Derecha (5/12): Cronología y Trazabilidad de Hitos */}
          <div className="lg:col-span-5">
            <CustomsTimelineWidget
              events={shipment.events || []}
              onOpenAddEvent={() => setIsEventModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Modales Atómicos */}
      <AddDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onSubmit={async (doc) => {
          await addDocument(doc);
          setIsDocModalOpen(false);
        }}
      />

      <AddEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSubmit={async (event) => {
          await addEvent(event);
          setIsEventModalOpen(false);
        }}
      />

      <GoodsReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        declarationId={primaryDeclaration?.id || shipment.id}
        shipmentId={shipment.id}
        initialItems={itemsForReceipt}
        onSuccess={() => refetch()}
      />
    </Page>
  );
}

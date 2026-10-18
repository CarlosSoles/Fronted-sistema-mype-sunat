import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader, Button, FilterBar, FilterSearch } from '@/components/ui';
import {
  CustomsSubNav,
  ShipmentKanban,
  ShipmentsDataTable,
  NewShipmentModal,
} from '../components';
import { useShipments } from '../hooks/useShipments';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { PlusCircle, LayoutGrid, Table as TableIcon, RefreshCw } from 'lucide-react';

export default function ShipmentsListPage() {
  const navigate = useNavigate();
  const { isReadOnly } = useRolePermissions();
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    shipments,
    isLoading,
    refetch,
    createShipment,
  } = useShipments();

  const filteredShipments = shipments.filter(
    (s) =>
      s.shipment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectShipment = (id: string) => {
    navigate(`/customs/shipments/${id}`);
  };

  return (
    <Page>
      <CustomsSubNav />

      <PageHeader
        title="Bandeja de Expedientes de Importación"
        description="Supervisión de embarques internacionales, tracking aduanero y control documental."
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="h-8 text-xs gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>

          <div className="flex border rounded-md p-0.5 bg-muted/40">
            <Button
              size="sm"
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              onClick={() => setViewMode('kanban')}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <LayoutGrid className="h-3 w-3" />
              Kanban
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              onClick={() => setViewMode('table')}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <TableIcon className="h-3 w-3" />
              Tabla
            </Button>
          </div>

          {!isReadOnly && (
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="h-8 text-xs gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Aperturar Expediente
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="space-y-4">
        <FilterBar>
          <FilterSearch
            placeholder="Buscar por expediente, proveedor o DAM..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-sm"
          />
        </FilterBar>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
            Cargando expedientes aduaneros...
          </div>
        ) : viewMode === 'kanban' ? (
          <ShipmentKanban
            shipments={filteredShipments}
            onSelectShipment={handleSelectShipment}
          />
        ) : (
          <ShipmentsDataTable
            shipments={filteredShipments}
            onViewDetail={handleSelectShipment}
            onOpenWizard={(id) => navigate(`/customs/declarations/new?shipmentId=${id}`)}
          />
        )}
      </div>

      <NewShipmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          await createShipment(data);
          setIsModalOpen(false);
        }}
      />
    </Page>
  );
}

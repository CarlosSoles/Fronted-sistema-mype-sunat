import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Input,
} from '@/components/ui';
import {
  useImportQuotations,
  useImportQuotationDetail,
} from '../hooks/useImportQuotations';
import { NewQuotationModal } from '../components/NewQuotationModal';
import { AddProformaModal } from '../components/AddProformaModal';
import { QuotationComparisonMatrix } from '../components/QuotationComparisonMatrix';
import {
  FileQuestion,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Trophy,
  ArrowRight,
  Layers,
  ArrowUpRight,
  ArrowLeft,
} from 'lucide-react';

export default function ImportQuotationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedQuotationId = searchParams.get('id');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modales
  const [isNewQuotationOpen, setIsNewQuotationOpen] = useState(false);
  const [isAddProformaOpen, setIsAddProformaOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useImportQuotations({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: searchTerm.trim() || undefined,
  });

  const selectedQuotationQuery = useImportQuotationDetail(selectedQuotationId);

  const quotations = data?.items || [];

  // Métricas
  const activeCount = quotations.filter((q) => q.status === 'EN_NEGOCIACION').length;
  const awardedCount = quotations.filter((q) => q.status === 'ADJUDICADA').length;
  const totalProformas = quotations.reduce((acc, q) => acc + (q.proformasCount || 0), 0);

  const handleSelectQuotation = (id: string) => {
    setSearchParams({ id });
  };

  const handleBackToList = () => {
    setSearchParams({});
  };

  return (
    <Page>
      <PageHeader
        title="1. Mesa de Cotizaciones y Negociación Internacional"
        description="Etapa previa a la compra: prospección de proveedores, comparación de proformas, evaluación de Incoterms y selección de la mejor alternativa."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
              if (selectedQuotationId) void selectedQuotationQuery.refetch();
            }}
            disabled={isFetching}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewQuotationOpen(true)}
            className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Nueva Negociación (RFQ)
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-4">
        {/* Métricas Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <Card className="bg-card shadow-xs">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground font-medium text-[11px]">Negociaciones Abiertas</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{activeCount}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Evaluando ofertas de proveedores</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileQuestion className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-xs">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground font-medium text-[11px]">Ofertas Recibidas</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{totalProformas}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Fábricas y comercializadoras</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Building2 className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-xs">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground font-medium text-[11px]">Adjudicadas (Órdenes)</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">{awardedCount}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Listas para el Módulo de Compras</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Trophy className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-xs">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground font-medium text-[11px]">Siguiente Paso</p>
                <p className="text-xs font-bold text-foreground mt-1">2. Órdenes de Compra</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate('/customs/orders')}
                  className="p-0 h-auto text-[11px] text-primary gap-1 font-semibold"
                >
                  Ver Órdenes Emitidas <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Layers className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Si hay una cotización seleccionada, mostramos la matriz comparativa */}
        {selectedQuotationId && selectedQuotationQuery.data ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToList}
                className="text-xs font-semibold gap-1.5 text-foreground hover:bg-muted"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Volver al listado de negociaciones
              </Button>

              <span className="text-xs font-semibold text-muted-foreground">
                Cuadro Comparativo Multicriterio de Cotizaciones
              </span>
            </div>

            <QuotationComparisonMatrix
              quotation={selectedQuotationQuery.data}
              onOpenAddProforma={() => setIsAddProformaOpen(true)}
              onOrderCreated={(_orderId) => {
                navigate('/customs/orders');
              }}
            />
          </div>
        ) : (
          /* Lista de Negociaciones / Solicitudes de Cotización */
          <Card className="border shadow-xs">
            <CardHeader className="p-3.5 pb-2 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por código o título..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
                  >
                    <option value="ALL">Todos los Estados</option>
                    <option value="EN_NEGOCIACION">En Negociación</option>
                    <option value="ADJUDICADA">Adjudicadas</option>
                    <option value="CANCELADA">Canceladas</option>
                  </select>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  Mostrando <b>{quotations.length}</b> requerimientos
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="p-3">Código RFQ</th>
                      <th className="p-3">Requerimiento / Título</th>
                      <th className="p-3">Incoterm Obj.</th>
                      <th className="p-3 text-center">Proveedores Cotizando</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3">Fecha Inicio</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Cargando negociaciones de importación...
                        </td>
                      </tr>
                    ) : quotations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No se encontraron solicitudes de cotización con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      quotations.map((q) => (
                        <tr
                          key={q.id}
                          onClick={() => handleSelectQuotation(q.id)}
                          className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <td className="p-3 font-mono font-bold text-primary">
                            {q.quotationNumber}
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            {q.title}
                            {q.order && (
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                Orden vinculada: <b>{q.order.orderNumber}</b>
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {q.targetIncoterm || 'FOB'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={q.proformasCount >= 3 ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {q.proformasCount} {q.proformasCount === 1 ? 'proveedor' : 'proveedores'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={
                                q.status === 'ADJUDICADA'
                                  ? 'default'
                                  : q.status === 'CANCELADA'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-[10px]"
                            >
                              {q.status === 'ADJUDICADA'
                                ? 'Adjudicada'
                                : q.status === 'CANCELADA'
                                ? 'Cancelada'
                                : 'En Negociación'}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-[11px]">
                            {new Date(q.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectQuotation(q.id);
                              }}
                              className="h-7 text-xs gap-1 font-semibold"
                            >
                              Comparar Ofertas <ArrowUpRight className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Nueva Cotización */}
      <NewQuotationModal
        isOpen={isNewQuotationOpen}
        onClose={() => setIsNewQuotationOpen(false)}
        onCreated={(newId) => handleSelectQuotation(newId)}
      />

      {/* Modal Añadir Proforma */}
      {selectedQuotationId && (
        <AddProformaModal
          quotationId={selectedQuotationId}
          quotationItems={selectedQuotationQuery.data?.items}
          isOpen={isAddProformaOpen}
          onClose={() => setIsAddProformaOpen(false)}
          onSuccess={() => {
            void refetch();
            void selectedQuotationQuery.refetch();
          }}
        />
      )}
    </Page>
  );
}

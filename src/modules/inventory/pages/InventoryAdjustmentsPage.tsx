import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Page,
  PageHeader,
  Button,
  Badge,
  Card,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui';
import {
  ClipboardCheck,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Eye,
  Download,
  Search,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import {
  inventoryLedgerApi,
  type InventoryAdjustmentRecord,
  type AdjustmentItemRecord,
} from '../services/inventoryLedgerApi';
import { inventoryApi } from '../services/inventoryApi';
import { useAuth } from '@/hooks/useAuth';
import { type InventoryBalance } from '../types/inventory.types';

function ProductPredictiveInput({
  value,
  onSelect,
  balances,
}: {
  value: string;
  onSelect: (balance: InventoryBalance) => void;
  balances: InventoryBalance[];
}) {
  const [search, setSearch] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = search.trim()
    ? balances.filter(
        (b) =>
          b.sku.toLowerCase().includes(search.toLowerCase()) ||
          b.description.toLowerCase().includes(search.toLowerCase()) ||
          (b.brand && b.brand.toLowerCase().includes(search.toLowerCase()))
      )
    : balances;

  return (
    <div className="relative">
      <div className="relative">
        <Input
          placeholder="🔍 Escriba SKU o nombre del producto..."
          value={search}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          className="h-8 text-xs font-mono font-semibold pl-2 pr-7"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setIsOpen(true);
            }}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg text-xs"
          onMouseLeave={() => setIsOpen(false)}
        >
          {filtered.slice(0, 10).map((b) => (
            <button
              key={b.sku}
              type="button"
              onClick={() => {
                setSearch(b.sku);
                setIsOpen(false);
                onSelect(b);
              }}
              className="w-full text-left p-1.5 rounded hover:bg-accent flex items-center justify-between gap-2 border-b last:border-b-0 transition-colors"
            >
              <div>
                <span className="font-mono font-bold text-primary">{b.sku}</span>
                <p className="font-medium text-foreground text-[11px] truncate max-w-[280px]">
                  {b.description}
                </p>
              </div>
              <div className="text-right whitespace-nowrap">
                <span className="text-[10px] text-muted-foreground block">Stock:</span>
                <Badge variant="outline" className="font-mono text-[10px] py-0 px-1 bg-background font-bold text-primary">
                  {b.currentStock} {b.sunatUnitCode || 'NIU'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

const apiError = (error: unknown): string => {
  const err = error as { response?: { data?: { message?: unknown } }; message?: string };
  const message = err.response?.data?.message;
  if (Array.isArray(message)) return message.join(' · ');
  if (typeof message === 'string') return message;
  return err.message || 'No se pudo registrar el ajuste.';
};

const COMMON_REASONS = [
  'Diferencia por conteo físico periódico (Toma física)',
  'Merma normal de almacenamiento / manipuleo (Art. 37 LIR)',
  'Desmedro por vencimiento o deterioro (Destrucción notarial)',
  'Sobrante justificado de inventario físico',
  'Error de digitación en guía o comprobante anterior',
];

export default function InventoryAdjustmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<InventoryAdjustmentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ENTRADA' | 'SALIDA'>('ALL');

  const defaultUserResponsible = user?.fullName
    ? `${user.fullName} (${user.role || 'OPERADOR'})`
    : '';

  const [form, setForm] = useState({
    warehouseCode: 'ALM-01',
    type: 'ENTRADA' as 'ENTRADA' | 'SALIDA',
    reason: '',
    adjustmentDate: today(),
    responsible: defaultUserResponsible,
    notes: '',
  });
  const [items, setItems] = useState([{ sku: '', quantity: 1, unitCost: 0 }]);

  const adjustments = useQuery({
    queryKey: ['inventory', 'adjustments'],
    queryFn: inventoryLedgerApi.getAdjustments,
  });

  const warehouses = useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: inventoryLedgerApi.getWarehouses,
  });

  const stocks = useQuery({
    queryKey: ['inventory', 'stocks'],
    queryFn: inventoryApi.getStockBalances,
  });

  const responsiblesQuery = useQuery({
    queryKey: ['inventory', 'responsibles'],
    queryFn: inventoryApi.getAuthorizedResponsibles,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.responsible.trim()) {
        throw new Error('Debe asignar un responsable autorizado para ejecutar el ajuste físico.');
      }
      return inventoryLedgerApi.createAdjustment({
        ...form,
        items: items
          .filter((i) => i.sku.trim() && i.quantity > 0)
          .map((i) => ({
            sku: i.sku.trim().toUpperCase(),
            quantity: Number(i.quantity),
            unitCost: form.type === 'ENTRADA' ? Number(i.unitCost || 0) : undefined,
          })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] });
      setIsOpen(false);
      setError(null);
      setItems([{ sku: '', quantity: 1, unitCost: 0 }]);
    },
    onError: (e) => setError(apiError(e)),
  });

  const updateItem = (index: number, patch: Partial<{ sku: string; quantity: number; unitCost: number }>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const getAdjustmentTotal = (itemsList: AdjustmentItemRecord[] = []): number => {
    return itemsList.reduce((acc, it) => {
      const diff = Math.abs(Number(it.difference_quantity) || Number(it.counted_quantity) || 0);
      const cost = Number(it.unit_cost) || 0;
      return acc + diff * cost;
    }, 0);
  };

  const getAdjustmentUnits = (itemsList: AdjustmentItemRecord[] = []): number => {
    return itemsList.reduce((acc, it) => {
      return acc + Math.abs(Number(it.difference_quantity) || Number(it.counted_quantity) || 0);
    }, 0);
  };

  const allAdjustments = adjustments.data ?? [];

  const filteredAdjustments = allAdjustments.filter((a) => {
    if (warehouseFilter !== 'ALL' && a.warehouse_code !== warehouseFilter) return false;
    if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    const num = (a.adjustment_number || '').toLowerCase();
    const reason = (a.reason || '').toLowerCase();
    const resp = (a.responsible || '').toLowerCase();
    const hasSku = a.items.some(
      (i) => (i.sku || '').toLowerCase().includes(term) || (i.description || '').toLowerCase().includes(term)
    );
    return num.includes(term) || reason.includes(term) || resp.includes(term) || hasSku;
  });

  // Métricas rápidas
  const totalEntriesValuation = filteredAdjustments
    .filter((a) => a.type === 'ENTRADA')
    .reduce((acc, a) => acc + getAdjustmentTotal(a.items), 0);

  const totalExitsValuation = filteredAdjustments
    .filter((a) => a.type === 'SALIDA')
    .reduce((acc, a) => acc + getAdjustmentTotal(a.items), 0);

  const warehouseList = warehouses.data ?? [
    { warehouse_code: 'ALM-01', description: 'Almacén Principal' },
    { warehouse_code: 'ALM-02', description: 'Almacén Secundario' },
  ];

  const availableWarehouseStock = (stocks.data?.balances ?? []).filter(
    (b) => b.warehouseCode === form.warehouseCode
  );

  const handleExportCsv = () => {
    if (filteredAdjustments.length === 0) {
      alert('No hay ajustes de inventario para exportar.');
      return;
    }
    const headers = [
      'Numero Ajuste',
      'Fecha',
      'Almacen',
      'Tipo Sentido',
      'Motivo',
      'Responsable',
      'Observaciones',
      'SKU',
      'Descripcion',
      'Cantidad Sistema',
      'Cantidad Contada',
      'Diferencia Fisica',
      'Costo Unitario PEN',
      'Total Impacto PEN',
      'Estado',
    ];
    const rows: string[] = [];
    filteredAdjustments.forEach((a) => {
      a.items.forEach((it) => {
        const diff = Math.abs(Number(it.difference_quantity) || Number(it.counted_quantity) || 0);
        const cost = Number(it.unit_cost) || 0;
        const total = diff * cost;
        rows.push([
          `"${a.adjustment_number}"`,
          `"${a.adjustment_date.slice(0, 10)}"`,
          `"${a.warehouse_code}"`,
          `"${a.type === 'ENTRADA' ? 'Sobrante (+)' : 'Faltante / Merma (-)'}"`,
          `"${(a.reason || '').replace(/"/g, '""')}"`,
          `"${(a.responsible || '').replace(/"/g, '""')}"`,
          `"${(a.notes || '').replace(/"/g, '""')}"`,
          `"${it.sku}"`,
          `"${(it.description || '').replace(/"/g, '""')}"`,
          it.system_quantity,
          it.counted_quantity,
          it.difference_quantity,
          cost.toFixed(4),
          total.toFixed(2),
          `"${a.status}"`,
        ].join(','));
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ajustes_toma_fisica_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Page>
      <PageHeader
        title="Ajustes y toma física"
        description="Correcciones de inventario físico por merma, desmedro, error de conteo o sobrante justificado (Art. 37 LIR / Op. 28 SUNAT)."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="gap-1.5"
          title="Descargar historial de ajustes en CSV"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => adjustments.refetch()}
          disabled={adjustments.isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${adjustments.isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setError(null);
            setForm((prev) => ({
              ...prev,
              responsible: prev.responsible || defaultUserResponsible,
            }));
            setIsOpen(true);
          }}
          className="gap-1.5 font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo ajuste
        </Button>
      </PageHeader>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total Ajustes Registrados</p>
            <p className="text-2xl font-bold mt-1">{filteredAdjustments.length}</p>
          </div>
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Sobrantes Físicos (+)</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 font-mono">
              +S/ {totalEntriesValuation.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Faltantes / Mermas (-)</p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400 font-mono">
              -S/ {totalExitsValuation.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-full bg-amber-500/10 text-amber-600">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card/60 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por N° ajuste, SKU, motivo o responsable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase">Tipo:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'ENTRADA' | 'SALIDA')}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="ENTRADA">Sobrante (Entrada)</option>
              <option value="SALIDA">Faltante / Merma (Salida)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground font-semibold uppercase">Almacén:</label>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">Todos</option>
              {warehouseList.map((w) => (
                <option key={w.warehouse_code} value={w.warehouse_code}>
                  {w.warehouse_code}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || warehouseFilter !== 'ALL' || typeFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchTerm('');
                setWarehouseFilter('ALL');
                setTypeFilter('ALL');
              }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px]">
            <tr>
              <th className="p-3">Número</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Almacén</th>
              <th className="p-3">Tipo Sentido</th>
              <th className="p-3">Motivo del Ajuste</th>
              <th className="p-3">Ítems Ajustados</th>
              <th className="p-3 text-right">Impacto Valuado (PEN)</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.isLoading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  Cargando ajustes de inventario...
                </td>
              </tr>
            ) : filteredAdjustments.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  No hay ajustes registrados con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredAdjustments.map((a) => {
                const totalVal = getAdjustmentTotal(a.items);
                const totalUnits = getAdjustmentUnits(a.items);
                const firstSku = a.items[0]?.sku;
                const isEntry = a.type === 'ENTRADA';

                return (
                  <tr key={a.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{a.adjustment_number}</td>
                    <td className="p-3 font-mono">
                      {new Date(a.adjustment_date).toLocaleDateString('es-PE')}
                    </td>
                    <td className="p-3 font-semibold text-foreground">{a.warehouse_code}</td>
                    <td className="p-3">
                      {isEntry ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[10px] font-semibold">
                          <ArrowDownLeft className="h-3 w-3" /> Sobrante (+)
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 text-[10px] font-semibold">
                          <ArrowUpRight className="h-3 w-3" /> Faltante / Merma (-)
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 max-w-[220px]">
                      <p className="font-medium text-foreground truncate" title={a.reason}>
                        {a.reason}
                      </p>
                      {a.notes && (
                        <p className="text-[10px] text-muted-foreground truncate" title={a.notes}>
                          {a.notes}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="font-mono text-[10px] bg-muted/40">
                          {a.items.length} producto(s)
                        </Badge>
                        <span className="text-muted-foreground text-[11px]">
                          ({totalUnits.toLocaleString('es-PE', { minimumFractionDigits: 2 })} und.)
                        </span>
                        {firstSku && (
                          <span className="text-[10px] text-muted-foreground">
                            • {firstSku}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {isEntry ? '+' : '-'}S/ {totalVal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={a.status === 'APLICADO' ? 'default' : 'secondary'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAdjustment(a)}
                        className="h-7 text-xs gap-1 text-primary hover:text-primary"
                        title="Ver detalle del conteo y diferencia valorizada"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver Detalle
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal Ver Detalle de Ajuste / Acta de Conteo */}
      {selectedAdjustment && (
        <Dialog open={!!selectedAdjustment} onOpenChange={(open) => !open && setSelectedAdjustment(null)}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Acta de Ajuste Físico {selectedAdjustment.adjustment_number}
                </DialogTitle>
                <Badge variant={selectedAdjustment.status === 'APLICADO' ? 'default' : 'secondary'}>
                  {selectedAdjustment.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Resumen Cabecera */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-muted/40 border">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Fecha:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(selectedAdjustment.adjustment_date).toLocaleDateString('es-PE')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Almacén:</span>
                  <span className="font-bold text-primary">{selectedAdjustment.warehouse_code}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Sentido:</span>
                  <span className={`font-bold ${selectedAdjustment.type === 'ENTRADA' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedAdjustment.type === 'ENTRADA' ? 'Sobrante (+)' : 'Faltante / Merma (-)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Responsable:</span>
                  <span className="font-medium text-foreground">{selectedAdjustment.responsible || '—'}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-card space-y-1">
                <span className="font-semibold text-muted-foreground uppercase text-[10px] block">
                  Motivo y Justificación Tributaria:
                </span>
                <p className="font-medium text-foreground">{selectedAdjustment.reason}</p>
                {selectedAdjustment.notes && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    <span className="font-semibold">Notas / Informe técnico:</span> {selectedAdjustment.notes}
                  </p>
                )}
              </div>

              {/* Tabla de Productos del Ajuste */}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Código SKU</th>
                      <th className="p-2.5">Descripción</th>
                      <th className="p-2.5 text-right">Cant. Sistema</th>
                      <th className="p-2.5 text-right">Cant. Contada</th>
                      <th className="p-2.5 text-right">Diferencia</th>
                      <th className="p-2.5 text-right">Costo Unit. (PEN)</th>
                      <th className="p-2.5 text-right">Impacto Total (PEN)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAdjustment.items.map((it) => {
                      const diff = Math.abs(Number(it.difference_quantity) || Number(it.counted_quantity) || 0);
                      const cost = Number(it.unit_cost) || 0;
                      const total = diff * cost;
                      const isEntry = selectedAdjustment.type === 'ENTRADA';

                      return (
                        <tr key={it.id || it.sku} className="border-t">
                          <td className="p-2.5 font-mono font-bold text-primary">{it.sku}</td>
                          <td className="p-2.5 font-medium text-foreground">{it.description || '—'}</td>
                          <td className="p-2.5 text-right font-mono text-muted-foreground">
                            {Number(it.system_quantity || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            {Number(it.counted_quantity || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`p-2.5 text-right font-mono font-bold ${isEntry ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {isEntry ? '+' : '-'}{diff.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            S/ {cost.toLocaleString('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </td>
                          <td className={`p-2.5 text-right font-mono font-bold ${isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {isEntry ? '+' : '-'}S/ {total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t bg-muted/40 font-bold">
                    <tr>
                      <td colSpan={6} className="p-2.5 text-right uppercase text-[10px] text-muted-foreground">
                        Impacto Total Valuado en Libros:
                      </td>
                      <td className="p-2.5 text-right font-mono text-sm text-foreground">
                        {selectedAdjustment.type === 'ENTRADA' ? '+' : '-'}S/ {getAdjustmentTotal(selectedAdjustment.items).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs w-full sm:w-auto"
              >
                <Printer className="h-4 w-4" />
                Imprimir Acta de Conteo
              </Button>
              <Button size="sm" onClick={() => setSelectedAdjustment(null)} className="w-full sm:w-auto">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Nuevo Ajuste */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Nuevo ajuste de inventario / Toma física
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* SECCIÓN 1: IDENTIFICACIÓN Y UBICACIÓN DEL CONTEO (Obs 20) */}
          <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
            <h3 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">
                1
              </span>
              Identificación y Parámetros del Conteo Físico
            </h3>
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 pt-1">
              <div>
                <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Almacén del Conteo *</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                  value={form.warehouseCode}
                  onChange={(e) => setForm({ ...form, warehouseCode: e.target.value })}
                >
                  {warehouseList.map((w) => (
                    <option key={w.warehouse_code} value={w.warehouse_code}>
                      {w.warehouse_code} — {w.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Sentido de Regularización *</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'ENTRADA' | 'SALIDA' })}
                >
                  <option value="ENTRADA">🟢 ENTRADA (Sobrante físico detectado en conteo)</option>
                  <option value="SALIDA">🔴 SALIDA (Faltante / Merma / Desmedro / Muestra)</option>
                </select>
              </div>

              <div>
                <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Fecha de Toma Física *</p>
                <Input
                  type="date"
                  value={form.adjustmentDate}
                  onChange={(e) => setForm({ ...form, adjustmentDate: e.target.value })}
                />
              </div>

              <div>
                <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Responsable Autorizado * (Obs 20)</p>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                  value={form.responsible}
                  onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                >
                  <option value="">(Seleccione operador autorizado)</option>
                  {defaultUserResponsible && (
                    <option value={defaultUserResponsible}>
                      ⭐ Mi Usuario: {defaultUserResponsible}
                    </option>
                  )}
                  {(responsiblesQuery.data?.users ?? [])
                    .filter((u) => `${u.name} (${u.role})` !== defaultUserResponsible)
                    .map((u) => (
                      <option key={u.id} value={`${u.name} (${u.role})`}>
                        👤 {u.name} — Rol: {u.role}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: JUSTIFICACIÓN TRIBUTARIA Y LEGAL */}
          <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
            <h3 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">
                2
              </span>
              Justificación Tributaria y Documentación Legal (SUNAT / NIC 2)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Motivo del Ajuste *</p>
                <Input
                  placeholder="Seleccione o ingrese el motivo del ajuste..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  list="common-reasons"
                />
                <datalist id="common-reasons">
                  {COMMON_REASONS.map((r, i) => (
                    <option key={i} value={r} />
                  ))}
                </datalist>
              </div>
              <div>
                <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">
                  N° de Acta de Conteo / Informe Técnico Notarial
                </p>
                <Input
                  placeholder="ej: Acta Notarial N° 045-2026 / Informe Mermas Art. 37"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: DETALLE DE ÍTEMS CON BÚSQUEDA PREDICTIVA Y STOCK RESALTADO */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">
                  3
                </span>
                Conteo Físico Real vs Stock en Libros (Kardex)
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setItems([...items, { sku: '', quantity: 1, unitCost: 0 }])}
                className="h-7 text-xs gap-1 font-medium border-primary/30 text-primary hover:bg-primary/5"
              >
                <Plus className="h-3 w-3" /> Agregar producto
              </Button>
            </div>

            {items.map((item, index) => {
              const matchedBalance = availableWarehouseStock.find(
                (b) => b.sku.toLowerCase() === item.sku.toLowerCase()
              );

              return (
                <div key={index} className="space-y-2 p-3 rounded-md border bg-background shadow-2xs">
                  {/* Búsqueda predictiva de producto (Obs 20) */}
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                      Buscar y Seleccionar Producto (Escribir SKU o Descripción) *
                    </label>
                    <ProductPredictiveInput
                      value={item.sku}
                      balances={availableWarehouseStock}
                      onSelect={(bal) => {
                        updateItem(index, {
                          sku: bal.sku,
                          unitCost: bal.averageUnitCost,
                        });
                      }}
                    />
                  </div>

                  {/* Fila de Comparación: Stock Sistema Resaltado vs Conteo y Costo Bloqueado */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end pt-1">
                    {/* Stock Actual Resaltado (Obs 20: Moverlo a un lugar destacado) */}
                    <div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200">
                      <span className="text-[9px] uppercase font-bold tracking-wider block text-blue-700 dark:text-blue-300">
                        📦 Stock en Libros ({form.warehouseCode})
                      </span>
                      <p className="text-sm font-mono font-extrabold mt-0.5">
                        {matchedBalance ? matchedBalance.currentStock : 0} {matchedBalance?.sunatUnitCode || 'NIU'}
                      </p>
                    </div>

                    {/* Cantidad a Regularizar */}
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                        Cantidad a Regularizar *
                      </label>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        placeholder="Cantidad"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                        className="h-8 text-xs font-bold font-mono"
                      />
                    </div>

                    {/* Costo Unitario Bloqueado / No Editable (Obs 20) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                          Costo Unit. (Kardex)
                        </label>
                        <span className="text-[9px] text-muted-foreground italic">(Bloqueado)</span>
                      </div>
                      <div
                        className="h-8 px-2 flex items-center bg-muted/60 rounded-md border text-xs font-mono text-muted-foreground cursor-not-allowed select-none"
                        title="El costo lo determina el Kardex mediante Promedio Ponderado Móvil (NIC 2 / Art. 35 LIR). No editable."
                      >
                        S/ {Number(matchedBalance ? matchedBalance.averageUnitCost : (item.unitCost || 0)).toFixed(4)}
                      </div>
                    </div>

                    {/* Impacto Total y Eliminar */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-right flex-1">
                        <span className="text-[9px] uppercase text-muted-foreground block font-semibold">Impacto Valuado:</span>
                        <span className={`text-xs font-mono font-bold ${form.type === 'ENTRADA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {form.type === 'ENTRADA' ? '+' : '-'}S/ {(item.quantity * Number(matchedBalance ? matchedBalance.averageUnitCost : (item.unitCost || 0))).toFixed(2)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={items.length === 1}
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Quitar este ítem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !form.reason.trim() ||
                !form.responsible.trim() ||
                items.every((i) => !i.sku.trim())
              }
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {createMutation.isPending ? 'Aplicando ajuste...' : 'Aplicar ajuste contable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

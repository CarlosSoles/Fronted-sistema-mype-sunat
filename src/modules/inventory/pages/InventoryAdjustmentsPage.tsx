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
          (b.barcode && b.barcode.toLowerCase().includes(search.toLowerCase())) ||
          (b.brand && b.brand.toLowerCase().includes(search.toLowerCase()))
      )
    : balances;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = search.trim().toLowerCase();
      const exact =
        balances.find(
          (b) =>
            (b.barcode && b.barcode.toLowerCase() === query) ||
            b.sku.toLowerCase() === query
        ) || filtered[0];

      if (exact) {
        setSearch(exact.sku);
        setIsOpen(false);
        onSelect(exact);
      }
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          placeholder="🔍 Pistolear código de barras, escribir SKU o nombre del producto (Presione Enter)..."
          value={search}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono font-bold text-primary">{b.sku}</span>
                  {b.barcode && (
                    <Badge variant="secondary" className="font-mono text-[9px] py-0 px-1 border">
                      📷 Barcode: {b.barcode}
                    </Badge>
                  )}
                </div>
                <p className="font-medium text-foreground text-[11px] truncate max-w-[320px]">
                  {b.description}
                </p>
              </div>
              <div className="text-right whitespace-nowrap">
                <span className="text-[10px] text-muted-foreground block">Stock Libros:</span>
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

interface ItemRowState {
  sku: string;
  systemStock: number;
  countedStock: number;
  quantity: number;
  difference: number;
  unitCost: number;
  barcode?: string;
  description?: string;
}

const AUTHORIZED_ROLES = [
  'ADMIN',
  'ADMINISTRADOR',
  'SUPERVISOR',
  'SUPERVISOR_ALMACEN',
  'GERENTE',
  'JEFE_ALMACEN',
  'AUDITOR',
  'CONTADOR',
];

const isAuthorizedRole = (role?: string) => {
  if (!role) return false;
  const upper = role.toUpperCase();
  return AUTHORIZED_ROLES.some((r) => upper.includes(r));
};

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

  const userIsAuthorized = isAuthorizedRole(user?.role);
  const defaultUserResponsible = userIsAuthorized && user?.fullName
    ? `${user.fullName} (${user.role || 'ADMIN'})`
    : '';

  const [form, setForm] = useState({
    warehouseCode: 'ALM-01',
    type: 'ENTRADA' as 'ENTRADA' | 'SALIDA',
    reason: '',
    adjustmentDate: today(),
    responsible: defaultUserResponsible,
    notes: '',
  });

  const [items, setItems] = useState<ItemRowState[]>([
    {
      sku: '',
      systemStock: 0,
      countedStock: 0,
      quantity: 0,
      difference: 0,
      unitCost: 0,
    },
  ]);

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

  const authorizedResponsibles = (responsiblesQuery.data?.users ?? []).filter((u) =>
    isAuthorizedRole(u.role)
  );

  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.responsible.trim()) {
        throw new Error('Debe asignar un responsable con autorización (ADMIN, SUPERVISOR o GERENCIA) para ejecutar el ajuste físico.');
      }

      const itemsWithDifference = items.filter(
        (i) => i.sku.trim() && Math.abs(i.difference) > 0
      );

      if (itemsWithDifference.length === 0) {
        throw new Error('No se han registrado diferencias físicas entre el conteo real y el stock en libros para regularizar.');
      }

      return inventoryLedgerApi.createAdjustment({
        ...form,
        items: itemsWithDifference.map((i) => ({
          sku: i.sku.trim().toUpperCase(),
          quantity: Math.abs(i.difference),
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
      setItems([
        {
          sku: '',
          systemStock: 0,
          countedStock: 0,
          quantity: 0,
          difference: 0,
          unitCost: 0,
        },
      ]);
    },
    onError: (e) => setError(apiError(e)),
  });

  const updateItem = (index: number, patch: Partial<ItemRowState>) => {
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
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto text-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Nuevo ajuste de inventario / Toma física
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Ajuste auditado por diferencias de conteo físico (Art. 37 LIR / Op. 28 SUNAT). El ajuste genera un movimiento formal en Kardex sin alterar datos históricos en duro.
            </p>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          {/* SECCIÓN 1: IDENTIFICACIÓN Y UBICACIÓN DEL CONTEO */}
          <div className="space-y-2.5 p-3 rounded-lg border bg-muted/20">
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
                  onChange={(e) => {
                    const newWh = e.target.value;
                    setForm({ ...form, warehouseCode: newWh });
                    // Actualizar stocks de libros de los ítems existentes
                    const updatedBalances = (stocks.data?.balances ?? []).filter(
                      (b) => b.warehouseCode === newWh
                    );
                    setItems((prev) =>
                      prev.map((it) => {
                        const bal = updatedBalances.find(
                          (b) => b.sku.toLowerCase() === it.sku.toLowerCase()
                        );
                        const curStock = Number(bal?.currentStock ?? 0);
                        const diff = it.countedStock - curStock;
                        return {
                          ...it,
                          systemStock: curStock,
                          difference: diff,
                          quantity: Math.abs(diff),
                          unitCost: Number(bal?.averageUnitCost ?? it.unitCost),
                        };
                      })
                    );
                  }}
                >
                  {warehouseList.map((w) => (
                    <option key={w.warehouse_code} value={w.warehouse_code}>
                      {w.warehouse_code} — {w.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-1 font-semibold uppercase text-muted-foreground text-[10px]">Sentido de Regularización Predominante *</p>
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
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold uppercase text-muted-foreground text-[10px]">
                    Responsable Autorizado * (Requiere Rol Autorizado)
                  </p>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold text-emerald-600">
                    Solo Admin / Supervisión
                  </Badge>
                </div>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                  value={form.responsible}
                  onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                  required
                >
                  <option value="">-- Seleccione Supervisor / Admin Autorizado --</option>
                  {userIsAuthorized && defaultUserResponsible && (
                    <option value={defaultUserResponsible}>
                      ⭐ Mi Usuario: {defaultUserResponsible} (Autorizado)
                    </option>
                  )}
                  {authorizedResponsibles
                    .filter((u) => `${u.name} (${u.role})` !== defaultUserResponsible)
                    .map((u) => (
                      <option key={u.id} value={`${u.name} (${u.role})`}>
                        🛡️ {u.name} — Rol: {u.role} (Autorizado)
                      </option>
                    ))}
                  {/* Si no hay otros usuarios en lista, garantizar que ADMIN esté seleccionable */}
                  {!userIsAuthorized && authorizedResponsibles.length === 0 && (
                    <option value="Administrador General (ADMIN)">
                      🛡️ Administrador General (ADMIN)
                    </option>
                  )}
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

          {/* SECCIÓN 3: CONTEO FÍSICO REAL VS STOCK EN LIBROS */}
          <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">
                    3
                  </span>
                  Conteo Físico Real vs Stock en Libros (Kardex)
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  El stock en libros del sistema es <b>no editable</b>. Digita el conteo físico real o pistola el código de barra para regularizar mediante movimiento de Kardex.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() =>
                  setItems([
                    ...items,
                    {
                      sku: '',
                      systemStock: 0,
                      countedStock: 0,
                      quantity: 0,
                      difference: 0,
                      unitCost: 0,
                    },
                  ])
                }
                className="h-7 text-xs gap-1 font-semibold border-primary/30 text-primary hover:bg-primary/5 self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar producto
              </Button>
            </div>

            {items.map((item, index) => {
              const matchedBalance = availableWarehouseStock.find(
                (b) => b.sku.toLowerCase() === item.sku.toLowerCase()
              );

              return (
                <div key={index} className="space-y-2.5 p-3 rounded-md border bg-background shadow-2xs">
                  {/* Búsqueda predictiva con escáner de código de barras */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Producto a Comparar (Pistolear Código de Barras, SKU o Nombre) *
                      </label>
                      {item.barcode && (
                        <Badge variant="secondary" className="font-mono text-[9px] py-0 px-1 border">
                          📷 Barcode: {item.barcode}
                        </Badge>
                      )}
                    </div>
                    <ProductPredictiveInput
                      value={item.sku}
                      balances={availableWarehouseStock}
                      onSelect={(bal) => {
                        const curStock = Number(bal.currentStock ?? 0);
                        updateItem(index, {
                          sku: bal.sku,
                          description: bal.description,
                          barcode: bal.barcode || undefined,
                          systemStock: curStock,
                          countedStock: curStock, // Inicia igual al sistema
                          quantity: 0,
                          difference: 0,
                          unitCost: Number(bal.averageUnitCost ?? 0),
                        });
                      }}
                    />
                  </div>

                  {/* Fila de Comparación: Stock en Libros (Bloqueado) vs Conteo Físico Real (Editable) vs Diferencia */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end pt-1">
                    {/* 1. Stock en Libros (Sistema) - NO EDITABLE */}
                    <div className="sm:col-span-3 p-2 rounded-md bg-blue-500/10 border border-blue-500/30">
                      <span className="text-[9px] uppercase font-bold tracking-wider block text-blue-700 dark:text-blue-300">
                        📦 Stock en Libros ({form.warehouseCode})
                      </span>
                      <p className="text-sm font-mono font-extrabold mt-0.5 text-blue-900 dark:text-blue-100">
                        {item.systemStock} {matchedBalance?.sunatUnitCode || 'NIU'}
                      </p>
                      <span className="text-[9px] text-muted-foreground block italic font-medium">
                        (Bloqueado / No editable)
                      </span>
                    </div>

                    {/* 2. Conteo Físico Real - EDITABLE */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] uppercase font-bold text-foreground block mb-1">
                        Conteo Físico Real *
                      </label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={item.countedStock}
                        onChange={(e) => {
                          const counted = parseFloat(e.target.value) || 0;
                          const diff = counted - item.systemStock;
                          updateItem(index, {
                            countedStock: counted,
                            difference: diff,
                            quantity: Math.abs(diff),
                          });
                          // Si hay variación, sincronizar el tipo de ajuste
                          if (diff < 0 && form.type !== 'SALIDA') {
                            setForm((f) => ({ ...f, type: 'SALIDA' }));
                          } else if (diff > 0 && form.type !== 'ENTRADA') {
                            setForm((f) => ({ ...f, type: 'ENTRADA' }));
                          }
                        }}
                        className="h-8 text-xs font-bold font-mono text-right"
                        placeholder="Cantidad contada"
                        required
                      />
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        Físico contado en almacén
                      </span>
                    </div>

                    {/* 3. Diferencia Calculada */}
                    <div className="sm:col-span-3">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                        Diferencia a Regularizar
                      </span>
                      <div
                        className={`h-8 px-2 flex items-center justify-between rounded-md border text-xs font-mono font-bold ${
                          item.difference > 0
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : item.difference < 0
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : 'bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <span>
                          {item.difference > 0 ? `+${item.difference}` : item.difference}{' '}
                          {matchedBalance?.sunatUnitCode || 'NIU'}
                        </span>
                        <span className="text-[10px] font-sans font-semibold">
                          {item.difference > 0 ? 'Sobrante (+)' : item.difference < 0 ? 'Faltante (-)' : 'Conforme'}
                        </span>
                      </div>
                      <span className="text-[9px] text-muted-foreground block mt-0.5 italic">
                        (Cálculo automático)
                      </span>
                    </div>

                    {/* 4. Impacto Valuado */}
                    <div className="sm:col-span-2">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                        Impacto Valuado
                      </span>
                      <div className="h-8 px-2 flex items-center justify-end rounded-md bg-muted/30 border text-xs font-mono font-bold">
                        {item.difference < 0 ? '-' : item.difference > 0 ? '+' : ''}S/{' '}
                        {(item.quantity * Number(matchedBalance?.averageUnitCost ?? item.unitCost ?? 0)).toFixed(2)}
                      </div>
                      <span className="text-[9px] text-muted-foreground block mt-0.5 text-right font-mono">
                        Costo: S/ {Number(matchedBalance?.averageUnitCost ?? item.unitCost ?? 0).toFixed(4)}
                      </span>
                    </div>

                    {/* Eliminar fila */}
                    <div className="sm:col-span-1 flex justify-center items-end pb-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={items.length === 1}
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Quitar este producto"
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
            <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !form.reason.trim() ||
                !form.responsible.trim() ||
                items.every((i) => !i.sku.trim())
              }
              className="gap-1.5 font-semibold"
            >
              <Save className="h-3.5 w-3.5" />
              {createMutation.isPending ? 'Aplicando ajuste...' : 'Aplicar ajuste contable y Kardex'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

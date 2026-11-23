import { formatearReferenciaDocumento, numeroDocumentoSinSerie } from '../lib/documentReference';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../services/inventoryApi';
import { type InventoryMovement } from '../types/inventory.types';
import { ManualMovementModal } from '../components/ManualMovementModal';
import { TransferMovementModal } from '../components/TransferMovementModal';
import { MovementDetailModal } from '../components/MovementDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeftRight,
  RefreshCw,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Search,
  Download,
  Filter,
  Boxes,
  Scale,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const OPERATION_NAMES: Record<string, string> = {
  '01': '01 Venta Nacional',
  '02': '02 Compra Nacional',
  '03': '03 Consignación Recibida',
  '04': '04 Consignación Entregada',
  '05': '05 Devolución Recibida',
  '06': '06 Devolución Entregada',
  '07': '07 Bonificación',
  '08': '08 Reposición por Nota de Débito (Proveedor)',
  '09': '09 Donación',
  '10': '10 Salida a Producción',
  '11': '11 Transferencia entre Almacenes',
  '12': '12 Retiro',
  '13': '13 Mermas',
  '14': '14 Desmedros',
  '15': '15 Destrucción',
  '16': '16 Saldo Inicial',
  '17': '17 Exportación',
  '18': '18 Importación (DAM)',
  '19': '19 Entrada de Producción',
  '21': '21 Transferencia (Entrada)',
  '22': '22 Transferencia (Salida)',
  '28': '28 Ajuste Físico',
  '99': '99 Otros',
};

const DOCUMENT_NAMES: Record<string, string> = {
  '00': 'Nota Interna',
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'Nota Crédito',
  '08': 'Nota Débito',
  '09': 'Guía Remisión',
  '12': 'Ticket',
  '50': 'DAM/DUA',
};

type MovementTab = 'ALL' | 'ENTRADAS' | 'SALIDAS' | 'TRANSFERS' | 'AJUSTES';

const isTransferMovement = (m: InventoryMovement): boolean => {
  return (
    m.operationTypeCode === '11' ||
    m.operationTypeCode === '21' ||
    m.operationTypeCode === '22' ||
    Boolean(m.sourceReferenceId?.startsWith('TRF')) ||
    Boolean(m.notes?.toLowerCase().includes('transferencia'))
  );
};

export default function InventoryMovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<MovementTab>(
    tabParam === 'transfers' ? 'TRANSFERS' : 'ALL'
  );

  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success'>('idle');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovement | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOpType, setSelectedOpType] = useState<string>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');

  // Paginación (15 por página)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadMovements = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryApi.listMovements();
      setMovements(data.items || []);
    } catch (err) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshState('loading');
    await loadMovements();
    setRefreshState('success');
    setTimeout(() => setRefreshState('idle'), 1800);
  };

  useEffect(() => {
    loadMovements();
  }, []);

  useEffect(() => {
    if (tabParam === 'transfers') {
      setActiveTab('TRANSFERS');
    }
  }, [tabParam]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedOpType, selectedDirection, selectedWarehouse, activeTab]);

  const handleTabChange = (tab: MovementTab) => {
    setActiveTab(tab);
    if (tab === 'TRANSFERS') {
      setSearchParams({ tab: 'transfers' });
    } else {
      setSearchParams({});
    }
  };

  const warehouseOptions = Array.from(
    new Set(movements.map((m) => m.warehouseCode).filter((w): w is string => Boolean(w)))
  );

  const filteredMovements = movements.filter((m) => {
    const isTrf = isTransferMovement(m);
    const isAdj = ['28', '13', '14', '15', '12', '16'].includes(m.operationTypeCode);

    if (activeTab === 'ENTRADAS' && (m.direction !== 'ENTRADA' || isTrf)) return false;
    if (activeTab === 'SALIDAS' && (m.direction !== 'SALIDA' || isTrf)) return false;
    if (activeTab === 'TRANSFERS' && !isTrf) return false;
    if (activeTab === 'AJUSTES' && !isAdj) return false;

    if (selectedOpType !== 'ALL' && m.operationTypeCode !== selectedOpType) return false;
    if (selectedDirection !== 'ALL' && m.direction !== selectedDirection) return false;
    if (selectedWarehouse !== 'ALL' && m.warehouseCode !== selectedWarehouse) return false;
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    const sku = (m.sku || '').toLowerCase();
    const desc = (m.description || '').toLowerCase();
    const num = (m.movementNumber || '').toLowerCase();
    const doc = (m.documentNumber || '').toLowerCase();
    const ser = (m.documentSerial || '').toLowerCase();
    const notes = (m.notes || '').toLowerCase();
    const ref = (m.sourceReferenceId || '').toLowerCase();
    return (
      sku.includes(term) ||
      desc.includes(term) ||
      num.includes(term) ||
      doc.includes(term) ||
      ser.includes(term) ||
      notes.includes(term) ||
      ref.includes(term)
    );
  });

  // Cálculo de Paginación
  const totalItems = filteredMovements.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

  const totalEntriesQty = movements
    .filter((m) => m.direction === 'ENTRADA' && !isTransferMovement(m))
    .reduce((acc, m) => acc + m.quantity, 0);

  const totalExitsQty = movements
    .filter((m) => m.direction === 'SALIDA' && !isTransferMovement(m))
    .reduce((acc, m) => acc + m.quantity, 0);

  const totalTransfersMovements = movements.filter(isTransferMovement);
  const totalTransfersUnits = totalTransfersMovements
    .filter((m) => m.direction === 'SALIDA')
    .reduce((acc, m) => acc + m.quantity, 0);

  const handleExportCsv = () => {
    if (filteredMovements.length === 0) {
      alert('No hay movimientos registrados para exportar.');
      return;
    }
    const headers = [
      'Fecha',
      'Almacen',
      'Correlativo',
      'Tipo Operacion SUNAT (T12)',
      'Tipo Comprobante (T10)',
      'Serie Comprobante',
      'Numero Comprobante',
      'Codigo SKU',
      'Descripcion',
      'Sentido',
      'Cantidad',
      'Costo Unitario PEN',
      'Total Costo PEN',
      'Stock Resultante',
      'Referencia / Notas',
    ];
    const rows = filteredMovements.map((m) => [
      new Date(m.movementDate).toLocaleDateString('es-PE'),
      `"${m.warehouseCode || 'ALM-01'}"`,
      `"${m.movementNumber}"`,
      `"${OPERATION_NAMES[m.operationTypeCode] || `Tipo ${m.operationTypeCode}`}"`,
      `"${DOCUMENT_NAMES[m.documentTypeCode || ''] || m.documentTypeCode || ''}"`,
      `"${m.documentSerial || ''}"`,
      `"${numeroDocumentoSinSerie(m.documentSerial, m.documentNumber)}"`,
      `"${m.sku}"`,
      `"${(m.description || '').replace(/"/g, '""')}"`,
      `"${m.direction}"`,
      m.quantity,
      m.unitCost.toFixed(4),
      m.totalCost.toFixed(2),
      m.resultingStock,
      `"${(m.notes || m.sourceReferenceId || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kardex_movimientos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-7 w-7 text-primary" />
            Movimientos y Kardex de Inventario
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Asientos inmutables de entradas, salidas, traslados entre almacenes y ajustes valorizados según Tabla 12 SUNAT.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs font-medium"
            title="Descargar historial de movimientos en CSV"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Exportar CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshState === 'loading'}
            className="gap-1.5 text-xs font-medium transition-all"
            title="Recargar movimientos"
          >
            {refreshState === 'loading' ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Actualizando...</span>
              </>
            ) : refreshState === 'success' ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 animate-in zoom-in-50" />
                <span className="text-emerald-500 font-medium">Actualizado</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Actualizar</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="gap-1.5 text-xs font-medium"
            title="Registrar entradas o salidas internas en un almacén (mermas, desmedros, ajustes físicos sobrantes/faltantes)"
          >
            <PlusCircle className="h-3.5 w-3.5 text-primary" />
            Movimiento Interno
          </Button>

          <Button
            size="sm"
            onClick={() => setIsTransferModalOpen(true)}
            className="gap-1.5 text-xs font-medium shadow-sm"
            title="Realizar traslado físico de mercadería entre almacenes origen y destino con asiento doble en Kardex"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Nueva Transferencia
          </Button>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Movimientos Listados</p>
              <p className="text-2xl font-bold mt-1">{filteredMovements.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total en registro: {movements.length}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Boxes className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Entradas (Compras/Ajustes)</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                +{totalEntriesQty.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Unidades ingresadas</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-600">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Salidas (Ventas/Mermas)</p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                -{totalExitsQty.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Unidades despachadas</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-600">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Transferencias entre Almacenes</p>
              <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                {totalTransfersUnits.toLocaleString('es-PE', { minimumFractionDigits: 2 })} u.
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totalTransfersMovements.length} asientos dobles
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-600">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas de Vista Omnicanal */}
      <div className="flex items-center gap-1.5 border-b pb-2 overflow-x-auto">
        <Button
          variant={activeTab === 'ALL' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleTabChange('ALL')}
          className="text-xs font-medium h-8"
        >
          Todos los Movimientos ({movements.length})
        </Button>
        <Button
          variant={activeTab === 'ENTRADAS' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleTabChange('ENTRADAS')}
          className="text-xs font-medium h-8 gap-1"
        >
          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
          📥 Entradas
        </Button>
        <Button
          variant={activeTab === 'SALIDAS' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleTabChange('SALIDAS')}
          className="text-xs font-medium h-8 gap-1"
        >
          <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
          📤 Salidas
        </Button>
        <Button
          variant={activeTab === 'TRANSFERS' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleTabChange('TRANSFERS')}
          className="text-xs font-medium h-8 gap-1"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-500" />
          🔄 Transferencias entre Almacenes ({totalTransfersMovements.length})
        </Button>
        <Button
          variant={activeTab === 'AJUSTES' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleTabChange('AJUSTES')}
          className="text-xs font-medium h-8 gap-1"
        >
          <Scale className="h-3.5 w-3.5 text-violet-500" />
          ⚖️ Ajustes, Mermas y Desmedros
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-lg border bg-card/60">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU, descripción, correlativo, guía o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedOpType}
              onChange={(e) => setSelectedOpType(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">Todas las Operaciones (T.12)</option>
              <option value="01">01 Venta Nacional</option>
              <option value="02">02 Compra Nacional</option>
              <option value="18">18 Importación (DAM)</option>
              <option value="21">21 Transferencia (Entrada)</option>
              <option value="22">22 Transferencia (Salida)</option>
              <option value="11">11 Transferencia entre Almacenes</option>
              <option value="28">28 Ajuste Físico (Sobrante/Faltante)</option>
              <option value="13">13 Mermas</option>
              <option value="14">14 Desmedros</option>
              <option value="16">16 Saldo Inicial</option>
            </select>
          </div>

          <select
            value={selectedDirection}
            onChange={(e) => setSelectedDirection(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Sentido: Todos</option>
            <option value="ENTRADA">Solo Entradas</option>
            <option value="SALIDA">Solo Salidas</option>
          </select>

          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Almacén: Todos</option>
            {warehouseOptions.map((w) => (
              <option key={w} value={w}>
                {w} {w === 'ALM-01' ? '(Principal)' : ''}
              </option>
            ))}
          </select>

          {(searchTerm || selectedOpType !== 'ALL' || selectedDirection !== 'ALL' || selectedWarehouse !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchTerm('');
                setSelectedOpType('ALL');
                setSelectedDirection('ALL');
                setSelectedWarehouse('ALL');
              }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Tabla de Movimientos Ampliada y Estructurada */}
      <div className="border rounded-xl bg-card overflow-x-auto shadow-sm">
        <table className="w-full min-w-[1300px] text-left border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground uppercase text-[11px]">
              <th className="p-3.5 w-[105px] min-w-[100px] whitespace-nowrap">Fecha</th>
              <th className="p-3.5 min-w-[210px]">Almacén / Ruta Traslado</th>
              <th className="p-3.5 w-[160px] min-w-[150px] whitespace-nowrap">Correlativo</th>
              <th className="p-3.5 min-w-[230px]">Tipo Operación (T.12)</th>
              <th className="p-3.5 min-w-[160px]">Sustento (T.10)</th>
              <th className="p-3.5 min-w-[260px]">Producto / SKU</th>
              <th className="p-3.5 w-[120px] min-w-[110px] whitespace-nowrap">Sentido</th>
              <th className="p-3.5 text-right w-[110px] min-w-[100px] whitespace-nowrap">Cantidad</th>
              <th className="p-3.5 text-right w-[130px] min-w-[120px] whitespace-nowrap">Costo Unit. (PEN)</th>
              <th className="p-3.5 text-right w-[130px] min-w-[120px] whitespace-nowrap">Total (PEN)</th>
              <th className="p-3.5 text-right w-[130px] min-w-[120px] whitespace-nowrap">Stock Resultante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-muted-foreground">
                  Cargando movimientos de almacén...
                </td>
              </tr>
            ) : filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-muted-foreground">
                  No se encontraron movimientos registrados con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              paginatedMovements.map((m) => {
                const isEntry = m.direction === 'ENTRADA';
                const isTrf = isTransferMovement(m);
                const docLabel = DOCUMENT_NAMES[m.documentTypeCode || ''];

                return (
                  <tr
                    key={m.id || m.movementNumber}
                    onClick={() => setSelectedMovement(m)}
                    title="Ver detalle del movimiento"
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 font-mono whitespace-nowrap">
                      {new Date(m.movementDate).toLocaleDateString('es-PE')}
                    </td>
                    <td className="p-3.5">
                      {isTrf ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge
                            variant="outline"
                            className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-mono text-[10px] w-fit gap-1 whitespace-nowrap"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                            {m.operationTypeCode === '22'
                              ? `${m.warehouseCode || 'ALM-01'} ➔ Destino (Salida)`
                              : m.operationTypeCode === '21'
                              ? `Origen ➔ ${m.warehouseCode || 'ALM-02'} (Entrada)`
                              : `Traslado ${m.warehouseCode || ''}`}
                          </Badge>
                          {m.sourceReferenceId && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Ref: {m.sourceReferenceId}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{m.warehouseCode || 'ALM-01'}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-foreground whitespace-nowrap">{m.movementNumber}</td>
                    <td className="p-3.5">
                      <span className="font-medium text-foreground">
                        {OPERATION_NAMES[m.operationTypeCode] || `Tipo ${m.operationTypeCode}`}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-muted-foreground">
                      {m.documentTypeCode && (
                        <span
                          className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-muted font-semibold text-foreground mr-1"
                          title={docLabel || 'Comprobante SUNAT'}
                        >
                          [{m.documentTypeCode} {docLabel ? docLabel.split(' ')[0] : ''}]
                        </span>
                      )}
                      {formatearReferenciaDocumento(m.documentSerial, m.documentNumber || '-')}
                    </td>
                    <td className="p-3.5">
                      <p className="font-mono font-bold text-primary">{m.sku}</p>
                      {m.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 max-w-[320px]" title={m.description}>
                          {m.description}
                        </p>
                      )}
                    </td>
                    <td className="p-3.5">
                      {isTrf ? (
                        <Badge className={isEntry ? 'bg-indigo-600/10 text-indigo-600 border-indigo-600/30 gap-1 text-[10px] font-semibold whitespace-nowrap' : 'bg-purple-600/10 text-purple-600 border-purple-600/30 gap-1 text-[10px] font-semibold whitespace-nowrap'}>
                          <ArrowLeftRight className="h-3 w-3" />
                          {isEntry ? 'TRF IN' : 'TRF OUT'}
                        </Badge>
                      ) : isEntry ? (
                        <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-600/30 gap-1 text-[10px] font-semibold whitespace-nowrap">
                          <ArrowDownLeft className="h-3 w-3" />
                          ENTRADA
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-600/10 text-amber-600 border-amber-600/30 gap-1 text-[10px] font-semibold whitespace-nowrap">
                          <ArrowUpRight className="h-3 w-3" />
                          SALIDA
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-bold whitespace-nowrap">
                      {m.quantity.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono whitespace-nowrap">
                      S/ {m.unitCost.toLocaleString('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      S/ {m.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-bold font-mono text-primary whitespace-nowrap">
                      {m.resultingStock.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Barra de Paginación (15 por página) */}
      {filteredMovements.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1.5 text-xs text-muted-foreground border-t pt-3">
          <p>
            Mostrando <strong className="font-semibold text-foreground">{startIndex + 1}</strong> a{' '}
            <strong className="font-semibold text-foreground">{endIndex}</strong> de{' '}
            <strong className="font-semibold text-foreground">{totalItems}</strong> movimientos
            {activeTab !== 'ALL' && <span className="ml-1 text-[11px] opacity-80">(filtrados)</span>}
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-8 gap-1 px-3 text-xs font-medium"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-1 px-3 py-1 bg-muted/40 rounded-md border font-medium text-foreground">
              <span>Página {currentPage} de {totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 gap-1 px-3 text-xs font-medium"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Movimiento Interno (Compras, Ajustes, Mermas, Desmedros) */}
      <ManualMovementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadMovements}
      />

      {/* Modal Integrado de Transferencia entre Almacenes (Origen -> Destino) */}
      <TransferMovementModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={loadMovements}
      />

      {/* Modal de Detalle */}
      <MovementDetailModal movement={selectedMovement} onClose={() => setSelectedMovement(null)} />
    </div>
  );
}

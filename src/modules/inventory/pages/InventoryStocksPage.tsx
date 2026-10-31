import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../services/inventoryApi';
import { type InventoryBalance } from '../types/inventory.types';
import { ProductModal } from '../components/ProductModal';
import { ManualMovementModal } from '../components/ManualMovementModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Boxes,
  PlusCircle,
  ArrowLeftRight,
  BookOpen,
  Search,
  RefreshCw,
  Info,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

export default function InventoryStocksPage() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [totalValuation, setTotalValuation] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedSkuForMovement, setSelectedSkuForMovement] = useState<string | undefined>();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryApi.getStockBalances();
      setBalances(data.balances || []);
      setTotalValuation(data.totalValuationPen || 0);
    } catch (err) {
      console.error('Error cargando existencias:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshState('loading');
    await loadData();
    setRefreshState('success');
    setTimeout(() => setRefreshState('idle'), 1800);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredBalances = balances.filter((b) => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return true;
    const sku = String(b.sku || '').toLowerCase();
    const desc = String(b.description || '').toLowerCase();
    return sku.includes(term) || desc.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Banner Informativo Desacoplamiento */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Módulo de Inventario y Kardex Autónomo:</span> Valuación perpetua por Promedio Ponderado Móvil (NIC 2 / Art. 35 LIR). Las importaciones con destino <Badge variant="outline" className="text-[10px] py-0">ACTIVO_FIJO</Badge> son canalizadas a contabilidad y no alteran existencias comerciales.
        </div>
      </div>

      {/* Header & Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Boxes className="h-7 w-7 text-primary" />
            Existencias de Almacén
          </h1>
          <p className="text-sm text-muted-foreground">
            Saldos físicos actuales y valorización perpetua en moneda nacional (PEN).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshState === 'loading'} className="gap-1.5">
            {refreshState === 'loading' ? (
              <><RefreshCw className="h-4 w-4 animate-spin text-primary" /><span>Actualizando...</span></>
            ) : refreshState === 'success' ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-emerald-500 font-medium">Actualizado</span></>
            ) : (
              <><RefreshCw className="h-4 w-4" /><span>Actualizar</span></>
            )}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setIsMovementModalOpen(true)} className="gap-1">
            <ArrowLeftRight className="h-4 w-4" /> Movimiento
          </Button>
          <Button size="sm" onClick={() => setIsProductModalOpen(true)} className="gap-1">
            <PlusCircle className="h-4 w-4" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Valorización Total (PEN)</p>
              <p className="text-2xl font-bold text-primary mt-1">S/ {totalValuation.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full text-primary"><DollarSign className="h-6 w-6" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Ítems en Catálogo</p>
              <p className="text-2xl font-bold mt-1">{balances.length}</p>
            </div>
            <div className="p-3 bg-secondary rounded-full"><Boxes className="h-6 w-6 text-foreground" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Libro PLE Obligatorio</p>
              <Button variant="link" className="p-0 h-auto text-sm font-semibold text-primary mt-1" onClick={() => navigate('/inventory/books')}>
                Gestionar PLE 12.1 / 13.1 &rarr;
              </Button>
            </div>
            <div className="p-3 bg-primary/10 rounded-full text-primary"><BookOpen className="h-6 w-6" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Existencias */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código SKU o descripción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 text-sm" />
        </div>

        <div className="border rounded-md bg-card overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground uppercase">
                <th className="p-3">Almacén</th>
                <th className="p-3">Código SKU</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-right">Stock Físico</th>
                <th className="p-3 text-right">Costo Promedio (PEN)</th>
                <th className="p-3 text-right">Total Valuado (PEN)</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Cargando existencias de inventario...</td></tr>
              ) : filteredBalances.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No se encontraron productos registrados en el inventario.</td></tr>
              ) : (
                filteredBalances.map((b) => (
                  <tr key={b.id || b.sku} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-semibold">{b.warehouseCode || 'ALM-01'}</td>
                    <td className="p-3 font-mono font-bold text-primary">{b.sku}</td>
                    <td className="p-3 font-medium">{b.description}</td>
                    <td className="p-3 text-right font-bold whitespace-nowrap">
                      {b.currentStock.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      <Badge variant="outline" className="ml-1.5 text-[10px] font-mono py-0 px-1 text-muted-foreground bg-muted/40 font-normal">
                        {b.sunatUnitCode || 'NIU'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono">S/ {b.averageUnitCost.toFixed(4)}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      S/ {b.totalInventoryValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/inventory/kardex?sku=${encodeURIComponent(b.sku)}`)}>
                          <BookOpen className="h-3.5 w-3.5" /> Kardex
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={() => { setSelectedSkuForMovement(b.sku); setIsMovementModalOpen(true); }}>
                          <ArrowLeftRight className="h-3.5 w-3.5" /> Mover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSuccess={loadData} />
      <ManualMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => { setIsMovementModalOpen(false); setSelectedSkuForMovement(undefined); }}
        onSuccess={loadData}
        defaultSku={selectedSkuForMovement}
      />
    </div>
  );
}


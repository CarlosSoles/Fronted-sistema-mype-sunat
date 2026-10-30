import { useState, useEffect } from 'react';
import { inventoryApi } from '../services/inventoryApi';
import { type InventoryMovement } from '../types/inventory.types';
import { ManualMovementModal } from '../components/ManualMovementModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, RefreshCw, PlusCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';

const OPERATION_NAMES: Record<string, string> = {
  '01': '01 Venta Nacional',
  '02': '02 Compra Nacional',
  '10': '10 Salida a Producción',
  '16': '16 Saldo Inicial',
  '18': '18 Importación (DAM)',
  '24': '24 Devolución Cliente',
  '25': '25 Devolución Proveedor',
  '28': '28 Ajuste Físico',
  '99': '99 Otros',
};

export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-7 w-7 text-primary" />
            Movimientos de Inventario
          </h1>
          <p className="text-sm text-muted-foreground">
            Asientos inmutables de entradas y salidas clasificados según la Tabla 12 de SUNAT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshState === 'loading'}
            className="gap-1.5 transition-all"
          >
            {refreshState === 'loading' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Actualizando...</span>
              </>
            ) : refreshState === 'success' ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 animate-in zoom-in-50" />
                <span className="text-emerald-500 font-medium">Actualizado</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Actualizar</span>
              </>
            )}
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-card overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground uppercase">
              <th className="p-3">Fecha</th>
              <th className="p-3">Correlativo</th>
              <th className="p-3">Tipo Operación (T.12)</th>
              <th className="p-3">Sustento (T.10)</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Sentido</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3 text-right">Costo Unit. (PEN)</th>
              <th className="p-3 text-right">Total (PEN)</th>
              <th className="p-3 text-right">Stock Resultante</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-muted-foreground">
                  Cargando movimientos de almacén...
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-muted-foreground">
                  No hay movimientos registrados.
                </td>
              </tr>
            ) : (
              movements.map((m) => {
                const isEntry = m.direction === 'ENTRADA';
                return (
                  <tr key={m.id || m.movementNumber} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono">
                      {new Date(m.movementDate).toLocaleDateString('es-PE')}
                    </td>
                    <td className="p-3 font-mono font-semibold">{m.movementNumber}</td>
                    <td className="p-3">
                      <span className="font-medium text-foreground">
                        {OPERATION_NAMES[m.operationTypeCode] || `Tipo ${m.operationTypeCode}`}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {m.documentTypeCode ? `[${m.documentTypeCode}] ` : ''}
                      {m.documentSerial ? `${m.documentSerial}-` : ''}
                      {m.documentNumber || '-'}
                    </td>
                    <td className="p-3 font-mono font-bold text-primary">{m.sku}</td>
                    <td className="p-3">
                      {isEntry ? (
                        <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-600/30 gap-1 text-[10px]">
                          <ArrowDownLeft className="h-3 w-3" />
                          ENTRADA
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-600/10 text-amber-600 border-amber-600/30 gap-1 text-[10px]">
                          <ArrowUpRight className="h-3 w-3" />
                          SALIDA
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold">
                      {m.quantity.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono">S/ {m.unitCost.toFixed(4)}</td>
                    <td className="p-3 text-right font-mono font-bold">
                      S/ {m.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold font-mono text-primary">
                      {m.resultingStock.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ManualMovementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadMovements}
      />
    </div>
  );
}


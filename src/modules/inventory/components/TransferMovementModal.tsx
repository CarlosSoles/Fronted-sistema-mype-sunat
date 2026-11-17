import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeftRight,
  Plus,
  Trash2,
  AlertCircle,
  Boxes,
  Loader2,
  Building2,
} from 'lucide-react';
import { inventoryLedgerApi } from '../services/inventoryLedgerApi';
import { inventoryApi } from '../services/inventoryApi';
import { useAuth } from '@/hooks/useAuth';
import type { InventoryBalance } from '../types/inventory.types';

interface TransferMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TransferItemRow {
  sku: string;
  quantity: number;
}

export const TransferMovementModal: React.FC<TransferMovementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [fromWarehouse, setFromWarehouse] = useState('ALM-01');
  const [toWarehouse, setToWarehouse] = useState('ALM-02');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TransferItemRow[]>([{ sku: '', quantity: 1 }]);

  const [warehouses, setWarehouses] = useState<Array<{ warehouse_code: string; description: string }>>([]);
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      // Set default responsible from authenticated user if not set
      if (!responsible && user?.fullName) {
        setResponsible(`${user.fullName} (${user.role || 'OPERADOR'})`);
      }

      inventoryLedgerApi.getWarehouses()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setWarehouses(data);
          } else {
            setWarehouses([
              { warehouse_code: 'ALM-01', description: 'Almacén Principal' },
              { warehouse_code: 'ALM-02', description: 'Almacén Callao / Sucursal' },
            ]);
          }
        })
        .catch(() => {
          setWarehouses([
            { warehouse_code: 'ALM-01', description: 'Almacén Principal' },
            { warehouse_code: 'ALM-02', description: 'Almacén Callao / Sucursal' },
          ]);
        });

      inventoryApi.getAuthorizedResponsibles()
        .then((res) => {
          const list = Array.isArray(res) ? res : (res as any)?.responsibles || [];
          setResponsibles(list);
        })
        .catch(() => setResponsibles([]));

      inventoryApi.getStockBalances()
        .then((res) => setBalances(res.balances || []))
        .catch(() => setBalances([]));
    }
  }, [isOpen, user]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { sku: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, patch: Partial<TransferItemRow>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const getAvailableStock = (sku: string): number => {
    const b = balances.find((bal) => bal.sku.toLowerCase() === sku.trim().toLowerCase());
    return b ? b.currentStock : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (fromWarehouse === toWarehouse) {
      setServerError('El almacén de origen y destino deben ser distintos.');
      return;
    }

    if (!responsible.trim()) {
      setServerError('Debe indicar el responsable del traslado.');
      return;
    }

    const validItems = items.filter((i) => i.sku.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      setServerError('Debe registrar al menos un producto con cantidad mayor a cero.');
      return;
    }

    // Check duplicated SKUs
    const skus = validItems.map((i) => i.sku.trim().toUpperCase());
    if (new Set(skus).size !== skus.length) {
      setServerError('No se puede repetir el mismo SKU en la misma orden de transferencia.');
      return;
    }

    // Check stock if available
    for (const it of validItems) {
      const stock = getAvailableStock(it.sku);
      if (stock > 0 && it.quantity > stock) {
        setServerError(`Stock insuficiente para ${it.sku.toUpperCase()}: Disponible en libros: ${stock}, Solicitado: ${it.quantity}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await inventoryLedgerApi.createTransfer({
        fromWarehouseCode: fromWarehouse,
        toWarehouseCode: toWarehouse,
        transferDate,
        responsible: responsible.trim(),
        notes: notes.trim() || undefined,
        items: validItems.map((i) => ({
          sku: i.sku.trim().toUpperCase(),
          quantity: Number(i.quantity),
        })),
      });

      // Reset form
      setItems([{ sku: '', quantity: 1 }]);
      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al procesar la transferencia.';
      setServerError(Array.isArray(msg) ? msg.join(' · ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Nueva Transferencia entre Almacenes
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Traslado físico de mercadería con asiento doble en Kardex (Salida de Origen y Entrada en Destino).
          </p>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive" className="py-2.5 text-xs">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Ruta: Origen -> Destino */}
          <div className="p-3 rounded-lg border bg-muted/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px] flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Almacén Origen (Salida Kardex) *
              </label>
              <select
                value={fromWarehouse}
                onChange={(e) => setFromWarehouse(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs mt-1 font-semibold"
              >
                {warehouses.map((w) => (
                  <option key={w.warehouse_code} value={w.warehouse_code}>
                    {w.warehouse_code} — {w.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px] flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                Almacén Destino (Ingreso Kardex) *
              </label>
              <select
                value={toWarehouse}
                onChange={(e) => setToWarehouse(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs mt-1 font-semibold"
              >
                {warehouses.map((w) => (
                  <option key={w.warehouse_code} value={w.warehouse_code}>
                    {w.warehouse_code} — {w.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha y Responsable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                Fecha de Traslado *
              </label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="mt-1 h-8 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                Responsable del Traslado *
              </label>
              <Input
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Nombre del operador o chofer..."
                className="mt-1 h-8 text-xs"
                list="responsibles-list"
                required
              />
              <datalist id="responsibles-list">
                {responsibles.map((r, i) => (
                  <option key={i} value={r} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Documento de Sustento / Guía de Remisión y Notas */}
          <div>
            <label className="font-semibold text-muted-foreground uppercase text-[10px]">
              Sustento / Guía de Remisión Remitente / Observaciones
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej: GR Remitente T001-00045 · Motivo: Reposición de stock sucursal"
              className="mt-1 h-8 text-xs"
            />
          </div>

          {/* Tabla de Productos a Trasladar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-muted-foreground uppercase text-[10px] flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-primary" />
                Productos y Cantidades a Trasladar *
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar Ítem
              </Button>
            </div>

            <div className="border rounded-md divide-y max-h-56 overflow-y-auto bg-card">
              {items.map((item, index) => {
                const stock = getAvailableStock(item.sku);
                const prod = balances.find((b) => b.sku.toLowerCase() === item.sku.trim().toLowerCase());
                return (
                  <div key={index} className="p-2.5 flex items-center gap-3 bg-card hover:bg-muted/20">
                    <div className="flex-1">
                      <Input
                        placeholder="Código SKU (ej: FIE-001, CLV-2)..."
                        value={item.sku}
                        onChange={(e) => handleItemChange(index, { sku: e.target.value.toUpperCase() })}
                        className="h-8 text-xs font-mono uppercase font-bold"
                        list="transfer-sku-list"
                        required
                      />
                      {prod && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {prod.description} · Stock disp.: <strong className="text-foreground">{stock} {prod.sunatUnitCode || 'NIU'}</strong>
                        </p>
                      )}
                    </div>

                    <div className="w-28">
                      <Input
                        type="number"
                        min="0.0001"
                        step="any"
                        placeholder="Cantidad"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, { quantity: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-xs font-bold text-right"
                        required
                      />
                    </div>

                    <div className="shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={items.length === 1}
                        onClick={() => handleRemoveItem(index)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <datalist id="transfer-sku-list">
              {balances.map((b) => (
                <option key={b.sku} value={b.sku}>
                  {b.sku} — {b.description} (Stock: {b.currentStock} {b.sunatUnitCode || 'NIU'})
                </option>
              ))}
            </datalist>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando Transferencia...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-4 w-4" />
                  Confirmar Transferencia
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { manualMovementSchema, type ManualMovementFormData } from '../validators/manualMovementSchema';
import { inventoryApi } from '../services/inventoryApi';
import { type InventoryBalance } from '../types/inventory.types';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeftRight, AlertCircle, Info } from 'lucide-react';

interface ManualMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultSku?: string;
}

export const ManualMovementModal: React.FC<ManualMovementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultSku = '',
}) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ManualMovementFormData>({
    resolver: zodResolver(manualMovementSchema),
    defaultValues: {
      sku: defaultSku,
      warehouse_code: 'ALM-01',
      direction: 'ENTRADA',
      operation_type_code: '02',
      quantity: 1,
      unit_cost: 0,
      document_type_code: '01',
      document_serial: '',
      document_number: '',
      notes: '',
    },
  });

  const direction = watch('direction');
  const selectedSku = watch('sku');

  useEffect(() => {
    if (isOpen) {
      inventoryApi.getStockBalances().then((res) => {
        setBalances(res.balances || []);
      }).catch((err) => console.error('Error cargando balances:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultSku) {
      setValue('sku', defaultSku);
    }
  }, [defaultSku, setValue]);

  const currentProduct = balances.find(
    (b) => b.sku.toLowerCase() === (selectedSku || '').toLowerCase()
  );

  const onSubmit = async (data: ManualMovementFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await inventoryApi.createManualMovement(data);
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.message || err.message || 'Error al asentar movimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Registro de Movimiento Físico Interno (Kardex)
          </DialogTitle>
        </DialogHeader>

        {/* Banner Aclaratorio de Deslinde (Obs 18) */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Movimiento Interno:</strong> Asienta entradas o salidas físicas dentro de un único almacén (compras, mermas, desmedros, reposición por nota de débito). Para traslados entre dos almacenes físicos con guía de remisión, use el módulo de <strong>Transferencias</strong>.
          </p>
        </div>

        {serverError && (
          <Alert variant="destructive" className="py-2 text-xs">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1 text-xs">
          {/* Sentido y Tipo de Operación SUNAT Tabla 12 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                Sentido de Movimiento *
              </label>
              <select
                {...register('direction')}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 font-semibold"
              >
                <option value="ENTRADA">🟢 ENTRADA (Aumento Físico)</option>
                <option value="SALIDA">🔴 SALIDA (Disminución Física)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                Tipo Operación (Tabla 12 SUNAT) *
              </label>
              <select
                {...register('operation_type_code')}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
              >
                {direction === 'ENTRADA' ? (
                  <>
                    <option value="02">02 - Compra Nacional</option>
                    <option value="08">08 - Reposición por Nota de Débito (Proveedor)</option>
                    <option value="24">24 - Devolución del Cliente</option>
                    <option value="28">28 - Ajuste por Inventario Físico (Sobrante)</option>
                    <option value="16">16 - Saldo Inicial</option>
                    <option value="99">99 - Otros Ingresos</option>
                  </>
                ) : (
                  <>
                    <option value="01">01 - Venta Nacional</option>
                    <option value="13">13 - Mermas (Art. 37 LIR / Manipuleo)</option>
                    <option value="14">14 - Desmedros (Deterioro / Notarial)</option>
                    <option value="25">25 - Devolución a Proveedor</option>
                    <option value="12">12 - Retiro de Bienes / Muestras</option>
                    <option value="99">99 - Otras Salidas</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* SKU y Almacén Operativo (Obs 18) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                Código SKU *
              </label>
              <Input
                placeholder="ej: CEM-001 o LAP-001"
                {...register('sku')}
                className="mt-1 uppercase text-xs font-mono font-bold"
                list="sku-balance-options"
              />
              <datalist id="sku-balance-options">
                {balances.map((b) => (
                  <option key={b.sku} value={b.sku}>
                    {b.sku} — {b.description} ({b.currentStock} {b.sunatUnitCode || 'NIU'})
                  </option>
                ))}
              </datalist>
              {errors.sku && <p className="text-destructive mt-0.5 text-[10px]">{errors.sku.message}</p>}
            </div>

            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                Almacén Operativo *
              </label>
              <select
                {...register('warehouse_code')}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
              >
                <option value="ALM-01">ALM-01 — Almacén Principal</option>
                <option value="ALM-02">ALM-02 — Almacén Secundario</option>
              </select>
            </div>
          </div>

          {/* Resaltado del Producto Seleccionado */}
          {currentProduct && (
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border text-[11px]">
              <div>
                <p className="font-semibold text-foreground">{currentProduct.description}</p>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {currentProduct.brand ? `Marca: ${currentProduct.brand} · ` : ''}Unidad: {currentProduct.sunatUnitCode || 'NIU'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase block">Stock Actual en Libros:</span>
                <Badge variant="outline" className="font-mono font-bold text-xs bg-background">
                  {currentProduct.currentStock} {currentProduct.sunatUnitCode || 'NIU'}
                </Badge>
              </div>
            </div>
          )}

          {/* Cantidad y Costo Unitario */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                Cantidad a Mover *
              </label>
              <Input
                type="number"
                step="any"
                min="0.0001"
                {...register('quantity', { valueAsNumber: true })}
                className="mt-1 text-xs font-semibold"
              />
              {errors.quantity && <p className="text-destructive mt-0.5 text-[10px]">{errors.quantity.message}</p>}
            </div>

            {direction === 'ENTRADA' ? (
              <div>
                <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                  Costo Unitario (S/ PEN) *
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  {...register('unit_cost', { valueAsNumber: true })}
                  className="mt-1 text-xs font-mono"
                  placeholder="0.0000"
                />
              </div>
            ) : (
              <div>
                <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                  Valorización Salida
                </label>
                <div className="h-8 px-2 flex items-center bg-muted/60 rounded-md text-[11px] text-muted-foreground mt-1">
                  Automático por Costo Promedio Móvil
                </div>
              </div>
            )}
          </div>

          {/* Comprobante de Sustento (Tabla 10 SUNAT) */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">
                Doc. Sustento (T10)
              </label>
              <select
                {...register('document_type_code')}
                className="w-full h-8 rounded-md border border-input bg-background px-1.5 text-xs mt-1"
              >
                <option value="01">01 - Factura</option>
                <option value="03">03 - Boleta</option>
                <option value="08">08 - Nota de Débito (Proveedor)</option>
                <option value="07">07 - Nota de Crédito</option>
                <option value="09">09 - Guía Remisión</option>
                <option value="50">50 - DAM/DUA (Aduanas)</option>
                <option value="00">00 - Documento Interno</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">Serie</label>
              <Input placeholder="F001" {...register('document_serial')} className="mt-1 text-xs uppercase" />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">Número</label>
              <Input placeholder="0001234" {...register('document_number')} className="mt-1 text-xs" />
            </div>
          </div>

          <div>
            <label className="font-semibold text-muted-foreground uppercase text-[10px]">
              Observaciones / Justificación de Auditoría
            </label>
            <Input
              placeholder="Detalle o justificación del movimiento (ej: Reposición por mercadería defectuosa)"
              {...register('notes')}
              className="mt-1 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Asentar Movimiento en Kardex
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

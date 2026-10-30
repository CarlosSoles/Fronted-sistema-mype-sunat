import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '../validators/productSchema';
import { inventoryApi } from '../services/inventoryApi';
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
import { Loader2, PlusCircle, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductModal = ({ isOpen, onClose, onSuccess }: ProductModalProps) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      description: '',
      sunat_type_code: '01',
      sunat_unit_code: 'NIU',
      min_stock_alert: 0,
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await inventoryApi.registerProduct(data);
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.message || err.message || 'Error al registrar producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Nuevo Producto en Catálogo
          </DialogTitle>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Código SKU Único *
            </label>
            <Input
              placeholder="ej: PROD-LAP-001"
              {...register('sku')}
              className="mt-1 uppercase"
            />
            {errors.sku && <p className="text-xs text-destructive mt-1">{errors.sku.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Descripción Comercial *
            </label>
            <Input
              placeholder="ej: Laptop Gamer 16GB RAM i7"
              {...register('description')}
              className="mt-1"
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Tipo Existencia (Tabla 5)
              </label>
              <select
                {...register('sunat_type_code')}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
              >
                <option value="01">01 - Mercaderías</option>
                <option value="02">02 - Prod. Terminados</option>
                <option value="03">03 - Materias Primas</option>
                <option value="04">04 - Envases / Embalajes</option>
                <option value="07">07 - Repuestos</option>
                <option value="99">99 - Otros</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Unidad (Tabla 6)
              </label>
              <select
                {...register('sunat_unit_code')}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mt-1"
              >
                <option value="NIU">NIU - Unidades</option>
                <option value="KGM">KGM - Kilogramos</option>
                <option value="LTR">LTR - Litros</option>
                <option value="MTR">MTR - Metros</option>
                <option value="BX">BX - Cajas</option>
                <option value="PK">PK - Paquetes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Alerta de Stock Mínimo
            </label>
            <Input
              type="number"
              step="any"
              {...register('min_stock_alert', { valueAsNumber: true })}
              className="mt-1"
            />
            {errors.min_stock_alert && (
              <p className="text-xs text-destructive mt-1">{errors.min_stock_alert.message}</p>
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Producto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { shipmentSchema, type ShipmentFormData } from '../validators';
import { CUSTOMS_OFFICES } from '../services/catalogsApi';

interface NewShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ShipmentFormData) => Promise<unknown>;
}

export const NewShipmentModal: React.FC<NewShipmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      shipment_number: `EXP-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      supplier_id: 'a0000000-0000-0000-0000-000000000001',
      incoterm: 'FOB',
      currency_code: 'USD',
      transport_mode: 'MARITIMO',
      origin_country_code: 'CN',
      destination_customs: '118',
    },
  });

  const handleFormSubmit = async (data: ShipmentFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Aperturar Expediente de Importación</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3 py-2 text-xs">
          <div>
            <label className="font-medium text-foreground block mb-1">Número de Expediente</label>
            <Input {...register('shipment_number')} placeholder="EXP-2026-00042" className="h-8 text-xs font-mono" />
            {errors.shipment_number && (
              <p className="text-[11px] text-red-500 mt-0.5">{errors.shipment_number.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-foreground block mb-1">Incoterm (ICC 2020)</label>
              <select {...register('incoterm')} className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background">
                <option value="FOB">FOB - Free on Board</option>
                <option value="CIF">CIF - Cost, Insurance & Freight</option>
                <option value="CFR">CFR - Cost and Freight</option>
                <option value="EXW">EXW - Ex Works</option>
              </select>
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Vía de Transporte</label>
              <select {...register('transport_mode')} className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background">
                <option value="MARITIMO">Marítimo</option>
                <option value="AEREO">Aéreo</option>
                <option value="TERRESTRE">Terrestre</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-foreground block mb-1">País Origen (ISO)</label>
              <Input {...register('origin_country_code')} placeholder="CN" maxLength={2} className="h-8 text-xs uppercase" />
              {errors.origin_country_code && (
                <p className="text-[11px] text-red-500 mt-0.5">{errors.origin_country_code.message}</p>
              )}
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Aduana de Ingreso</label>
              <select {...register('destination_customs')} className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background">
                {CUSTOMS_OFFICES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground block mb-1">Fecha Estimada Arribo (ETA)</label>
            <Input type="date" {...register('eta_date')} className="h-8 text-xs" />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear Expediente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

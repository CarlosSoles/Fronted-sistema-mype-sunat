import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AUTHORIZED_BANKS } from '../services/catalogsApi';
import { type CustomsSettlementRecord, type PaySettlementPayload } from '../types';

interface PaySettlementModalProps {
  settlement: CustomsSettlementRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (settlementId: string, payload: PaySettlementPayload) => Promise<unknown>;
}

export const PaySettlementModal: React.FC<PaySettlementModalProps> = ({
  settlement,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [bankCode, setBankCode] = useState('002');
  const [opNumber, setOpNumber] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!settlement) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opNumber) return;

    setIsSubmitting(true);
    try {
      await onSubmit(settlement.id, {
        bank_code: bankCode,
        bank_operation_number: opNumber,
        paid_at: new Date(paidAt).toISOString(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Conciliación Bancaria Teledespacho SUNAT
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2 text-xs">
          <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cuota:</span>
              <span className="font-bold text-foreground">{settlement.settlement_type}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Monto Exigible:</span>
              <span className="font-bold text-primary">S/ {Number(settlement.amount_pen ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Código CDA:</span>
              <span className="font-bold text-foreground">
                {settlement.cda_number || settlement.settlement_number}
              </span>
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Entidad Bancaria Recaudadora</label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background"
            >
              {AUTHORIZED_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">N° de Operación Bancaria / Constancia</label>
            <Input
              value={opNumber}
              onChange={(e) => setOpNumber(e.target.value)}
              placeholder="OP-9847120"
              required
              className="h-8 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Fecha y Hora de Cancelación</label>
            <Input
              type="datetime-local"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
              className="h-8 text-xs font-mono"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando Pago...' : 'Confirmar Pago y Levante'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

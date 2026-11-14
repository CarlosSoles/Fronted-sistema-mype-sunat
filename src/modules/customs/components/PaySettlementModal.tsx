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
import { formatCurrency } from '@/lib/formatters';
import { inventoryPurchasesApi } from '@/modules/inventory/services/inventoryPurchasesApi';
import { Send, CheckCircle2, CreditCard } from 'lucide-react';

interface PaySettlementModalProps {
  settlement: CustomsSettlementRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (settlementId: string, payload: PaySettlementPayload) => Promise<unknown>;
}

const getCuotaLabel = (type: string) => {
  if (type.includes('0010')) return 'Cuota 0010 — Tributos e IGV/IPM';
  if (type.includes('0026')) return 'Cuota 0026 — Percepción del IGV';
  if (type.includes('0027')) return 'Cuota 0027 — Multa Aduanera';
  return type;
};

export const PaySettlementModal: React.FC<PaySettlementModalProps> = ({
  settlement,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [activeTab, setActiveTab] = useState<'SEND_COMPRAS' | 'DIRECT_BANK'>('SEND_COMPRAS');
  const [bankCode, setBankCode] = useState('002');
  const [opNumber, setOpNumber] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  if (!settlement) return null;

  const handleSendToCompras = async () => {
    setIsSubmitting(true);
    setSuccessNote(null);
    try {
      const cdaCode = settlement.cda_number || settlement.settlement_number || 'CDA-SUNAT';
      // 1. Crear la Cuenta por Pagar en el módulo de Compras a nombre de SUNAT
      await inventoryPurchasesApi.createManualPayable({
        supplierName: 'SUNAT - SUPERINTENDENCIA NACIONAL DE ADUANAS',
        supplierDocNumber: '20131312955',
        description: `Liquidación de Tributos DAM (CDA: ${cdaCode}) · ${getCuotaLabel(settlement.settlement_type)}`,
        amount: Number(settlement.amount_pen || 0),
        currencyCode: 'PEN',
        issueDate: new Date().toISOString().slice(0, 10),
      });

      // 2. Registrar el pago de la liquidación aduanera vinculada a Compras
      await onSubmit(settlement.id, {
        bank_code: '018', // Banco de la Nación / Recaudadora SUNAT
        bank_operation_number: `CXP-SUNAT-${cdaCode}`,
        paid_at: new Date().toISOString(),
      });

      setSuccessNote('¡CDA enviado exitosamente a Cuentas por Pagar (Compras) y liquidación sincronizada!');
      setTimeout(() => {
        setSuccessNote(null);
        onClose();
      }, 1400);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Error al enviar CDA a Compras.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
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
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Liquidación y Cancelación de Tributos DAM (CDA)
          </DialogTitle>
        </DialogHeader>

        {successNote && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successNote}</span>
          </div>
        )}

        {/* Resumen del Monto y Código CDA */}
        <div className="p-2.5 rounded-lg border border-border/40 bg-muted/20 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Cuota Liquidación:</span>
            <span className="font-bold text-foreground text-xs">
              {getCuotaLabel(settlement.settlement_type)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Monto Exigible:</span>
            <span className="font-bold text-primary font-mono text-sm">
              {formatCurrency(settlement.amount_pen ?? 0, 'PEN')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Código CDA Oficial:</span>
            <span className="font-bold text-foreground font-mono">
              {settlement.cda_number || settlement.settlement_number}
            </span>
          </div>
        </div>

        {/* Selector de Modo: Enviar a Compras vs Pago Directo */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('SEND_COMPRAS')}
            className={`py-1.5 px-2 rounded-md font-medium text-center transition-all ${
              activeTab === 'SEND_COMPRAS'
                ? 'bg-background shadow-xs text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Enviar CDA a Cuentas por Pagar (Compras)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DIRECT_BANK')}
            className={`py-1.5 px-2 rounded-md font-medium text-center transition-all ${
              activeTab === 'DIRECT_BANK'
                ? 'bg-background shadow-xs text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Registrar Pago Bancario Directo (Teledespacho)
          </button>
        </div>

        {activeTab === 'SEND_COMPRAS' ? (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 text-sky-900 dark:text-sky-200 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-xs text-sky-800 dark:text-sky-300">
                <Send className="h-3.5 w-3.5" />
                Sincronización con Módulo de Compras y Tesorería
              </p>
              <p className="text-[11px] text-muted-foreground">
                Se enviará la obligación tributaria por <strong>{formatCurrency(settlement.amount_pen ?? 0, 'PEN')}</strong> directamente a las Cuentas por Pagar (CxP) de Compras con proveedor <strong>SUNAT (20131312955)</strong>. Al registrarse, se autoriza el Levante Aduanero para proceder al almacén.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSendToCompras}
                disabled={isSubmitting}
                className="gap-1.5 bg-primary font-semibold"
              >
                {isSubmitting ? 'Enviando a Compras...' : '🚢 Enviar CDA a Cuentas por Pagar (Compras)'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleDirectSubmit} className="space-y-3 py-2 text-xs">
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
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Registrando Pago...' : 'Registrar Pago Bancario Directo (Teledespacho)'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

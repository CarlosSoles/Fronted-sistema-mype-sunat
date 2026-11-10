import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type AddLocalExpensePayload, type ProrationMethod } from '../types';
import { landedCostApi } from '../services/landedCostApi';
import { FileSpreadsheet, Info } from 'lucide-react';

interface AddLocalExpenseModalProps {
  shipmentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AddLocalExpensePayload) => Promise<unknown>;
}

export const AddLocalExpenseModal: React.FC<AddLocalExpenseModalProps> = ({
  shipmentId,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const eligibleInvoicesQuery = useQuery({
    queryKey: ['customs', 'eligible-purchase-invoices'],
    queryFn: landedCostApi.getEligibleInvoices,
    enabled: isOpen,
  });

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('MANUAL');
  const [purchaseId, setPurchaseId] = useState<string | undefined>(undefined);
  const [ruc, setRuc] = useState('');
  const [name, setName] = useState('');
  const [concept, setConcept] = useState('ALMACENAJE_PORTUARIO');
  const [serial, setSerial] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [netAmount, setNetAmount] = useState(0);
  const [igvAmount, setIgvAmount] = useState(0);
  const [method, setMethod] = useState<ProrationMethod>('PESO_BRUTO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    if (id === 'MANUAL') {
      setPurchaseId(undefined);
      return;
    }
    const inv = eligibleInvoicesQuery.data?.find((i) => i.id === id);
    if (inv) {
      setPurchaseId(inv.id);
      setRuc(inv.supplier_doc_number || '');
      setName(inv.supplier_name || '');
      setSerial(`${inv.document_serial}-${inv.document_number}`);
      setDate(String(inv.issue_date).slice(0, 10));
      const net = Number(inv.net_amount) || 0;
      const igv = Number(inv.igv_amount) || 0;
      setNetAmount(net);
      setIgvAmount(igv);
    }
  };

  const handleNetChange = (val: number) => {
    setNetAmount(val);
    setIgvAmount(Number((val * 0.18).toFixed(2)));
  };

  const total = Number((netAmount + igvAmount).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        shipment_id: shipmentId,
        purchase_id: purchaseId,
        supplier_ruc: ruc.trim(),
        supplier_name: name.trim(),
        expense_concept: concept,
        invoice_serial_number: serial.trim(),
        issue_date: date,
        net_amount_pen: netAmount,
        igv_amount_pen: igvAmount,
        total_amount_pen: total,
        is_capitalizable: true,
        proration_method: method,
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
            Registrar Factura Local de Desaduanaje (NIC 2)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2 text-xs">
          {/* Selector de Comprobante de Compras Registrado en el ERP (Obs 12) */}
          <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-primary flex items-center gap-1.5 text-xs">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Vincular con Factura de Compra Local Registrada (Módulo Compras / Facturación)
              </label>
            </div>
            <select
              value={selectedInvoiceId}
              onChange={(e) => handleSelectInvoice(e.target.value)}
              className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
            >
              <option value="MANUAL">— Digitación manual de factura física externa —</option>
              {(eligibleInvoicesQuery.data ?? []).map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.document_serial}-{inv.document_number} · {inv.supplier_name} (S/ {Number(inv.total_amount).toFixed(2)})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3 text-primary shrink-0" />
              Selecciona comprobantes reales de compras nacionales para vincular su desembolso con el expediente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-foreground block mb-1">RUC Proveedor Local *</label>
              <Input
                placeholder="20XXXXXXXXX"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                maxLength={11}
                required
                className="h-8 text-xs font-mono font-medium"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">Concepto de Gasto de Desaduanaje *</label>
              <select value={concept} onChange={(e) => setConcept(e.target.value)} className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium">
                <option value="ALMACENAJE_PORTUARIO">Almacenaje Portuario / Extraportuario</option>
                <option value="HONORARIOS_AGENCIA">Comisión / Honorarios Agencia de Aduana</option>
                <option value="TRANSPORTE_LOCAL">Flete Local (Puerto a Almacén Central)</option>
                <option value="CUADRILLA_ESTIBA">Cuadrilla de Estiba y Desestiba</option>
                <option value="INSPECCION_SENASA">Inspección Sanitaria SENASA / DIGESA</option>
                <option value="GASTOS_OPERATIVOS">Otros Gastos Operativos Directos NIC 2</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Razón Social del Proveedor Local *</label>
            <Input
              placeholder="ej: APM Terminals Callao S.A. / Ransa Comercial S.A."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-8 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-foreground block mb-1">Serie y Número del Comprobante *</label>
              <Input
                placeholder="ej: F001-00045812"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                required
                className="h-8 text-xs font-mono uppercase font-medium"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">Fecha de Emisión *</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="h-8 text-xs font-mono font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg border border-border/40 bg-muted/20">
            <div>
              <label className="text-[10px] font-bold text-foreground block">Neto (Al Costo)</label>
              <Input type="number" step="0.01" value={netAmount} onChange={(e) => handleNetChange(parseFloat(e.target.value) || 0)} required className="h-7 text-xs font-mono font-bold text-primary" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-emerald-600 block">IGV (Crédito Fiscal)</label>
              <Input type="number" step="0.01" value={igvAmount} onChange={(e) => setIgvAmount(parseFloat(e.target.value) || 0)} required className="h-7 text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block">Total Factura</label>
              <Input type="number" step="0.01" value={total} readOnly className="h-7 text-xs font-mono bg-background/50" />
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Criterio de Prorrateo NIC 2</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as ProrationMethod)} className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium">
              <option value="PESO_BRUTO">Por Peso Bruto (Fletes y Almacenaje)</option>
              <option value="VALOR_FOB">Por Valor FOB (Comisiones de Agencia)</option>
              <option value="UNIDADES">Por Unidades Físicas</option>
            </select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Cargar Factura'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

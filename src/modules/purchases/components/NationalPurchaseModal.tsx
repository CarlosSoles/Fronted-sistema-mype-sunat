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
import { purchasesApi } from '../services/purchasesApi';
import type { CreatePurchasePayload } from '../types/purchases.types';
import { inventoryApi } from '@/modules/inventory/services/inventoryApi';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Receipt,
  Building2,
  Warehouse,
  CheckCircle2,
} from 'lucide-react';

interface PurchaseItemRow {
  sku: string;
  description: string;
  quantity: number;
  unitCost: number;
}

interface NationalPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const NationalPurchaseModal: React.FC<NationalPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [supplierDocNumber, setSupplierDocNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [documentTypeCode, setDocumentTypeCode] = useState('01');
  const [documentSerial, setDocumentSerial] = useState('F001');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [warehouseCode, setWarehouseCode] = useState('ALM-01');
  const [currencyCode, setCurrencyCode] = useState('PEN');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItemRow[]>([
    { sku: '', description: '', quantity: 1, unitCost: 0 },
  ]);

  const [availableProducts, setAvailableProducts] = useState<Array<{ sku: string; name: string; currentCost?: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar catálogo de productos para autocompletar SKUs
  useEffect(() => {
    if (isOpen) {
      inventoryApi.getStockBalances().then((res) => {
        if (res?.balances) {
          const list = res.balances.map((b) => ({
            sku: b.sku,
            name: b.description || b.sku,
            currentCost: b.averageUnitCost,
          }));
          setAvailableProducts(list);
        }
      }).catch(() => {
        // Silencioso si falla la precarga de catálogo
      });
    }
  }, [isOpen]);

  // Cálculos en tiempo real
  const netAmount = items.reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0,
  );
  const igvAmount = Math.round(netAmount * 0.18 * 100) / 100;
  const totalAmount = Math.round((netAmount + igvAmount) * 100) / 100;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { sku: '', description: '', quantity: 1, unitCost: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemRow, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Si cambia el SKU y coincide con un producto conocido, autocompletar descripción
      if (field === 'sku') {
        const matched = availableProducts.find(
          (p) => p.sku.toLowerCase() === String(value).trim().toLowerCase(),
        );
        if (matched && !updated[index].description) {
          updated[index].description = matched.name;
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!supplierDocNumber.trim() || !supplierName.trim()) {
      setErrorMessage('El RUC y la razón social del proveedor son obligatorios.');
      return;
    }

    if (!documentSerial.trim() || !documentNumber.trim()) {
      setErrorMessage('La serie y el número del comprobante de compra son obligatorios.');
      return;
    }

    const invalidItem = items.find(
      (it) => !it.sku.trim() || it.quantity <= 0 || it.unitCost < 0,
    );
    if (invalidItem) {
      setErrorMessage('Todos los ítems deben tener SKU válido, cantidad > 0 y costo >= 0.');
      return;
    }

    const skus = items.map((it) => it.sku.trim().toUpperCase());
    if (new Set(skus).size !== skus.length) {
      setErrorMessage('No puedes repetir el mismo SKU en varias filas del comprobante.');
      return;
    }

    const payload: CreatePurchasePayload = {
      supplierDocNumber: supplierDocNumber.trim(),
      supplierName: supplierName.trim(),
      documentTypeCode,
      documentSerial: documentSerial.trim().toUpperCase(),
      documentNumber: documentNumber.trim(),
      issueDate,
      warehouseCode,
      currencyCode,
      notes: notes.trim() || undefined,
      items: items.map((it) => ({
        sku: it.sku.trim().toUpperCase(),
        description: it.description?.trim() || undefined,
        quantity: Number(it.quantity),
        unitCost: Number(it.unitCost),
      })),
    };

    setIsSubmitting(true);
    try {
      await purchasesApi.createPurchase(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Error al registrar la compra nacional.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
            Registrar Compra Nacional (Operación 02 SUNAT)
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Ingreso al Kardex con costo promedio ponderado sin IGV, crédito fiscal de IGV (18%), cuenta por pagar y asientos PCGE (60/40/42 y 20/61).
          </p>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Datos del Proveedor */}
          <div className="bg-muted/40 p-3 rounded-lg border space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Proveedor Nacional
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[11px]">
                  RUC del Proveedor *
                </label>
                <Input
                  placeholder="ej: 20601234567"
                  maxLength={11}
                  value={supplierDocNumber}
                  onChange={(e) => setSupplierDocNumber(e.target.value)}
                  className="mt-1 h-8 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[11px]">
                  Razón Social *
                </label>
                <Input
                  placeholder="ej: Inversiones y Servicios Industriales S.A.C."
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="mt-1 h-8 text-xs uppercase"
                  required
                />
              </div>
            </div>
          </div>

          {/* Datos del Comprobante y Destino */}
          <div className="bg-muted/40 p-3 rounded-lg border space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Receipt className="h-4 w-4 text-emerald-600" />
              Comprobante de Pago y Destino Físico
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[11px]">Tipo Doc. *</label>
                <select
                  value={documentTypeCode}
                  onChange={(e) => setDocumentTypeCode(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                >
                  <option value="01">01 - Factura</option>
                  <option value="03">03 - Boleta</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[11px]">Serie *</label>
                <Input
                  placeholder="ej: F001"
                  value={documentSerial}
                  onChange={(e) => setDocumentSerial(e.target.value)}
                  className="mt-1 h-8 text-xs uppercase font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[11px]">Número *</label>
                <Input
                  placeholder="ej: 0012345"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="mt-1 h-8 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[11px]">
                  Fecha Emisión *
                </label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[11px]">
                  Moneda *
                </label>
                <select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                >
                  <option value="PEN">PEN (S/)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-muted-foreground uppercase text-[11px]">
                  Almacén Destino *
                </label>
                <select
                  value={warehouseCode}
                  onChange={(e) => setWarehouseCode(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 font-semibold"
                >
                  <option value="ALM-01">ALM-01 — Principal</option>
                  <option value="ALM-02">ALM-02 — Secundario</option>
                </select>
              </div>
            </div>
          </div>

          {/* Detalle de Productos Facturados */}
          <div className="bg-muted/40 p-3 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                <Warehouse className="h-4 w-4 text-emerald-600" />
                Mercaderías Adquiridas (Entrada a Kardex)
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar Producto
              </Button>
            </div>

            {/* Datalist para autocompletar productos existentes */}
            <datalist id="products-catalog-list">
              {availableProducts.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.name}
                </option>
              ))}
            </datalist>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-1 font-medium w-40">SKU / Código *</th>
                    <th className="pb-1 font-medium">Descripción</th>
                    <th className="pb-1 font-medium text-right w-24">Cantidad *</th>
                    <th className="pb-1 font-medium text-right w-32">Costo Neto (S/)*</th>
                    <th className="pb-1 font-medium text-right w-28">Subtotal</th>
                    <th className="pb-1 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((item, idx) => {
                    const rowSubtotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
                    return (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="py-1.5 pr-2">
                          <Input
                            list="products-catalog-list"
                            placeholder="SKU-XXXX"
                            value={item.sku}
                            onChange={(e) => handleItemChange(idx, 'sku', e.target.value.toUpperCase())}
                            className="h-7 text-xs font-mono uppercase"
                            required
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            placeholder="Descripción del producto..."
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            type="number"
                            min="0.0001"
                            step="any"
                            value={item.quantity || ''}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="h-7 text-xs text-right font-mono"
                            required
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={item.unitCost || ''}
                            onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                            className="h-7 text-xs text-right font-mono"
                            required
                          />
                        </td>
                        <td className="py-1.5 pr-2 text-right font-mono font-medium">
                          {money(rowSubtotal)}
                        </td>
                        <td className="py-1.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={items.length <= 1}
                            onClick={() => handleRemoveItem(idx)}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Liquidación de Totales */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 border-t gap-2 bg-muted/20 p-2 rounded">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                El costo computable al Kardex excluye el IGV según NIC 2 y SUNAT.
              </div>
              <div className="space-y-1 text-right w-full sm:w-64 font-mono text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Valor Compra (Neto):</span>
                  <span>{money(netAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IGV 18% (Crédito Fiscal):</span>
                  <span>{money(igvAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground text-sm border-t pt-1">
                  <span>Total Factura (CxP):</span>
                  <span className="text-emerald-600">{money(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Glosa u Observaciones */}
          <div>
            <label className="font-medium text-muted-foreground uppercase text-[11px]">
              Observaciones / Glosa Contable
            </label>
            <Input
              placeholder="Detalle o notas de la adquisición..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || netAmount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Registrando Compra...
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Registrar Compra y Movimiento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PurchaseRecord } from '../types/purchases.types';
import { Receipt, Building2, Calendar, Warehouse, DollarSign, Package } from 'lucide-react';

interface PurchaseDetailModalProps {
  purchase: PurchaseRecord | null;
  onClose: () => void;
  onRegisterPayment?: (purchase: PurchaseRecord) => void;
}

const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  purchase,
  onClose,
  onRegisterPayment,
}) => {
  if (!purchase) return null;

  return (
    <Dialog open={!!purchase} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto text-xs">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-emerald-600" />
              Detalle de Compra {purchase.purchaseNumber}
            </DialogTitle>
            <Badge variant={purchase.status === 'PAGADA' ? 'default' : 'secondary'}>
              {purchase.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Comprobante fiscal {purchase.documentSerial}-{purchase.documentNumber}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Ficha Cabecera */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">Proveedor:</span>
              </div>
              <p className="font-medium text-sm text-foreground">{purchase.supplierName}</p>
              <p className="text-muted-foreground font-mono">RUC: {purchase.supplierDocNumber}</p>
            </div>
            <div className="space-y-1.5 text-right sm:text-left">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">Fecha y Destino:</span>
              </div>
              <p className="text-muted-foreground">
                Fecha de Emisión: <span className="font-mono text-foreground">{new Date(purchase.issueDate).toLocaleDateString('es-PE')}</span>
              </p>
              <p className="text-muted-foreground">
                Almacén: <span className="font-mono font-medium text-foreground">{purchase.warehouseCode}</span>
              </p>
            </div>
          </div>

          {/* Tabla de Mercaderías */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Package className="h-4 w-4 text-emerald-600" />
              Ítems ingresados al inventario ({purchase.items?.length ?? 0})
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b">
                  <tr className="text-muted-foreground font-medium">
                    <th className="p-2">SKU</th>
                    <th className="p-2">Descripción</th>
                    <th className="p-2 text-right">Cantidad</th>
                    <th className="p-2 text-right">Costo Unit. (Neto)</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(purchase.items ?? []).map((it) => (
                    <tr key={it.id || it.sku} className="hover:bg-muted/10">
                      <td className="p-2 font-mono font-medium text-emerald-600">{it.sku}</td>
                      <td className="p-2 text-muted-foreground">{it.description || '—'}</td>
                      <td className="p-2 text-right font-mono">{it.quantity}</td>
                      <td className="p-2 text-right font-mono">{money(it.unitCost)}</td>
                      <td className="p-2 text-right font-mono font-semibold">{money(it.subtotal)}</td>
                    </tr>
                  ))}
                  {(!purchase.items || purchase.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-muted-foreground">
                        No se encontraron ítems detallados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen Financiero y CxP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-muted/20 p-3 rounded-lg border space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <Warehouse className="h-3.5 w-3.5 text-emerald-600" />
                Impacto en Kardex y Contabilidad
              </div>
              <p className="text-muted-foreground text-[11px]">
                Operación 02: Compra Nacional valorizada al costo computable neto (sin IGV) bajo promedio ponderado.
              </p>
              {purchase.notes && (
                <p className="text-muted-foreground text-[11px] pt-1">
                  <span className="font-medium text-foreground">Glosa:</span> {purchase.notes}
                </p>
              )}
            </div>

            <div className="bg-muted/30 p-3 rounded-lg border space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (Neto):</span>
                <span>{money(purchase.netAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>IGV 18% (Crédito Fiscal):</span>
                <span>{money(purchase.igvAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t pt-1">
                <span>Total Factura:</span>
                <span className="text-emerald-600">{money(purchase.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Monto Pagado:</span>
                <span className="text-emerald-700">{money(purchase.paidAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1 text-amber-600">
                <span>Saldo Pendiente (CxP):</span>
                <span>{money(purchase.pendingAmount ?? purchase.totalAmount - (purchase.paidAmount ?? 0))}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {purchase.status !== 'PAGADA' && purchase.status !== 'ANULADA' && onRegisterPayment && (
            <Button
              onClick={() => {
                onClose();
                onRegisterPayment(purchase);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <DollarSign className="h-3.5 w-3.5" />
              Registrar Abono
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


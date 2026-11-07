import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
} from '@/components/ui';
import type { InventoryMovement } from '../types/inventory.types';

const money = (n: number) =>
  `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function MovementDetailModal({
  movement,
  onClose,
}: {
  movement: InventoryMovement | null;
  onClose: () => void;
}) {
  if (!movement) return null;
  const entrada = movement.direction === 'ENTRADA';

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle del movimiento {movement.movementNumber}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Fecha</p><p>{new Date(movement.movementDate).toLocaleString('es-PE')}</p></div>
          <div><p className="text-xs text-muted-foreground">Almacén</p><p>{movement.warehouseCode}</p></div>
          <div><p className="text-xs text-muted-foreground">Operación</p><p>{movement.operationTypeCode}</p></div>
          <div><p className="text-xs text-muted-foreground">Documento</p><p>{movement.documentSerial || ''}{movement.documentNumber ? `-${movement.documentNumber}` : '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">SKU</p><p className="font-mono">{movement.sku}</p></div>
          <div><p className="text-xs text-muted-foreground">Producto</p><p>{movement.description}</p></div>
          <div><p className="text-xs text-muted-foreground">Sentido</p><Badge variant={entrada ? 'outline' : 'destructive'}>{movement.direction}</Badge></div>
          <div><p className="text-xs text-muted-foreground">Cantidad</p><p>{movement.quantity}</p></div>
          <div><p className="text-xs text-muted-foreground">Costo unitario</p><p>{money(movement.unitCost)}</p></div>
          <div><p className="text-xs text-muted-foreground">Costo total</p><p>{money(movement.totalCost)}</p></div>
          <div><p className="text-xs text-muted-foreground">Stock anterior</p><p>{movement.previousStock}</p></div>
          <div><p className="text-xs text-muted-foreground">Stock resultante</p><p>{movement.resultingStock}</p></div>
          <div><p className="text-xs text-muted-foreground">Costo promedio resultante</p><p>{money(movement.resultingAverageCost)}</p></div>
          <div><p className="text-xs text-muted-foreground">Valor total resultante</p><p>{money(movement.resultingTotalValue)}</p></div>
          <div className="col-span-2"><p className="text-xs text-muted-foreground">Referencia de origen</p><p>{movement.sourceReferenceId || '—'}</p></div>
          <div className="col-span-2"><p className="text-xs text-muted-foreground">Notas</p><p>{movement.notes || '—'}</p></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

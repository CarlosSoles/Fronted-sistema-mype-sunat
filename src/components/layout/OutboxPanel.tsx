import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Badge } from '@/components/ui';
import {
  discardOperation,
  flushOutbox,
  listPendingOperations,
  retryOperation,
  type PendingOperation,
} from '@/lib/outbox';

const ETIQUETA: Record<PendingOperation['type'], string> = {
  ACCOUNTING_ENTRY: 'Asiento contable',
  INVOICE_EMISSION: 'Emisión de comprobante',
  PARTNER_CREATE: 'Alta de cliente/proveedor',
  DAILY_SUMMARY: 'Resumen diario',
};

export function OutboxPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [operaciones, setOperaciones] = useState<PendingOperation[]>([]);
  const [ocupado, setOcupado] = useState(false);

  const cargar = () => {
    void listPendingOperations().then(setOperaciones).catch(() => setOperaciones([]));
  };

  useEffect(() => {
    if (!open) return;
    cargar();
    window.addEventListener('outbox:changed', cargar);
    return () => window.removeEventListener('outbox:changed', cargar);
  }, [open]);

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setOcupado(true);
    try {
      await accion();
      cargar();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Operaciones pendientes</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button size="sm" variant="outline" disabled={ocupado} onClick={() => void ejecutar(() => flushOutbox(true))}>
            Sincronizar ahora
          </Button>
          {operaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay operaciones pendientes.</p>
          ) : (
            <ul className="space-y-2">
              {operaciones.map((op) => (
                <li key={op.id} className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{ETIQUETA[op.type]}</span>
                    <Badge variant={op.status === 'FAILED' ? 'destructive' : 'outline'}>
                      {op.status === 'FAILED' ? 'Conflicto' : 'Pendiente'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(op.createdAt).toLocaleString('es-PE')} · intento {op.attempts}
                  </p>
                  {op.lastError && <p className="text-xs text-destructive">{op.lastError}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" disabled={ocupado} onClick={() => void ejecutar(() => retryOperation(op.id))}>
                      Preparar reintento
                    </Button>
                    <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => void ejecutar(() => discardOperation(op.id))}>
                      Descartar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { Badge } from '@/components/ui';
import { flushOutbox, listPendingOperations } from '@/lib/outbox';

export function OutboxBadge() {
  const [pendientes, setPendientes] = useState(0);

  const refrescar = () => {
    void listPendingOperations().then((ops) => setPendientes(ops.length)).catch(() => setPendientes(0));
  };

  useEffect(() => {
    refrescar();
    window.addEventListener('outbox:changed', refrescar);
    window.addEventListener('online', refrescar);
    return () => {
      window.removeEventListener('outbox:changed', refrescar);
      window.removeEventListener('online', refrescar);
    };
  }, []);

  if (pendientes === 0) return null;

  return (
    <button
      type="button"
      onClick={() => void flushOutbox().then(refrescar)}
      title="Sincronizar operaciones pendientes"
      className="inline-flex"
    >
      <Badge variant="outline" className="gap-1 text-[10px]">
        <CloudUpload className="h-3 w-3" />
        {pendientes} pendiente(s)
      </Badge>
    </button>
  );
}

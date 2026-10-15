import { type CdrStatus } from '../types/invoice.types';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface CdrStatusBadgeProps {
  status: CdrStatus;
  codigo?: string;
}

export const CdrStatusBadge = ({ status, codigo }: CdrStatusBadgeProps) => {
  switch (status) {
    case 'ACEPTADO_SUNAT':
      return (
        <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Aceptado {codigo ? `(${codigo})` : ''}
        </Badge>
      );
    case 'EN_COLA_OUTBOX':
      return (
        <Badge variant="outline" className="gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse">
          <Clock className="h-3 w-3" />
          Buffer Outbox
        </Badge>
      );
    case 'FALLO_CRITICO':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          En Cola DLQ
        </Badge>
      );
    case 'RECHAZADO_SUNAT':
      return (
        <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <XCircle className="h-3 w-3" />
          Rechazado {codigo ? `(${codigo})` : ''}
        </Badge>
      );
    default:
      return <Badge variant="secondary">Desconocido</Badge>;
  }
};

import { type MatchStatus } from '../types/sire.types';
import { Badge } from '@/components/ui';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface Props {
  status: MatchStatus;
}

export const MatchStatusBadge = ({ status }: Props) => {
  switch (status) {
    case 'CONCILIADO':
      return (
        <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Conciliado
        </Badge>
      );
    case 'DISCREPANCIA':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Discrepancia
        </Badge>
      );
    case 'SOLO_SUNAT':
      return (
        <Badge variant="secondary" className="gap-1">
          <HelpCircle className="h-3 w-3" />
          Solo en SUNAT
        </Badge>
      );
    case 'SOLO_LOCAL':
      return (
        <Badge variant="outline" className="gap-1 border-blue-500/30 text-blue-600">
          <HelpCircle className="h-3 w-3" />
          Solo en ERP
        </Badge>
      );
    default:
      return <Badge variant="secondary">Pendiente</Badge>;
  }
};

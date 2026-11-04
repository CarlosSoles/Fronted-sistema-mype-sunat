import { Button } from '@/components/ui';
import { FilePlus } from 'lucide-react';

export type TipoEmision = 'Factura' | 'Boleta' | 'Nota';

interface InvoiceEmitMenuProps {
  abierto?: boolean;
  onToggle?: () => void;
  onEmitir: (tipo: TipoEmision) => void;
}

export const InvoiceEmitMenu = ({
  onToggle,
  onEmitir,
}: InvoiceEmitMenuProps) => {
  const handleEmitirComprobante = () => {
    if (onToggle) onToggle();
    if (onEmitir) onEmitir('Factura');
  };

  return (
    <Button size="sm" onClick={handleEmitirComprobante} className="gap-1.5">
      <FilePlus className="w-4 h-4" />
      <span>Emitir Comprobante</span>
    </Button>
  );
};
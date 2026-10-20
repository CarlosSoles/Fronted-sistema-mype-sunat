/**
 * Modal interactivo de emisión de comprobantes (M1).
 *
 * Captura los datos del CPE, muestra el resumen tributario calculado en tiempo
 * real y, al confirmar, devuelve el comprobante para la grilla. Los campos
 * viven en `InvoiceEmitCampos` y el resumen en `InvoiceEmitResumen`.
 */
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  PageText,
} from '@/components/ui';
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';
import { documentoClienteValido } from '../lib/invoiceEmitValidation';
import { borradorInicial, borradorAComprobante } from '../lib/invoiceEmitDraft';
import type { BorradorEmision } from '../lib/invoiceEmitDraft';
import { InvoiceEmitCampos } from './InvoiceEmitCampos';
import { InvoiceEmitResumen } from './InvoiceEmitResumen';

interface InvoiceEmitModalProps {
  tipoInicial: BorradorEmision['tipo'];
  fecha: string;
  onEmitir: (comprobante: ComprobanteDemo) => void;
  onCerrar: () => void;
}

/** Modal de emisión con resumen tributario en tiempo real. */
export const InvoiceEmitModal = ({
  tipoInicial,
  fecha,
  onEmitir,
  onCerrar,
}: InvoiceEmitModalProps) => {
  const [b, setB] = useState<BorradorEmision>(() =>
    borradorInicial(tipoInicial, fecha),
  );

  const docValido = documentoClienteValido(b.clienteDoc);
  const puedeEmitir = docValido && b.base > 0 && b.serie.length === 4;

  const actualizar = (parcial: Partial<BorradorEmision>) =>
    setB((previo) => ({ ...previo, ...parcial }));

  const confirmar = () => {
    if (!puedeEmitir) return;
    onEmitir(borradorAComprobante(b));
  };

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Emitir Comprobante Electrónico</DialogTitle>
          <PageText variant="caption">
            Los montos se calculan con el motor tributario UBL 2.1 del módulo.
          </PageText>
        </DialogHeader>

        <InvoiceEmitCampos borrador={b} actualizar={actualizar} />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={b.agenteRetencion}
            onChange={(e) => actualizar({ agenteRetencion: e.target.checked })}
          />
          Cliente es Agente de Retención del IGV (3%)
        </label>

        <InvoiceEmitResumen borrador={b} />

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button size="sm" onClick={confirmar} disabled={!puedeEmitir}>
            Emitir comprobante
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Modal interactivo de emisión de comprobantes (M1).
 *
 * Captura los datos del CPE, muestra el resumen tributario calculado en tiempo
 * real y, al confirmar, devuelve el comprobante para la grilla. Los campos
 * viven en `InvoiceEmitCampos` y el resumen en `InvoiceEmitResumen`.
 *
 * Cada validación se aplica también en `confirmar` y no solo deshabilitando el
 * botón: el usuario ve el motivo en pantalla y el envío nunca pasa por alto
 * una regla del Catálogo 01/06/09/10.
 */
import { useMemo, useState } from 'react';
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
import {
  documentoValidoParaTipo,
  mensajeErrorDocumento,
  type TipoEmisible,
} from '../lib/invoiceEmitValidation';
import {
  borradorInicial,
  borradorAComprobante,
  esTipoNota,
  siguienteCorrelativo,
} from '../lib/invoiceEmitDraft';
import type { BorradorEmision } from '../lib/invoiceEmitDraft';
import { InvoiceEmitCampos } from './InvoiceEmitCampos';
import { InvoiceEmitResumen } from './InvoiceEmitResumen';

interface InvoiceEmitModalProps {
  tipoInicial: TipoEmisible;
  fecha: string;
  /** Comprobantes ya emitidos: de aquí salen el correlativo y las notas. */
  existentes: readonly ComprobanteDemo[];
  onEmitir: (comprobante: ComprobanteDemo) => void;
  onCerrar: () => void;
}

/** Motivos por los que todavía no se puede emitir el comprobante. */
const motivosPendientes = (
  b: BorradorEmision,
  existentes: readonly ComprobanteDemo[],
): string[] => {
  const motivos: string[] = [];

  if (b.serie.length !== 4) motivos.push('La serie debe tener 4 caracteres.');
  if (!documentoValidoParaTipo(b.tipo, b.clienteDoc)) {
    motivos.push(mensajeErrorDocumento(b.tipo));
  }
  if (!Number.isFinite(b.base) || b.base <= 0) {
    motivos.push('El monto base imponible debe ser mayor que cero.');
  }
  if (b.formaPago === 'Credito' && b.numeroCuotas < 1) {
    motivos.push('Un pago al crédito necesita al menos una cuota.');
  }
  if (esTipoNota(b.tipo)) {
    if (!b.documentoAfectado.trim()) {
      motivos.push('Indica el documento afectado (ej. F001-0042).');
    } else if (
      !existentes.some(
        (c) =>
          c.estado !== 'RECHAZADO' &&
          c.id.toUpperCase() === b.documentoAfectado.trim().toUpperCase(),
      )
    ) {
      motivos.push(
        'El documento afectado no existe o está rechazado en esta serie.',
      );
    }
  }

  return motivos;
};

/** Modal de emisión con resumen tributario en tiempo real. */
export const InvoiceEmitModal = ({
  tipoInicial,
  fecha,
  existentes,
  onEmitir,
  onCerrar,
}: InvoiceEmitModalProps) => {
  const [b, setB] = useState<BorradorEmision>(() => {
    const inicial = borradorInicial(tipoInicial, fecha);
    return {
      ...inicial,
      correlativo: siguienteCorrelativo(existentes, inicial.serie),
    };
  });

  const pendientes = useMemo(
    () => motivosPendientes(b, existentes),
    [b, existentes],
  );
  const puedeEmitir = pendientes.length === 0;

  const actualizar = (parcial: Partial<BorradorEmision>) =>
    setB((previo) => {
      const siguiente = { ...previo, ...parcial };
      // El correlativo se recalcula cuando cambia la serie elegida.
      if (parcial.serie && parcial.serie !== previo.serie) {
        siguiente.correlativo = siguienteCorrelativo(
          existentes,
          parcial.serie,
        );
      }
      return siguiente;
    });

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
            El comprobante entra a la cola Outbox y sale con el CDR de SUNAT.
          </PageText>
        </DialogHeader>

        <InvoiceEmitCampos
          borrador={b}
          actualizar={actualizar}
          existentes={existentes}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={b.agenteRetencion}
            disabled={esTipoNota(b.tipo)}
            onChange={(e) => actualizar({ agenteRetencion: e.target.checked })}
          />
          Cliente es Agente de Retención del IGV (3%)
        </label>

        <InvoiceEmitResumen borrador={b} />

        {pendientes.length > 0 && (
          <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <PageText variant="label">Falta completar</PageText>
            {pendientes.map((motivo) => (
              <PageText key={motivo} variant="caption">
                · {motivo}
              </PageText>
            ))}
          </div>
        )}

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

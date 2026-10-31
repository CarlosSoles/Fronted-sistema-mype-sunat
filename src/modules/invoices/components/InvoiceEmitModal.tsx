/**
 * Modal interactivo de emisión de comprobantes (M1).
 *
 * Captura los datos del CPE —cabecera, grilla de ítems y cronograma de cuotas—,
 * muestra el resumen tributario calculado en tiempo real y, al confirmar,
 * devuelve el comprobante para la grilla. Los campos viven en
 * `InvoiceEmitCampos`, el detalle en `InvoiceItemsGrid` (TA-64), las cuotas en
 * `CreditInstallmentsEditor` y el resumen en `InvoiceEmitResumen`.
 *
 * Cada validación se aplica también en `confirmar` y no solo deshabilitando el
 * botón: el usuario ve el motivo en pantalla y el envío nunca pasa por alto una
 * regla del Catálogo 01/03/06/07/09/10/54.
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
  cambiarFormaPago,
  esTipoNota,
  nuevaClave,
  siguienteCorrelativo,
  totalesDelBorrador,
} from '../lib/invoiceEmitDraft';
import type { BorradorEmision } from '../lib/invoiceEmitDraft';
import {
  actualizarItem,
  agregarItem,
  eliminarItem,  itemBolsa,
  itemVacio,
  validarItems,
  type ItemBorrador,
} from '../lib/invoiceItems';
import {
  buscarDetraccion,
  esDetraccionDadaDeBaja,
  montoDetraccionPara,
  validarCronograma,
} from '../lib/invoiceDetraccion';
import { InvoiceEmitCampos } from './InvoiceEmitCampos';
import { InvoiceEmitResumen } from './InvoiceEmitResumen';
import { CreditInstallmentsEditor } from './CreditInstallmentsEditor';

interface InvoiceEmitModalProps {
  tipoInicial: TipoEmisible;
  fecha: string;
  /** Comprobantes ya emitidos: de aquí salen el correlativo y las notas. */
  existentes: readonly ComprobanteDemo[];
  onEmitir: (comprobante: ComprobanteDemo) => void;
  onCerrar: () => void;
}

/** Totales que necesita el flujo: importe total y neto pendiente de pago. */
const calcularFlujo = (b: BorradorEmision) => {
  const totales = totalesDelBorrador(b);
  const esNota = esTipoNota(b.tipo);
  const codigo = esNota ? undefined : b.codigoDetraccion;
  const detraccion = montoDetraccionPara(totales.total + totales.icbper, codigo);
  const importeTotal = totales.total + totales.icbper;
  return { importeTotal, detraccion, neto: importeTotal - detraccion };
};

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

  // Errores de la grilla de detalle: se nombran con el número de línea.
  for (const error of validarItems(b.items)) {
    const etiqueta =
      error.indice >= 0 ? `Línea ${error.indice + 1}` : 'Detalle';
    for (const motivo of error.motivos) {
      motivos.push(`${etiqueta}: ${motivo}`);
    }
  }

  const esNota = esTipoNota(b.tipo);
  const { importeTotal, neto } = calcularFlujo(b);

  if (!esNota && b.codigoDetraccion) {
    if (esDetraccionDadaDeBaja(b.codigoDetraccion)) {
      motivos.push(
        `El código de detracción ${b.codigoDetraccion} fue dado de baja por SUNAT.`,
      );
    } else if (!buscarDetraccion(b.codigoDetraccion)) {
      motivos.push(
        `El código de detracción ${b.codigoDetraccion} no existe en el Catálogo 54.`,
      );
    } else if (importeTotal <= 700) {
      motivos.push(
        'La detracción exige un importe mayor a S/ 700.00; este comprobante no la alcanza.',
      );
    }
    if (b.tipo !== '01') {
      motivos.push('La detracción SPOT solo se aplica a Facturas (01).');
    }
  }

  if (b.formaPago === 'Credito') {
    // Reglas 3319 y 3267, comprobadas antes de enviar.
    for (const error of validarCronograma(b.cuotas, neto, b.fecha).errores) {
      motivos.push(error);
    }
  }

  if (esNota) {
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

/** Modal de emisión con grilla de ítems, cuotas y resumen en tiempo real. */
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
  const flujo = calcularFlujo(b);

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

  const cambiarItem = (indice: number, parcial: Partial<ItemBorrador>) =>
    setB((previo) => ({
      ...previo,
      items: actualizarItem(previo.items, indice, parcial),
    }));

  const quitarItem = (indice: number) =>
    setB((previo) => ({
      ...previo,
      items: eliminarItem(previo.items, indice),
    }));

  const nuevoItem = () =>
    setB((previo) => ({
      ...previo,
      items: agregarItem(previo.items, itemVacio(nuevaClave())),
    }));

  const nuevaBolsa = () =>
    setB((previo) => {
      const cantidad = previo.bolsas > 0 ? previo.bolsas : 1;
      return {
        ...previo,
        items: agregarItem(previo.items, itemBolsa(nuevaClave(), cantidad)),
      };
    });

  const confirmar = () => {
    if (!puedeEmitir) return;
    onEmitir(borradorAComprobante(b));
  };

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
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
          total={flujo.importeTotal}
          onItemCambiado={cambiarItem}
          onItemEliminado={quitarItem}
          onItemAgregado={nuevoItem}
          onBolsaAgregada={nuevaBolsa}
        />

        <div className="flex flex-wrap items-center gap-2">
          <PageText variant="label">Forma de pago</PageText>
          {(['Contado', 'Credito'] as const).map((forma) => (
            <Button
              key={forma}
              type="button"
              variant={b.formaPago === forma ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setB((previo) =>
                  cambiarFormaPago(previo, forma, flujo.neto),
                )
              }
            >
              {forma === 'Credito' ? 'Crédito' : 'Contado'}
            </Button>
          ))}
        </div>

        {b.formaPago === 'Credito' && (
          <CreditInstallmentsEditor
            cuotas={b.cuotas}
            netoPendiente={flujo.neto}
            fechaEmision={b.fecha}
            onCambiar={(cuotas) => setB((previo) => ({ ...previo, cuotas }))}
          />
        )}

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

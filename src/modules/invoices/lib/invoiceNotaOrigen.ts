/**
 * Regla de la Nota de Crédito y de Débito sobre un comprobante existente (M1).
 *
 * LO QUE DIJO EL DOCENTE (31-10, parte 1)
 *
 *   "La nota de crédito es cuando va a haber alguna devolución... Pero es sobre
 *    el documento que ya está, o sea, no empiezas haciendo una nota de crédito.
 *    Entonces, tú hay que replantearlo."
 *
 * Y en la recapitulación: "es sobre el documento que ya está, no empiezas
 * haciendo una nota de crédito".
 *
 * El modal ya dejaba escribir un «Documento afectado» y avisaba cuando no
 * existía, pero el aviso era solo eso: un texto rojo. Nada impedía pulsar
 * «Emitir» con el campo vacío o con un número inventado, así que el flujo que el
 * docente objetó seguía siendo posible.
 *
 * Por qué es un módulo aparte: la regla tiene dos partes que conviene probar sin
 * montar React —qué documentos son elegibles y qué bloquea la emisión—, y el
 * modal ya está en el límite de líneas del proyecto.
 */
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';
import type { BorradorEmision } from './invoiceEmitDraft';

/** Estructura mínima para decidir si un comprobante puede recibir una nota. */
type ComprobanteElegible = Pick<
  ComprobanteDemo,
  'id' | 'tipo' | 'estado' | 'clienteRuc' | 'fechaEmision'
>;

/**
 * ¿Este comprobante admite una nota de crédito o débito?
 *
 * Tres condiciones, cada una por un motivo distinto:
 *
 *  - **No es una nota.** Una nota que modifica otra nota es un caso que SUNAT
 *    admite pero que este módulo no emite: se cambiaría algo que ya modificó un
 *    documento anterior y el saldo se volvería difícil de seguir.
 *  - **No está rechazado.** Un comprobante que SUNAT no aceptó no existe
 *    fiscalmente; una nota sobre él sería un documento huérfano.
 *
 * (La anulación se gestiona por la comunicación de baja, no por un estado
 * propio: un comprobante dado de baja deja de listarse, así que aquí no hay un
 * estado "ANULADO" que comprobar.)
 */
export const admiteNota = (comprobante: ComprobanteElegible): boolean => {
  if (comprobante.tipo === '07' || comprobante.tipo === '08') return false;
  if (comprobante.estado === 'RECHAZADO') return false;
  return true;
};

/**
 * Comprobantes que el usuario puede elegir para afectar con una nota.
 *
 * Se ordenan del más reciente al más antiguo: lo normal es devolver la última
 * venta, no la de hace tres meses.
 */
export const comprobantesElegibles = (
  existentes: readonly ComprobanteElegible[],
): readonly ComprobanteElegible[] =>
  existentes
    .filter(admiteNota)
    .slice()
    .sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));

/**
 * Busca el comprobante que la nota va a modificar.
 *
 * La comparación ignora mayúsculas y espacios porque el usuario escribe
 * "f001-00000042" en el mostrador; el número fiscal es el mismo.
 */
export const buscarAfectado = (
  existentes: readonly ComprobanteElegible[],
  numero: string,
): ComprobanteElegible | undefined => {
  const buscado = numero.trim().toUpperCase();
  if (!buscado) return undefined;

  return existentes.find((c) => c.id.trim().toUpperCase() === buscado);
};

/** Problema que impide emitir una nota, con el texto para mostrarlo. */
export interface ProblemaNota {
  /** Campo del formulario al que corresponde el problema. */
  campo: 'documentoAfectado' | 'motivo' | 'monto';
  mensaje: string;
}

/**
 * Revisa si la nota se puede emitir.
 *
 * Devuelve la lista de problemas en el orden en que el usuario debería
 * corregirlos: primero el documento, después el motivo y por último el importe.
 *
 * El último control es el que evita el descuadre más caro: una nota de crédito
 * que devuelve más de lo que costó el comprobante original. SUNAT la acepta
 * (solo mira que el documento relacionado exista) pero el saldo del cliente
 * queda negativo y el cuadre de ventas deja de cerrar.
 */
export const problemasDeNota = (
  borrador: BorradorEmision,
  existentes: readonly ComprobanteElegible[],
  totalNota: number,
): readonly ProblemaNota[] => {
  const problemas: ProblemaNota[] = [];

  const referencia = borrador.documentoAfectado.trim();

  if (!referencia) {
    return [
      {
        campo: 'documentoAfectado',
        mensaje:
          'Una nota se emite sobre un comprobante existente: elija el documento ' +
          'que va a modificar. No se empieza por la nota.',
      },
    ];
  }

  const afectado = buscarAfectado(existentes, referencia);

  if (!afectado) {
    problemas.push({
      campo: 'documentoAfectado',
      mensaje: `No existe el comprobante ${referencia} en esta empresa.`,
    });
    return problemas;
  }

  if (!admiteNota(afectado)) {
    problemas.push({
      campo: 'documentoAfectado',
      mensaje:
        afectado.tipo === '07' || afectado.tipo === '08'
          ? `${referencia} ya es una nota: elija la factura o boleta original.`
          : `${referencia} está ${afectado.estado.toLowerCase()}: no admite notas.`,
    });
  }

  // El documento afectado y la nota tienen que ser del MISMO cliente. Esta es
  // una regla de SUNAT (el XML lleva el mismo adquirente) y, sobre todo, evita
  // devolverle dinero a quien no compró.
  const docCliente = borrador.clienteDoc.replace(/\D/g, '');
  const docAfectado = afectado.clienteRuc.replace(/\D/g, '');

  if (docCliente && docAfectado && docCliente !== docAfectado) {
    problemas.push({
      campo: 'documentoAfectado',
      mensaje:
        `El comprobante ${referencia} es de otro cliente ` +
        `(${afectado.clienteRuc}). La nota debe emitirse a nombre de quien compró.`,
    });
  }

  if (!borrador.motivoCodigo.trim()) {
    problemas.push({
      campo: 'motivo',
      mensaje:
        'Indique el motivo de la nota (Catálogo 09): sin código, SUNAT la rechaza.',
    });
  }

  if (!(totalNota > 0)) {
    problemas.push({
      campo: 'monto',
      mensaje: 'La nota no puede emitirse con importe cero.',
    });
  }

  return problemas;
};

/**
 * ¿La nota se puede emitir sin problemas?
 *
 * Atajo para el botón «Emitir» del modal, que necesita la respuesta en una
 * expresión booleana.
 */
export const notaSePuedeEmitir = (
  borrador: BorradorEmision,
  existentes: readonly ComprobanteElegible[],
  totalNota: number,
): boolean => problemasDeNota(borrador, existentes, totalNota).length === 0;

/**
 * Generación y descarga del XML UBL 2.1 del comprobante (M1).
 *
 * Construye el documento con la misma estructura que exige SUNAT: extensión
 * UBLExtensions, firma referenciada, parties, términos de pago con cuotas,
 * impuestos y totales. Las Notas de Crédito (07) y de Débito (08) usan sus
 * propias etiquetas raíz y nodos de línea.
 *
 * TA-64 corrige tres defectos que hacían que este XML no sirviera para presentar
 * ante SUNAT, y que se ven comparando con el generador del backend:
 *
 *  1. El cronograma se emitía como `<cac:PaymentMeans>`. La UBL pide
 *     `<cac:PaymentTerms>` con `PaymentMeansID = 'Cuota'`; así lo comparan las
 *     reglas 3319 y 3267 de la hoja oficial.
 *  2. La cabecera de forma de pago no llevaba `<cbc:Amount>`, así que el lado
 *     izquierdo de la regla 3319 valía 0 y TODA factura al crédito caía.
 *  3. El `TaxSubtotal` declaraba siempre 18 % e IGV `1000`, aun con líneas
 *     exoneradas o inafectas, y la leyenda 2006 de la detracción no existía.
 */
import type { ComprobanteDemo, ItemDemo } from '../data/invoiceDemoTypes';
import { RUC_EMISOR, EMPRESA_EMISORA } from './invoiceExportConstants';
import { bloqueFirma, bloqueLineas, esc } from './invoiceExportXmlNodes';
import { repartirEnCuotas } from './invoiceDetraccion';

/** Redondea a céntimos sin arrastrar error de coma flotante. */
const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Importe de una línea: cantidad por valor unitario, salvo las gratuitas. */
export const importeLinea = (item: ItemDemo): number =>
  item.afectacion === 'GRATUITA' ? 0 : r2(item.cantidad * item.valorUnitario);

/** Importe en letras que acompaña al comprobante (Leyenda 1000). */
export interface LetrasComprobante {
  /** Texto ya convertido, por ejemplo "SON: MIL ... SOLES". */
  texto: string;
}

/** Desglose tributario que necesita el XML. */
export interface DesgloseXml {
  gravado: number;
  igv: number;
  exonerado: number;
  inafecto: number;
  /** Importe de la detracción en soles enteros. */
  detraccion: number;
  /** Importe en letras para la leyenda 2006 (solo con detracción). */
  letrasDetraccion?: string;
  /** Cuenta del Banco de la Nación para el depósito. */
  cuentaBancoNacion?: string;
}

/** Calcula el desglose tributario a partir de las líneas del comprobante. */
export const desglosar = (
  c: ComprobanteDemo,
  letras?: LetrasComprobante,
): DesgloseXml => {
  let gravado = 0;
  let exonerado = 0;
  let inafecto = 0;

  for (const item of c.items) {
    const importe = importeLinea(item);
    if (item.afectacion === 'GRAVADA') gravado += importe;
    else if (item.afectacion === 'EXONERADA') exonerado += importe;
    else if (item.afectacion === 'INAFECTA') inafecto += importe;
  }

  return {
    gravado: r2(gravado),
    igv: r2(gravado * 0.18),
    exonerado: r2(exonerado),
    inafecto: r2(inafecto),
    detraccion: c.detraccion,
    letrasDetraccion: c.detraccion > 0 ? letras?.texto : undefined,
    cuentaBancoNacion: c.detraccion > 0 ? '00019123456' : undefined,
  };
};

/** Bloque de cuotas del cronograma al crédito (reglas 3267 y 3319). */
const bloqueCuotas = (c: ComprobanteDemo): string => {
  if (c.formaPago !== 'Credito' || c.cuotas.length === 0) return '';

  return c.cuotas
    .map(
      (cuota) => `  <cac:PaymentTerms>
    <cbc:ID>${esc(cuota.numero)}</cbc:ID>
    <cbc:PaymentMeansID>Cuota</cbc:PaymentMeansID>
    <cbc:Amount currencyID="${c.moneda}">${cuota.monto.toFixed(2)}</cbc:Amount>
    <cbc:PaymentDueDate>${cuota.vencimiento}</cbc:PaymentDueDate>
  </cac:PaymentTerms>`,
    )
    .join('\n');
};

/** Nodo de nota vinculada para 07 y 08. */
const bloqueReferencia = (c: ComprobanteDemo): string => {
  if (!c.documentoAfectado) return '';

  const codigo = c.motivoNota?.codigo ?? '01';
  const descripcion = c.motivoNota?.descripcion ?? 'Anulación de la operación';

  return `  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${esc(c.documentoAfectado)}</cbc:ReferenceID>
    <cbc:ResponseCode>${esc(codigo)}</cbc:ResponseCode>
    <cbc:Description>${esc(descripcion)}</cbc:Description>
  </cac:DiscrepancyResponse>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${esc(c.documentoAfectado)}</cbc:ID>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>`;
};

/** Subtotal de impuesto para una afectación con su tributo y su tasa. */
const subtotal = (
  moneda: string,
  base: number,
  igv: number,
  tributo: string,
  nombre: string,
  tasa: string,
): string => `    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${moneda}">${base.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${moneda}">${igv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID schemeID="UN/ECE 5305">S</cbc:ID>
        <cbc:Percent>${tasa}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>${tributo}</cbc:ID>
          <cbc:Name>${nombre}</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;

/** Bloque `TaxTotal` con un subtotal por afectación presente. */
const bloqueImpuestos = (c: ComprobanteDemo, d: DesgloseXml): string => {
  const partes = [
    subtotal(c.moneda, d.gravado, d.igv, '1000', 'IGV', '18.00'),
  ];

  // Exoneradas e inafectas llevan su propio tributo con tasa 0. Declararlas
  // como IGV 1000 es lo que hacía antes este archivo y es un error de fondo.
  if (d.exonerado > 0) {
    partes.push(subtotal(c.moneda, d.exonerado, 0, '9997', 'EXO', '0.00'));
  }
  if (d.inafecto > 0) {
    partes.push(subtotal(c.moneda, d.inafecto, 0, '9998', 'INA', '0.00'));
  }

  return `  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${c.moneda}">${d.igv.toFixed(2)}</cbc:TaxAmount>
${partes.join('\n')}
  </cac:TaxTotal>`;
};

/** Leyendas del comprobante: 1000 (importe en letras) y 2006 (detracción). */
const bloqueLeyendas = (d: DesgloseXml, letras?: LetrasComprobante): string => {
  const lineas: string[] = [];
  if (letras?.texto) {
    lineas.push(`  <cbc:Note languageLocaleID="1000">${esc(letras.texto)}</cbc:Note>`);
  }
  // Regla 4265: obligatoria cuando la operación lleva detracción.
  if (d.letrasDetraccion) {
    lineas.push(
      `  <cbc:Note languageLocaleID="2006">${esc(d.letrasDetraccion)}</cbc:Note>`,
    );
  }
  return lineas.join('\n');
};

/**
 * Cronograma recalculado sobre el neto real de las líneas.
 *
 * BUG corregido en TA-64: la cabecera del XML tomaba el neto calculado de las
 * líneas (1090.00) mientras las cuotas venían generadas en `construir()` sobre
 * `totalNeto`, un campo que suma la base y el IGV de la CABECERA del
 * comprobante de demostración y no sus líneas (1262.60). Con una sola línea los
 * dos números coincidían por casualidad; con detalle multi-ítem, exoneradas o
 * gratuitas divergen, y el XML habría incumplido la regla 3319 aunque el
 * formulario avisara de lo contrario.
 *
 * Se recalcula aquí, sin tocar el objeto del comprobante, para que el XML sea
 * coherente consigo mismo: cabecera, cuotas y `PayableAmount` sobre el mismo
 * neto.
 */
export const cuotasParaXml = (
  c: ComprobanteDemo,
  netoPendiente: number,
): ComprobanteDemo['cuotas'] => {
  if (c.formaPago !== 'Credito') return [];
  const numero = Math.max(1, c.cuotas.length);
  return repartirEnCuotas(netoPendiente, numero, c.fechaEmision);
};

/** Genera el XML UBL 2.1 completo del comprobante. */
export const generarXmlUbl21Comprobante = (
  c: ComprobanteDemo,
  letras?: LetrasComprobante,
): string => {
  const raiz =
    c.tipo === '07' ? 'CreditNote' : c.tipo === '08' ? 'DebitNote' : 'Invoice';
  const numeroSerie = `${c.serie}-${String(c.correlativo).padStart(4, '0')}`;
  const desglose = desglosar(c, letras);
  const base = r2(desglose.gravado + desglose.exonerado + desglose.inafecto);
  const totalConIgv = r2(base + desglose.igv);
  const esCredito = c.formaPago === 'Credito';

  // Regla 3319: el `Amount` de la cabecera y la suma de las cuotas tienen que
  // ser EXACTAMENTE el mismo número: base + IGV − detracción.
  const netoCredito = esCredito
    ? r2(totalConIgv - desglose.detraccion)
    : undefined;

  // El cronograma se recalcula sobre ese mismo neto, no se reutiliza el del
  // comprobante demo.
  const comprobanteParaCuotas: ComprobanteDemo = {
    ...c,
    cuotas: esCredito
      ? cuotasParaXml(c, netoCredito ?? totalConIgv)
      : [],
  };

  const detraccion = desglose.detraccion > 0
    ? `  <cac:PaymentMeans>
    <cbc:ID>Detraccion</cbc:ID>${
      desglose.cuentaBancoNacion
        ? `\n    <cbc:PaymentDestinationAccountID>${esc(desglose.cuentaBancoNacion)}</cbc:PaymentDestinationAccountID>`
        : ''
    }
  </cac:PaymentMeans>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<${raiz} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${raiz}-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
${bloqueFirma(c.hashCpe)}
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${esc(numeroSerie)}</cbc:ID>
  <cbc:IssueDate>${c.fechaEmision}</cbc:IssueDate>
  <cbc:IssueTime>10:00:00</cbc:IssueTime>
  <cbc:${raiz}TypeCode listID="${c.tipoOperacion}">${c.tipo}</cbc:${raiz}TypeCode>
${bloqueLeyendas(desglose, letras)}
  <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha">${c.moneda}</cbc:DocumentCurrencyCode>
${bloqueReferencia(c)}
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${RUC_EMISOR}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(EMPRESA_EMISORA)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${c.clienteTipoDoc}">${esc(c.clienteRuc)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(c.clienteRazonSocial)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentTerms>
    <cbc:ID>FormaPago</cbc:ID>
    <cbc:PaymentMeansID>${esCredito ? 'Credito' : 'Contado'}</cbc:PaymentMeansID>${
      netoCredito !== undefined
        ? `\n    <cbc:Amount currencyID="${c.moneda}">${netoCredito.toFixed(2)}</cbc:Amount>`
        : ''
    }
  </cac:PaymentTerms>
${bloqueCuotas(comprobanteParaCuotas)}${detraccion ? `\n${detraccion}` : ''}
${bloqueImpuestos(c, desglose)}
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${c.moneda}">${base.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${c.moneda}">${totalConIgv.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${c.moneda}">${r2(totalConIgv - desglose.detraccion).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${bloqueLineas(c)}
</${raiz}>`;
};

/** Nombre oficial del archivo XML que exige SUNAT. */
export const nombreArchivoXml = (c: ComprobanteDemo): string =>
  `${RUC_EMISOR}-${c.tipo}-${c.serie}-${c.correlativo}.xml`;

/** Descarga el XML del comprobante con el nombre oficial. */
export const descargarXmlComprobante = (
  c: ComprobanteDemo,
  letras?: LetrasComprobante,
): void => {
  const blob = new Blob([generarXmlUbl21Comprobante(c, letras)], {
    type: 'application/xml;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivoXml(c);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
};

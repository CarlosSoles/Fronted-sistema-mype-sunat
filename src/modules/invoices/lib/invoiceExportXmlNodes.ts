/**
 * Nodos XML de firma y líneas de detalle del comprobante UBL 2.1 (M1).
 *
 * Se aíslan de `invoiceExportXml.ts` para mantener ambos archivos por debajo
 * del límite de líneas.
 *
 * TA-64 corrige dos defectos de la línea de detalle:
 *
 *  1. `LineExtensionAmount` se calculaba como `cantidad * valorUnitario` también
 *     en las gratuitas. La regla 3278 exige cero: el importe de catálogo va como
 *     precio referencial, pero la línea no se cobra.
 *  2. El `TaxTotal` de la línea era siempre `0.00` y no declaraba tributo. Una
 *     factura gravada con IGV 18 en la cabecera y 0 en cada línea es una
 *     incoherencia que SUNAT rechaza.
 */
import type { ComprobanteDemo, ItemDemo } from '../data/invoiceDemoTypes';
import { identidadEmisora } from './invoiceExportConstants';

/** Escapa los caracteres reservados del XML. */
export const esc = (valor: string): string =>
  valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Bloque de firma digital XMLDSig referenciada. */
export const bloqueFirma = (hashCpe: string): string => {
  const sujeto = esc(identidadEmisora().razonSocial);
  return `  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <ds:Signature Id="SignatureSP">
          <ds:SignedInfo>
            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
            <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
          </ds:SignedInfo>
          <ds:SignatureValue>${esc(hashCpe)}</ds:SignatureValue>
          <ds:KeyInfo>
            <ds:X509Data>
              <ds:X509SubjectName>CN=${sujeto}, O=${sujeto}, C=PE</ds:X509SubjectName>
            </ds:X509Data>
          </ds:KeyInfo>
        </ds:Signature>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>`;
};

/** Etiqueta de línea según el tipo de comprobante. */
const etiquetaLinea = (tipo: ComprobanteDemo['tipo']): string =>
  tipo === '07'
    ? 'cac:CreditNoteLine'
    : tipo === '08'
      ? 'cac:DebitNoteLine'
      : 'cac:InvoiceLine';

/** Etiqueta de cantidad según el tipo de comprobante. */
const etiquetaCantidad = (tipo: ComprobanteDemo['tipo']): string =>
  tipo === '07'
    ? 'cbc:CreditedQuantity'
    : tipo === '08'
      ? 'cbc:DebitedQuantity'
      : 'cbc:InvoicedQuantity';

/** Catálogo 07 → tributo, nombre, tasa y código de exoneración. */
export const TRIBUTO_POR_AFECTACION: Record<
  ItemDemo['afectacion'],
  { tributo: string; nombre: string; tasa: string; motivo?: string }
> = {
  GRAVADA: { tributo: '1000', nombre: 'IGV', tasa: '18.00' },
  EXONERADA: { tributo: '9997', nombre: 'EXO', tasa: '0.00', motivo: '20' },
  INAFECTA: { tributo: '9998', nombre: 'INA', tasa: '0.00', motivo: '30' },
  GRATUITA: { tributo: '1000', nombre: 'IGV', tasa: '18.00' },
};

/** Bloque `TaxTotal` de una línea con su tributo real. */
const impuestoLinea = (
  moneda: string,
  item: ItemDemo,
  igv: number,
  base: number,
): string => {
  const t = TRIBUTO_POR_AFECTACION[item.afectacion];

  // La gratuita declara el IGV referencial que se habría generado.
  const monto = item.afectacion === 'GRATUITA' ? base * 0.18 : igv;

  return `    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${moneda}">${monto.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${moneda}">${base.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${moneda}">${monto.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>${
          t.motivo
            ? `\n          <cbc:TaxExemptionReasonCode>${t.motivo}</cbc:TaxExemptionReasonCode>`
            : ''
        }
          <cac:TaxScheme>
            <cbc:ID>${t.tributo}</cbc:ID>
            <cbc:Name>${t.nombre}</cbc:Name>
            <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>`;
};

/** Bloque de líneas de detalle del comprobante. */
export const bloqueLineas = (c: ComprobanteDemo): string => {
  const tag = etiquetaLinea(c.tipo);
  const tagCantidad = etiquetaCantidad(c.tipo);

  return c.items
    .map((item, index) => {
      const valorCatálogo = Math.round(item.cantidad * item.valorUnitario * 100) / 100;
      const esGratuita = item.afectacion === 'GRATUITA';

      // Regla 3278: la línea gratuita se declara con importe cero.
      const extension = esGratuita ? 0 : valorCatálogo;
      const base = extension;
      const igv = item.afectacion === 'GRAVADA' ? base * 0.18 : 0;

      const precioGratis = esGratuita
        ? `
      <cbc:PriceTypeCode>02</cbc:PriceTypeCode>`
        : '';

      return `  <${tag}>
    <cbc:ID>${index + 1}</cbc:ID>
    <${tagCantidad} unitCode="${item.unidad}">${item.cantidad}</${tagCantidad}>
    <cbc:LineExtensionAmount currencyID="${c.moneda}">${extension.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="${c.moneda}">${(esGratuita ? 0 : item.valorUnitario).toFixed(2)}</cbc:PriceAmount>${precioGratis}
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
${impuestoLinea(c.moneda, item, Math.round(igv * 100) / 100, base)}
    <cac:Item>
      <cbc:Description>${esc(item.descripcion)}</cbc:Description>${item.codigo ? `\n      <cac:SellersItemIdentification>
        <cbc:ID>${esc(item.codigo)}</cbc:ID>
      </cac:SellersItemIdentification>` : ''}
    </cac:Item>
  </${tag}>`;
    })
    .join('\n');
};

/**
 * Nodos XML de firma y líneas de detalle del comprobante UBL 2.1 (M1).
 *
 * Se aíslan de `invoiceExportXml.ts` para mantener ambos archivos por debajo
 * del límite de líneas.
 */
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';
import { EMPRESA_EMISORA } from './invoiceExportConstants';

/** Escapa los caracteres reservados del XML. */
export const esc = (valor: string): string =>
  valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Bloque de firma digital XMLDSig referenciada. */
export const bloqueFirma = (hashCpe: string): string => `  <ext:UBLExtensions>
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
              <ds:X509SubjectName>CN=${esc(EMPRESA_EMISORA)}, O=${esc(EMPRESA_EMISORA)}, C=PE</ds:X509SubjectName>
            </ds:X509Data>
          </ds:KeyInfo>
        </ds:Signature>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>`;

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

/** Bloque de líneas de detalle del comprobante. */
export const bloqueLineas = (c: ComprobanteDemo): string => {
  const tag = etiquetaLinea(c.tipo);
  const tagCantidad = etiquetaCantidad(c.tipo);

  return c.items
    .map((item, index) => {
      const extension = (item.cantidad * item.valorUnitario).toFixed(2);
      return `  <${tag}>
    <cbc:ID>${index + 1}</cbc:ID>
    <${tagCantidad} unitCode="${item.unidad}">${item.cantidad}</${tagCantidad}>
    <cbc:LineExtensionAmount currencyID="${c.moneda}">${extension}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="${c.moneda}">${item.valorUnitario.toFixed(2)}</cbc:PriceAmount>
        <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${c.moneda}">0.00</cbc:TaxAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description>${esc(item.descripcion)}</cbc:Description>
    </cac:Item>
  </${tag}>`;
    })
    .join('\n');
};

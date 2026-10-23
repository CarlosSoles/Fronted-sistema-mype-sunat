/**
 * Generación y descarga del XML UBL 2.1 del comprobante (M1).
 *
 * Construye el documento con la misma estructura que exige SUNAT: extensión
 * UBLExtensions, firma referenciada, parties, términos de pago con cuotas,
 * impuestos y totales. Las Notas de Crédito (07) y de Débito (08) usan sus
 * propias etiquetas raíz y nodos de línea.
 */
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';
import { RUC_EMISOR, EMPRESA_EMISORA } from './invoiceExportConstants';
import { bloqueFirma, bloqueLineas, esc } from './invoiceExportXmlNodes';

/** Bloque de cuotas del cronograma al crédito. */
const bloqueCuotas = (c: ComprobanteDemo): string => {
  if (c.formaPago !== 'Credito' || c.cuotas.length === 0) return '';

  return c.cuotas
    .map(
      (cuota) => `  <cac:PaymentMeans>
    <cbc:ID>${esc(cuota.numero)}</cbc:ID>
    <cbc:Amount currencyID="${c.moneda}">${cuota.monto.toFixed(2)}</cbc:Amount>
    <cbc:PaymentDueDate>${cuota.vencimiento}</cbc:PaymentDueDate>
  </cac:PaymentMeans>`,
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

/** Genera el XML UBL 2.1 completo del comprobante. */
export const generarXmlUbl21Comprobante = (c: ComprobanteDemo): string => {
  const raiz =
    c.tipo === '07' ? 'CreditNote' : c.tipo === '08' ? 'DebitNote' : 'Invoice';
  const numeroSerie = `${c.serie}-${String(c.correlativo).padStart(4, '0')}`;
  const formaPago = c.formaPago === 'Credito' ? 'Credito' : 'Contado';
  const totalConIgv = (c.baseImponible + c.igv).toFixed(2);

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
  <cbc:Note languageLocaleID="1000">SON: IMPORTE EN LETRAS PENDIENTE</cbc:Note>
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
    <cbc:PaymentMeansID>${formaPago}</cbc:PaymentMeansID>
  </cac:PaymentTerms>
${bloqueCuotas(c)}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${c.moneda}">${c.igv.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${c.moneda}">${c.baseImponible.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${c.moneda}">${c.igv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID schemeID="UN/ECE 5305">S</cbc:ID>
        <cbc:Percent>18.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${c.moneda}">${c.baseImponible.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${c.moneda}">${totalConIgv}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${c.moneda}">${c.totalNeto.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${bloqueLineas(c)}
</${raiz}>`;
};

/** Nombre oficial del archivo XML que exige SUNAT. */
export const nombreArchivoXml = (c: ComprobanteDemo): string =>
  `${RUC_EMISOR}-${c.tipo}-${c.serie}-${c.correlativo}.xml`;

/** Descarga el XML del comprobante con el nombre oficial. */
export const descargarXmlComprobante = (c: ComprobanteDemo): void => {
  const blob = new Blob([generarXmlUbl21Comprobante(c)], {
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

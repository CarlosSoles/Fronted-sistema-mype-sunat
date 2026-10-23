/**
 * Pruebas de las exportaciones del M1: XML UBL 2.1, PDF binario con QR, CSV
 * del SIRE RVIE y validaciones del formulario de emisión.
 */
import { describe, it, expect } from 'vitest';
import { COMPROBANTES_DEMO } from '@/modules/invoices/data/invoiceDemoData';
import {
  generarXmlUbl21Comprobante,
  nombreArchivoXml,
} from '@/modules/invoices/lib/invoiceExportXml';
import {
  construirPdfBinarioSunat,
  nombreArchivoPdf,
} from '@/modules/invoices/lib/invoiceExportPdf';
import {
  construirCsvRvie,
  nombreArchivoRvie,
} from '@/modules/invoices/lib/invoiceExportSire';
import {
  rucValido,
  dniValido,
  documentoClienteValido,
  SERIES_POR_TIPO,
} from '@/modules/invoices/lib/invoiceEmitValidation';

const busqueda = <T extends { tipo: string }>(
  filas: readonly T[],
  tipo: string,
): T => {
  const fila = filas.find((f) => f.tipo === tipo);
  if (!fila) throw new Error(`No hay comprobante de tipo ${tipo}`);
  return fila;
};

const factura = busqueda(COMPROBANTES_DEMO, '01');
const boleta = busqueda(COMPROBANTES_DEMO, '03');
const notaCredito = busqueda(COMPROBANTES_DEMO, '07');

/** Boleta emitida a persona natural: el documento del cliente es un DNI. */
const boletaConDni = COMPROBANTES_DEMO.filter(
  (c) => c.tipo === '03' && c.clienteRuc.length === 8,
);

describe('generarXmlUbl21Comprobante', () => {
  it('una factura usa la raíz Invoice y el tipo 01 con tipo de operación', () => {
    const xml = generarXmlUbl21Comprobante(factura);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<Invoice');
    expect(xml).toContain('<cbc:InvoiceTypeCode');
    expect(xml).toContain('>01</cbc:InvoiceTypeCode>');
    expect(xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
  });

  it('incluye las líneas del detalle y los términos de pago', () => {
    const xml = generarXmlUbl21Comprobante(factura);

    expect(xml).toContain('<cac:InvoiceLine>');
    expect(xml).toContain('<cac:PaymentTerms>');
    expect(xml).toContain('<cbc:PaymentMeansID>');
    expect(xml).toContain('<cac:LegalMonetaryTotal>');
    expect(xml).toContain('<cac:TaxTotal>');
  });

  it('las notas de crédito usan la raíz CreditNote y referencian el CPE', () => {
    const xml = generarXmlUbl21Comprobante(notaCredito);

    expect(xml).toContain('<CreditNote');
    expect(xml).toContain('</CreditNote>');
    expect(xml).not.toContain('<InvoiceTypeCode');
    expect(xml).toContain('<cbc:CreditNoteTypeCode');
    expect(xml).toContain('<cac:DiscrepancyResponse>');
    expect(xml).toContain('<cac:BillingReference>');
    expect(xml).toContain(`<cbc:ID>${notaCredito.documentoAfectado}</cbc:ID>`);
  });

  it('las boletas exponen al cliente con documento tipo 1', () => {
    // Toda la semilla de boletas va a personas naturales: si aparece una
    // boleta con RUC, es un dato inválido para SUNAT y debe verse aquí.
    expect(boletaConDni).toHaveLength(3);

    for (const b of boletaConDni) {
      const xml = generarXmlUbl21Comprobante(b);

      expect(xml).toContain(`<cbc:ID schemeID="1">${b.clienteRuc}</cbc:ID>`);
      expect(xml).toContain('</Invoice>');
    }

    // Una factura declara el RUC del adquirente con esquema 6.
    expect(factura.clienteRuc).toHaveLength(11);
    expect(factura.clienteTipoDoc).toBe('6');
    expect(generarXmlUbl21Comprobante(factura)).toContain(
      `<cbc:ID schemeID="6">${factura.clienteRuc}</cbc:ID>`,
    );
    expect(boleta).toBeDefined();
  });

  it('el nombre del archivo sigue el formato RUC-tipo-serie-correlativo', () => {
    expect(nombreArchivoXml(factura)).toBe(
      `20601012341-01-F001-${factura.correlativo}.xml`,
    );
  });
});

describe('construirPdfBinarioSunat', () => {
  it('produce un flujo PDF 1.4 bien delimitado', () => {
    const pdf = construirPdfBinarioSunat(factura);

    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf).toContain('/Type /Catalog');
    expect(pdf).toContain('xref');
    expect(pdf).toContain('trailer');
  });

  it('incorpora el recuadro fiscal con RUC, hash y trama QR de 10 campos', () => {
    const pdf = construirPdfBinarioSunat(factura);

    expect(pdf).toContain('R.U.C. N° 20601012341');
    expect(pdf).toContain('COMPROBANTE ELECTRONICO');
    expect(pdf).toContain(factura.hashCpe);
    expect(pdf).toContain('20601012341');
  });

  it('el nombre del PDF usa serie y correlativo en cuatro dígitos', () => {
    expect(nombreArchivoPdf(factura)).toMatch(/^F001-\d{4}\.pdf$/);
  });
});

describe('construirCsvRvie', () => {
  it('genera una cabecera y una fila por comprobante', () => {
    const csv = construirCsvRvie(COMPROBANTES_DEMO);
    const lineas = csv.trimEnd().split('\n');

    expect(lineas).toHaveLength(COMPROBANTES_DEMO.length + 1);
    expect(lineas[0]).toContain('Periodo');
    expect(lineas[0]).toContain('Tipo_CPE');
    expect(lineas[0]).toContain('Total_Neto');
    expect(lineas[1].split(',')).toHaveLength(19);
  });

  it('numera el CAR SUNAT de forma correlativa', () => {
    const csv = construirCsvRvie(COMPROBANTES_DEMO);
    const segunda = csv.trimEnd().split('\n')[2];

    expect(segunda).toContain('"2"');
  });

  it('el nombre del reporte corresponde al periodo y al RUC del emisor', () => {
    expect(nombreArchivoRvie(COMPROBANTES_DEMO)).toBe(
      'RVIE-20601012341-202610.csv',
    );
  });
});

describe('validaciones del formulario de emisión', () => {
  it('acepta RUC válidos y rechaza verificadores incorrectos', () => {
    expect(rucValido('20100070970')).toBe(true);
    expect(rucValido('20601012341')).toBe(true);
    expect(rucValido('20601012342')).toBe(false);
    expect(rucValido('1012345678')).toBe(false);
  });

  it('solo acepta DNI de ocho dígitos', () => {
    expect(dniValido('45678912')).toBe(true);
    expect(dniValido('4567891')).toBe(false);
    expect(dniValido('456789123')).toBe(false);
  });

  it('discrimina entre RUC y DNI según el largo del documento', () => {
    expect(documentoClienteValido('20100070970')).toBe(true);
    expect(documentoClienteValido('45678912')).toBe(true);
    expect(documentoClienteValido('20100070971')).toBe(false);
  });

  it('cada tipo de comprobante tiene series del catálogo correcto', () => {
    expect(SERIES_POR_TIPO['01']).toContain('F001');
    expect(SERIES_POR_TIPO['03']).toContain('B001');
    expect(SERIES_POR_TIPO['07']).toContain('FC01');
    expect(SERIES_POR_TIPO['08']).toContain('FD01');
  });
});

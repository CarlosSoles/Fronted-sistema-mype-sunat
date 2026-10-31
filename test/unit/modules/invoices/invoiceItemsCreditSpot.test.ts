/**
 * TA-64 · grilla multi-ítem, cuotas, ICBPER y detracción en el frontend.
 *
 * Lo que se protege, en orden de importancia:
 *
 *  1. La liquidación sale de las LÍNEAS, no de una base única: una factura con
 *     gravadas, exoneradas y una gratuita a la vez da el desglose correcto.
 *  2. Las gratuitas se declaran en cero (regla 3278) y no inflan el total.
 *  3. El cronograma cuadra al céntimo (regla 3319) y ninguna cuota vence el día
 *     de la emisión (regla 3267). Repartir en partes iguales SIN cargar el
 *     residuo a la última cuota produce 999.99 y es un rechazo seguro.
 *  4. La detracción se identifica por CÓDIGO del Catálogo 54, no por un
 *     porcentaje suelto, y los códigos dados de baja se rechazan.
 *  5. El XML exportado desde el navegador usa `cac:PaymentTerms` para las
 *     cuotas, no `cac:PaymentMeans`, y lleva el `Amount` de cabecera: sin él la
 *     regla 3319 compara contra cero.
 */
import { describe, expect, it } from 'vitest';
import {
  UNIDADES_MEDIDA,
  actualizarItem,
  agregarItem,
  calcularItem,
  eliminarItem,
  itemBolsa,
  itemVacio,
  itemsALiquidar,
  totalizarItems,
  unidadValida,
  validarItems,
  type ItemBorrador,
} from '@/modules/invoices/lib/invoiceItems';
import {
  CODIGOS_DETRACCION,
  esDetraccionDadaDeBaja,
  montoDetraccionPara,
  repartirEnCuotas,
  validarCronograma,
} from '@/modules/invoices/lib/invoiceDetraccion';
import { liquidarComprobante } from '@/modules/invoices/lib/invoiceRetentions';
import { construir } from '@/modules/invoices/data/invoiceDemoTypes';
import {
  desglosar,
  generarXmlUbl21Comprobante,
} from '@/modules/invoices/lib/invoiceExportXml';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

let contador = 0;

/** Línea de prueba con valores completos. */
function linea(
  datos: Partial<ItemBorrador> & { valorUnitario: number },
): ItemBorrador {
  contador += 1;
  return { ...itemVacio(`t-${contador}`), ...datos };
}

// ---------------------------------------------------------------------------
// 1 · Cálculo por línea
// ---------------------------------------------------------------------------

describe('TA-64 · cálculo de una línea', () => {
  it('una línea gravada suma su IGV del 18 %', () => {
    const total = calcularItem(linea({ cantidad: 10, valorUnitario: 25 }));
    expect(total.base).toBe(250);
    expect(total.igv).toBe(45);
    expect(total.total).toBe(295);
  });

  it('una línea exonerada no genera IGV', () => {
    const total = calcularItem(
      linea({ cantidad: 2, valorUnitario: 100, afectacion: 'EXONERADA' }),
    );
    expect(total.base).toBe(200);
    expect(total.igv).toBe(0);
    expect(total.total).toBe(200);
  });

  it('una línea inafecta no genera IGV', () => {
    const total = calcularItem(
      linea({ valorUnitario: 300, afectacion: 'INAFECTA' }),
    );
    expect(total.igv).toBe(0);
    expect(total.total).toBe(300);
  });

  it('una línea gratuita se declara en cero aunque tenga valor referencial', () => {
    const total = calcularItem(
      linea({ cantidad: 5, valorUnitario: 25, afectacion: 'GRATUITA' }),
    );
    // Regla 3278: no se cobra.
    expect(total.base).toBe(0);
    expect(total.igv).toBe(0);
    expect(total.total).toBe(0);
  });

  it('el ICBPER de la línea se suma a su total', () => {
    const total = calcularItem(
      linea({ cantidad: 1, valorUnitario: 0.05, icbper: 1.5 }),
    );
    expect(total.icbper).toBe(1.5);
    expect(total.total).toBe(1.56);
  });

  it('una cantidad no finita no propaga NaN al XML', () => {
    const total = calcularItem(
      linea({ cantidad: Number.NaN, valorUnitario: 100 }),
    );
    expect(total.base).toBe(0);
    expect(total.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2 · Total de la grilla
// ---------------------------------------------------------------------------

describe('TA-64 · totales de la grilla', () => {
  /** Factura de ferretería con las cuatro afectaciones a la vez. */
  function grillaCompleta(): readonly ItemBorrador[] {
    return [
      linea({ descripcion: 'Cemento', cantidad: 20, valorUnitario: 25 }),
      linea({ descripcion: 'Fierro', cantidad: 60, valorUnitario: 9.5 }),
      linea({
        descripcion: 'Arena',
        cantidad: 10,
        valorUnitario: 50,
        afectacion: 'EXONERADA',
      }),
      linea({
        descripcion: 'Servicio de pintura',
        valorUnitario: 300,
        afectacion: 'INAFECTA',
      }),
      linea({
        descripcion: 'Regalo',
        valorUnitario: 100,
        afectacion: 'GRATUITA',
      }),
    ];
  }

  it('suma las bases, el IGV y el total de todas las líneas', () => {
    const totales = totalizarItems(grillaCompleta());

    // Gravadas: 500 + 570 = 1070 → IGV 192.60. Exonerada 500. Inafecta 300.
    expect(totales.base).toBe(1870);
    expect(totales.igv).toBe(192.6);
    expect(totales.total).toBe(2062.6);
    expect(totales.lineas).toBe(5);
  });

  it('la gratuita no aporta al total', () => {
    const conGratuita = totalizarItems(grillaCompleta());
    const sinGratuita = totalizarItems(grillaCompleta().slice(0, 4));
    expect(conGratuita.total).toBe(sinGratuita.total);
    // Pero sí cuenta como línea del comprobante.
    expect(conGratuita.lineas).toBe(sinGratuita.lineas + 1);
  });

  it('la liquidación por afectación coincide con las líneas', () => {
    const liquidacion = liquidarComprobante(itemsALiquidar(grillaCompleta()));
    expect(liquidacion.opGravada).toBe(1070);
    expect(liquidacion.opExonerada).toBe(500);
    expect(liquidacion.opInafecta).toBe(300);
    // Las gratuitas llegaban al motor en cero, así que no se declaran como base.
    expect(liquidacion.opGratuita).toBe(0);
    expect(liquidacion.igv).toBe(192.6);
  });

  it('el ICBPER de la línea de bolsa se cuenta en su propio campo', () => {
    const items = [
      linea({ cantidad: 20, valorUnitario: 25 }),
      itemBolsa('bolsa-1', 20),
    ];
    const totales = totalizarItems(items);

    // 20 bolsas × S/ 0.50 = S/ 10.00 de ICBPER, informado aparte del total.
    expect(totales.icbper).toBe(10);
    const bolsa = calcularItem(items[1]);
    // La bolsa es una línea gravada: 20 × 0.05 = 1.00 de base y 0.18 de IGV.
    expect(bolsa.base).toBe(1);
    expect(bolsa.igv).toBe(0.18);
    expect(bolsa.icbper).toBe(10);
    expect(bolsa.total).toBe(11.18);
  });
});

// ---------------------------------------------------------------------------
// 3 · Catálogo 03 y validación de la grilla
// ---------------------------------------------------------------------------

describe('TA-64 · validación de la grilla', () => {
  it('acepta las unidades del Catálogo 03 que ofrece el formulario', () => {
    for (const unidad of UNIDADES_MEDIDA) {
      expect(unidadValida(unidad.codigo)).toBe(true);
    }
  });

  it('rechaza una unidad fuera del Catálogo 03', () => {
    expect(unidadValida('UND')).toBe(false);
    expect(unidadValida('UNIDAD')).toBe(false);
    expect(unidadValida('')).toBe(false);
    // La comparación ignora mayúsculas y espacios de los extremos.
    expect(unidadValida(' niu ')).toBe(true);
  });

  it('una grilla vacía no se puede emitir', () => {
    const errores = validarItems([]);
    expect(errores).toHaveLength(1);
    expect(errores[0].motivos[0]).toMatch(/al menos un ítem/);
  });

  it('señala el índice de la línea que falla, no solo que algo falla', () => {
    const items = [
      linea({ descripcion: 'Cemento', valorUnitario: 25 }),
      linea({ descripcion: '', valorUnitario: 10 }),
      linea({ descripcion: 'Fierro', valorUnitario: 10, unidad: 'UND' }),
    ];
    const errores = validarItems(items);

    expect(errores.map((e) => e.indice)).toEqual([1, 2]);
    expect(errores[0].motivos.join(' ')).toMatch(/descripción/i);
    expect(errores[1].motivos.join(' ')).toMatch(/Catálogo 03/);
  });

  it('devuelve TODOS los errores para corregirlos de una vez', () => {
    const items = [
      linea({ descripcion: '', valorUnitario: -5, unidad: 'UND', cantidad: 0 }),
    ];
    const motivos = validarItems(items)[0].motivos.join(' | ');
    expect(motivos).toMatch(/descripción/i);
    expect(motivos).toMatch(/Catálogo 03/);
    expect(motivos).toMatch(/cantidad/i);
    expect(motivos).toMatch(/negativo/i);
  });

  it('la grilla bien armada no tiene errores', () => {
    expect(
      validarItems([
        linea({ descripcion: 'Cemento', cantidad: 20, valorUnitario: 25 }),
        itemBolsa('b-1', 5),
      ]),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4 · Operaciones sobre la grilla (inmutabilidad)
// ---------------------------------------------------------------------------

describe('TA-64 · operaciones sobre la grilla', () => {
  it('actualizar una línea no muta el arreglo original', () => {
    const original = [linea({ valorUnitario: 10 }), linea({ valorUnitario: 20 })];
    const nuevo = actualizarItem(original, 1, { valorUnitario: 99 });

    expect(nuevo[1].valorUnitario).toBe(99);
    // El original sigue intacto: React compara por referencia.
    expect(original[1].valorUnitario).toBe(20);
    expect(nuevo).not.toBe(original);
  });

  it('eliminar una línea quita solo esa', () => {
    const items = [
      linea({ descripcion: 'a', valorUnitario: 1 }),
      linea({ descripcion: 'b', valorUnitario: 2 }),
      linea({ descripcion: 'c', valorUnitario: 3 }),
    ];
    const resultado = eliminarItem(items, 1);
    expect(resultado.map((i) => i.descripcion)).toEqual(['a', 'c']);
  });

  it('agregar respeta las líneas previas y añade al final', () => {
    const items = [linea({ descripcion: 'a', valorUnitario: 1 })];
    const resultado = agregarItem(items, itemVacio('nueva'));
    expect(resultado).toHaveLength(2);
    expect(resultado[1].clave).toBe('nueva');
  });

  it('la línea de bolsa calcula su ICBPER como cantidad x 0.50', () => {
    expect(itemBolsa('b-1', 1).icbper).toBe(0.5);
    expect(itemBolsa('b-2', 20).icbper).toBe(10);
    expect(itemBolsa('b-3', 7).icbper).toBe(3.5);
  });
});

// ---------------------------------------------------------------------------
// 5 · Cronograma de cuotas: reglas 3319 y 3267
// ---------------------------------------------------------------------------

describe('TA-64 · cronograma de cuotas', () => {
  it('reparte el neto y carga el residuo a la última cuota', () => {
    const cuotas = repartirEnCuotas(1000, 3, '2026-10-31');

    expect(cuotas.map((c) => c.monto)).toEqual([333.33, 333.33, 333.34]);
    // La regla 3319 se cumple al céntimo.
    const suma = cuotas.reduce((acc, c) => acc + c.monto, 0);
    expect(Math.round(suma * 100) / 100).toBe(1000);
  });

  it('numera las cuotas Cuota001..CuotaN', () => {
    const cuotas = repartirEnCuotas(600, 2, '2026-10-31');
    expect(cuotas[0].numero).toBe('Cuota001');
    expect(cuotas[1].numero).toBe('Cuota002');
  });

  it('todas las cuotas vencen DESPUÉS de la emisión (regla 3267)', () => {
    const cuotas = repartirEnCuotas(1000, 3, '2026-10-31');
    const emision = Date.parse('2026-10-31T00:00:00Z');
    for (const cuota of cuotas) {
      expect(Date.parse(`${cuota.vencimiento}T00:00:00Z`)).toBeGreaterThan(
        emision,
      );
    }
  });

  it('soporta un crédito a 12 cuotas', () => {
    const cuotas = repartirEnCuotas(12000, 12, '2026-10-31');
    expect(cuotas).toHaveLength(12);
    const suma = cuotas.reduce((acc, c) => acc + c.monto, 0);
    expect(Math.round(suma * 100) / 100).toBe(12000);
  });

  it('con neto o número de cuotas inválido no genera cronograma', () => {
    expect(repartirEnCuotas(0, 3, '2026-10-31')).toEqual([]);
    expect(repartirEnCuotas(1000, 0, '2026-10-31')).toEqual([]);
  });

  it('el cronograma editado a mano se comprueba contra el neto', () => {
    const cuotas = [
      { monto: 500, vencimiento: '2026-11-30' },
      { monto: 500, vencimiento: '2026-12-31' },
    ];
    const resultado = validarCronograma(cuotas, 1000, '2026-10-31');

    expect(resultado.cuadra).toBe(true);
    expect(resultado.diferencia).toBe(0);
    expect(resultado.errores).toEqual([]);
  });

  it('detecta el descuadre de un céntimo', () => {
    const resultado = validarCronograma(
      [{ monto: 999.99, vencimiento: '2026-11-30' }],
      1000,
      '2026-10-31',
    );
    expect(resultado.cuadra).toBe(false);
    expect(resultado.diferencia).toBe(0.01);
    expect(resultado.errores.join(' ')).toMatch(/faltan 0\.01/);
  });

  it('detecta una cuota que vence el mismo día de la emisión', () => {
    const resultado = validarCronograma(
      [{ monto: 1000, vencimiento: '2026-10-31' }],
      1000,
      '2026-10-31',
    );
    expect(resultado.errores.join(' ')).toMatch(/no es posterior/);
  });

  it('detecta una cuota sin importe', () => {
    const resultado = validarCronograma(
      [{ monto: 0, vencimiento: '2026-11-30' }],
      1000,
      '2026-10-31',
    );
    expect(resultado.errores.join(' ')).toMatch(/importe de cero/);
  });
});

// ---------------------------------------------------------------------------
// 6 · Detracción del Catálogo 54
// ---------------------------------------------------------------------------

describe('TA-64 · detracción por código del Catálogo 54', () => {
  it('los códigos ofrecidos son los vigentes con su porcentaje', () => {
    const flete = CODIGOS_DETRACCION.find((d) => d.codigo === '027');
    expect(flete?.porcentaje).toBe(0.04);

    const servicios = CODIGOS_DETRACCION.find((d) => d.codigo === '012');
    expect(servicios?.porcentaje).toBe(0.12);
  });

  it('el importe se redondea a soles enteros (regla 3208)', () => {
    // 12 % de 1180 = 141.60 → 142.
    expect(montoDetraccionPara(1180, '012')).toBe(142);
    // 4 % de 1000 = 40.
    expect(montoDetraccionPara(1000, '027')).toBe(40);
  });

  it('no aplica por debajo del umbral de S/ 700', () => {
    expect(montoDetraccionPara(700, '012')).toBe(0);
    expect(montoDetraccionPara(699.99, '012')).toBe(0);
    expect(montoDetraccionPara(700.01, '012')).toBe(84);
  });

  it('reconoce los códigos dados de baja', () => {
    for (const codigo of ['006', '018', '029', '033']) {
      expect(esDetraccionDadaDeBaja(codigo)).toBe(true);
    }
    expect(esDetraccionDadaDeBaja('012')).toBe(false);
  });

  it('un código inexistente no inventa un importe', () => {
    expect(montoDetraccionPara(5000, '999')).toBe(0);
    expect(montoDetraccionPara(5000, '')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 7 · XML exportado desde el frontend
// ---------------------------------------------------------------------------

describe('TA-64 · XML UBL 2.1 del frontend', () => {
  /** Factura de prueba con tres líneas de afectaciones distintas. */
  function factura() {
    return construir({
      tipo: '01',
      serie: 'F001',
      correlativo: 143,
      ruc: '20100066603',
      razonSocial: 'CONSTRUCTORA DEL NORTE S.A.C.',
      fecha: '2026-10-31',
      base: 1070,
      estado: 'ACEPTADO',
      formaPago: 'Credito',
      numeroCuotas: 2,
      items: [
        {
          codigo: 'CEM-001',
          descripcion: 'Cemento Portland tipo I',
          unidad: 'BG',
          cantidad: 20,
          valorUnitario: 25,
          afectacion: 'GRAVADA',
        },
        {
          codigo: 'ARE-001',
          descripcion: 'Arena gruesa',
          unidad: 'MTR',
          cantidad: 10,
          valorUnitario: 50,
          afectacion: 'EXONERADA',
        },
        {
          codigo: 'REG-001',
          descripcion: 'Regalo de aniversario',
          unidad: 'NIU',
          cantidad: 1,
          valorUnitario: 100,
          afectacion: 'GRATUITA',
        },
      ],
    });
  }

  it('el desglose separa gravado de exonerado y gratuito', () => {
    const d = desglosar(factura());
    expect(d.gravado).toBe(500);
    expect(d.igv).toBe(90);
    expect(d.exonerado).toBe(500);
    // La gratuita no entra en ninguna base.
    expect(d.gravado + d.exonerado + d.inafecto).toBe(1000);
  });

  it('el TaxSubtotal de la exonerada declara tributo 9997 y no 1000', () => {
    const xml = generarXmlUbl21Comprobante(factura());
    expect(xml).toContain('<cbc:ID>9997</cbc:ID>');
    expect(xml).toContain('<cbc:Name>EXO</cbc:Name>');
  });

  it('las cuotas van como cac:PaymentTerms, no como cac:PaymentMeans', () => {
    const xml = generarXmlUbl21Comprobante(factura());
    expect(xml).toContain('<cbc:ID>Cuota001</cbc:ID>');
    expect(xml).toContain('<cbc:PaymentMeansID>Cuota</cbc:PaymentMeansID>');
    // El defecto anterior: las cuotas salían como PaymentMeans.
    expect(xml).not.toMatch(/<cac:PaymentMeans>\s*<cbc:ID>Cuota001/);
  });

  it('la cabecera, las cuotas y el PayableAmount usan el MISMO neto (3319)', () => {
    const xml = generarXmlUbl21Comprobante(factura());

    // El neto sale de las líneas: 1000 de base (500 gravada + 500 exonerada;
    // la gratuita no suma) + 90 de IGV = 1090.00.
    expect(xml).toContain(
      '<cbc:PaymentMeansID>Credito</cbc:PaymentMeansID>\n' +
        '    <cbc:Amount currencyID="PEN">1090.00</cbc:Amount>',
    );

    // Las cuotas del XML suman exactamente ese neto. Antes se emitían sobre el
    // `totalNeto` del comprobante demo y sumaban 1262.60 contra una cabecera
    // de 1090.00: la regla 3319 fallaba sin que nadie lo notara.
    const montos = [...xml.matchAll(/<cbc:PaymentMeansID>Cuota<\/cbc:PaymentMeansID>\s*<cbc:Amount currencyID="PEN">([\d.]+)</g)]
      .map((m) => Number(m[1]));
    expect(montos).toEqual([545, 545]);
    expect(Math.round(montos.reduce((a, b) => a + b, 0) * 100)).toBe(109000);

    // Y el importe a pagar coincide con esa misma cifra.
    expect(xml).toContain(
      '<cbc:PayableAmount currencyID="PEN">1090.00</cbc:PayableAmount>',
    );
  });

  it('la línea gratuita sale con importe cero y PriceTypeCode 02', () => {
    const xml = generarXmlUbl21Comprobante(factura());
    const linea = xml.slice(xml.lastIndexOf('<cac:InvoiceLine>'));
    expect(linea).toContain(
      '<cbc:LineExtensionAmount currencyID="PEN">0.00</cbc:LineExtensionAmount>',
    );
    expect(linea).toContain('<cbc:PriceTypeCode>02</cbc:PriceTypeCode>');
  });

  it('la línea gravada declara su IGV y no cero', () => {
    const xml = generarXmlUbl21Comprobante(factura());
    const primera = xml.slice(
      xml.indexOf('<cac:InvoiceLine>'),
      xml.indexOf('<cbc:ID>2</cbc:ID>'),
    );
    // 20 × 25 = 500 de base; su IGV es 90.
    expect(primera).toContain('<cbc:TaxAmount currencyID="PEN">90.00</cbc:TaxAmount>');
  });

  it('con detracción emite la Leyenda 2006 y el PaymentMeans de detracción', () => {
    const conDetraccion = construir({
      tipo: '01',
      serie: 'F001',
      correlativo: 144,
      ruc: '20100066603',
      razonSocial: 'CONSTRUCTORA DEL NORTE S.A.C.',
      fecha: '2026-10-31',
      base: 1000,
      estado: 'ACEPTADO',
      detraccionPct: 0.12,
      tipoOperacion: '1001',
    });

    const xml = generarXmlUbl21Comprobante(conDetraccion, {
      texto: 'SON: MIL CIENTO OCHENTA Y 00/100 SOLES',
    });

    expect(xml).toContain('languageLocaleID="2006"');
    expect(xml).toContain('<cbc:ID>Detraccion</cbc:ID>');
    // El PayableAmount baja en el importe de la detracción.
    expect(conDetraccion.detraccion).toBeGreaterThan(0);
  });

  it('sin detracción no emite la leyenda 2006', () => {
    const xml = generarXmlUbl21Comprobante(factura());
    expect(xml).not.toContain('languageLocaleID="2006"');
  });
});

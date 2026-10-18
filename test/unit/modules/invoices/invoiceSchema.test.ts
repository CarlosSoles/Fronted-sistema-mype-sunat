import { describe, it, expect } from 'vitest';
import {
  invoiceSchema,
  invoiceItemSchema,
} from '@/modules/invoices/validators/invoiceSchema';
import { isValidDni, isValidRuc } from '@/lib/formatters';

/**
 * Pruebas del contrato de datos del módulo M1 (Facturación Electrónica).
 *
 * Cubre los esquemas Zod que protegen el formulario de emisión antes de que el
 * comprobante llegue al backend y, en última instancia, a la SUNAT.
 */
describe('invoiceSchema — Validación de comprobantes electrónicos', () => {
  const payloadValido = {
    serie: 'F001',
    clienteRuc: '20123456786',
    clienteRazonSocial: 'MYPE CONFECCIONES INDUSTRIALES S.A.C.',
    moneda: 'PEN' as const,
    items: [
      { descripcion: 'Servicio de consultoría contable', cantidad: 2, precioUnitario: 500 },
    ],
  };

  const construir = (cambios: Record<string, unknown>) => ({
    ...payloadValido,
    ...cambios,
  });

  describe('Caso base', () => {
    it('acepta un comprobante completo y válido', () => {
      const resultado = invoiceSchema.safeParse(payloadValido);
      expect(resultado.success).toBe(true);
    });

    it('aplica PEN como moneda por defecto cuando se omite', () => {
      const sinMoneda = {
        serie: payloadValido.serie,
        clienteRuc: payloadValido.clienteRuc,
        clienteRazonSocial: payloadValido.clienteRazonSocial,
        items: payloadValido.items,
      };
      const resultado = invoiceSchema.safeParse(sinMoneda);

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.moneda).toBe('PEN');
      }
    });
  });

  describe('RUC del adquirente', () => {
    it.each(['10', '15', '17', '20'])(
      'acepta un RUC de persona/empresa con prefijo %s',
      (prefijo) => {
        const ruc = `${prefijo}123456789`;
        const resultado = invoiceSchema.safeParse(construir({ clienteRuc: ruc }));
        expect(resultado.success).toBe(true);
      }
    );

    it.each([
      ['05012345678', 'prefijo no contemplado (05)'],
      ['30123456789', 'prefijo no contemplado (30)'],
      ['2012345678', 'solo 10 dígitos'],
      ['201234567867', '12 dígitos'],
      ['2012345678A', 'contiene una letra'],
      ['20-12345678', 'contiene guiones'],
      ['', 'cadena vacía'],
    ])('rechaza el RUC %s (%s)', (ruc) => {
      const resultado = invoiceSchema.safeParse(construir({ clienteRuc: ruc }));

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const mensajes = resultado.error.issues.map((i) => i.message).join(' ');
        expect(mensajes).toContain('RUC');
      }
    });

    it('marca como inválido el RUC que difiere del helper isValidRuc', () => {
      // El helper de formatters y el esquema Zod deben coincidir en su criterio.
      const rucs = ['20123456786', '10458963251', '2012345678', '05123456789'];

      rucs.forEach((ruc) => {
        const schemaAcepta = invoiceSchema.safeParse(construir({ clienteRuc: ruc })).success;
        expect(schemaAcepta).toBe(isValidRuc(ruc));
      });
    });
  });

  describe('DNI para boletas', () => {
    it('acepta un DNI de 8 dígitos numéricos', () => {
      expect(isValidDni('45896321')).toBe(true);
    });

    it.each([['4589632'], ['458963211'], ['4589632A'], ['']])(
      'rechaza el DNI "%s"',
      (dni) => {
        expect(isValidDni(dni)).toBe(false);
      }
    );
  });

  describe('Serie del comprobante', () => {
    it.each([['F001'], ['F123'], ['B001'], ['B999'], ['FA01']])(
      'acepta la serie válida %s',
      (serie) => {
        const resultado = invoiceSchema.safeParse(construir({ serie }));
        expect(resultado.success).toBe(true);
      }
    );

    it.each([
      ['F01', 'solo 2 caracteres tras la letra'],
      ['F0001', 'excede el tamaño de la serie'],
      ['X001', 'prefijo no autorizado'],
      ['f001', 'minúsculas (SUNAT usa mayúsculas)'],
      ['001', 'sin prefijo F/B'],
      ['', 'cadena vacía'],
    ])('rechaza la serie %s (%s)', (serie) => {
      const resultado = invoiceSchema.safeParse(construir({ serie }));

      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0]?.path).toContain('serie');
      }
    });
  });

  describe('Razón social', () => {
    it('exige al menos 3 caracteres', () => {
      expect(
        invoiceSchema.safeParse(construir({ clienteRazonSocial: 'AB' })).success
      ).toBe(false);
      expect(
        invoiceSchema.safeParse(construir({ clienteRazonSocial: 'ABC' })).success
      ).toBe(true);
    });
  });

  describe('Ítems del comprobante', () => {
    it('rechaza un comprobante sin ítems', () => {
      const resultado = invoiceSchema.safeParse(construir({ items: [] }));
      expect(resultado.success).toBe(false);
    });

    it('rechaza cantidades en cero o negativas', () => {
      const itemInvalido = {
        descripcion: 'Producto',
        cantidad: 0,
        precioUnitario: 100,
      };

      expect(invoiceItemSchema.safeParse(itemInvalido).success).toBe(false);
    });

    it('rechaza precios unitarios negativos', () => {
      const itemInvalido = {
        descripcion: 'Producto',
        cantidad: 1,
        precioUnitario: -10,
      };

      expect(invoiceItemSchema.safeParse(itemInvalido).success).toBe(false);
    });

    it('rechaza descripciones demasiado cortas', () => {
      const itemInvalido = {
        descripcion: 'A',
        cantidad: 1,
        precioUnitario: 100,
      };

      expect(invoiceItemSchema.safeParse(itemInvalido).success).toBe(false);
    });
  });

  describe('Tipos de moneda', () => {
    it('rechaza monedas fuera del catálogo PEN/USD', () => {
      const resultado = invoiceSchema.safeParse(construir({ moneda: 'EUR' }));
      expect(resultado.success).toBe(false);
    });

    it('acepta USD para comprobantes en dólares', () => {
      const resultado = invoiceSchema.safeParse(construir({ moneda: 'USD' }));
      expect(resultado.success).toBe(true);
    });
  });
});

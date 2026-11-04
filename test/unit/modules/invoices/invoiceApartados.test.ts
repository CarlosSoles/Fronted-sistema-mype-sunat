/**
 * TA-59 · apartados del módulo de facturación.
 *
 * El defecto que se protege aquí es el más visible de todos: las cuatro rutas
 * del menú (`/invoices/facturas`, `/notas`, `/bajas`, `/monitor`) pintaban el
 * MISMO listado, así que navegar solo cambiaba el resaltado del sidebar. La
 * causa era que la página no miraba la URL.
 *
 * Por eso lo que se prueba es la traducción ruta → apartado, incluidos los
 * casos que fallan en silencio: barra final, mayúsculas y ruta desconocida.
 */
import { describe, expect, it } from 'vitest';
import {
  apartadoDesdeRuta,
  DESCRIPCION_POR_APARTADO,
  esListadoPorTipo,
  RUTA_POR_APARTADO,
  TIPOS_POR_APARTADO,
  TITULO_POR_APARTADO,
} from '@/modules/invoices/lib/invoiceApartados';

describe('TA-59 · apartado desde la ruta', () => {
  it('reconoce las cuatro rutas del menú', () => {
    expect(apartadoDesdeRuta('/invoices/facturas')).toBe('comprobantes');
    expect(apartadoDesdeRuta('/invoices/notas')).toBe('notas');
    expect(apartadoDesdeRuta('/invoices/bajas')).toBe('bajas');
    expect(apartadoDesdeRuta('/invoices/monitor')).toBe('monitor');
  });

  it('cada ruta lleva a un apartado DISTINTO', () => {
    // Este es el test que habría cazado el bug: si todas devolvieran lo mismo,
    // la navegación no cambiaría nada.
    const apartados = Object.values(RUTA_POR_APARTADO).map(apartadoDesdeRuta);
    expect(new Set(apartados).size).toBe(4);
  });

  it('tolera la barra final', () => {
    // Sin normalizar, `/invoices/notas/` caía al apartado por defecto y la
    // pantalla parecía no cambiar al navegar.
    expect(apartadoDesdeRuta('/invoices/notas/')).toBe('notas');
    expect(apartadoDesdeRuta('/invoices/bajas//')).toBe('bajas');
  });

  it('tolera mayúsculas', () => {
    expect(apartadoDesdeRuta('/INVOICES/MONITOR')).toBe('monitor');
  });

  it('/invoices sin sufijo abre facturas', () => {
    expect(apartadoDesdeRuta('/invoices')).toBe('comprobantes');
  });

  it('una ruta desconocida cae al apartado por defecto y no rompe', () => {
    expect(apartadoDesdeRuta('/otra/cosa')).toBe('comprobantes');
    expect(apartadoDesdeRuta('')).toBe('comprobantes');
  });
});

describe('TA-59 · tipos por apartado', () => {
  it('facturas y boletas son 01 y 03', () => {
    expect(TIPOS_POR_APARTADO.comprobantes).toEqual(['01', '03']);
    expect(apartadoDesdeRuta('/invoices/facturas')).toBe('comprobantes');
  });

  it('las notas son 07 y 08', () => {
    expect(TIPOS_POR_APARTADO.notas).toEqual(['07', '08']);
  });

  it('bajas y monitor no filtran por tipo', () => {
    expect(TIPOS_POR_APARTADO.bajas).toEqual([]);
    expect(TIPOS_POR_APARTADO.monitor).toEqual([]);
  });

  it('distingue los apartados que son listado filtrado', () => {
    expect(esListadoPorTipo('comprobantes')).toBe(true);
    expect(esListadoPorTipo('notas')).toBe(true);
    expect(esListadoPorTipo('bajas')).toBe(false);
    expect(esListadoPorTipo('monitor')).toBe(false);
  });
});

describe('TA-59 · cabeceras de cada apartado', () => {
  it('cada apartado tiene título propio y distinto', () => {
    const titulos = Object.values(TITULO_POR_APARTADO);
    expect(titulos).toHaveLength(4);
    expect(new Set(titulos).size).toBe(4);
  });

  it('cada apartado tiene descripción propia', () => {
    const descripciones = Object.values(DESCRIPCION_POR_APARTADO);
    expect(descripciones).toHaveLength(4);
    expect(new Set(descripciones).size).toBe(4);
  });

  it('los títulos dicen de qué van', () => {
    expect(TITULO_POR_APARTADO.notas).toContain('Notas');
    expect(TITULO_POR_APARTADO.bajas).toContain('Bajas');
    expect(TITULO_POR_APARTADO.monitor).toContain('Monitor');
  });
});

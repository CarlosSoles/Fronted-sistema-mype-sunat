/**
 * Orquestador de la vista principal del módulo de Facturación (M1).
 *
 * Integra las tarjetas KPI fiscales, la navegación por los cuatro apartados
 * oficiales, la barra de filtros, la grilla enriquecida de comprobantes y los
 * modales de emisión y auditoría CDR.
 *
 * Los filtros y el apartado activo se aplican al conjunto sobre el que se
 * calculan los KPI y el monitor Outbox, no solo a la grilla: si el usuario
 * filtra "Rechazado", las tarjetas también deben mostrar ese subconjunto.
 * El aviso de la consola fiscal deja constancia de que la emisión real contra
 * el backend está planificada para el Sprint 2.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Page, PageHeader, Tabs, TabsContent } from '@/components/ui';
import { COMPROBANTES_DEMO } from './data/invoiceDemoData';
import type { ComprobanteDemo } from './data/invoiceDemoTypes';
import { InvoiceKpiCards } from './components/InvoiceKpiCards';
import { InvoiceDemoNotice } from './components/InvoiceDemoNotice';
import {
  InvoiceTabsNav,
  contarPorTab,
  type InvoiceTabId,
} from './components/InvoiceTabsNav';
import {
  InvoiceFiltersBar,
  type InvoiceFiltros,
} from './components/InvoiceFiltersBar';
import { InvoiceTable } from './components/InvoiceTable';
import { InvoiceOutboxMonitor } from './components/InvoiceOutboxMonitor';
import { InvoiceCdrModal } from './components/InvoiceCdrModal';
import { InvoiceEmitModal } from './components/InvoiceEmitModal';
import type { TipoEmision } from './components/InvoiceEmitMenu';
import { TIPO_POR_OPCION } from './lib/invoiceEmitTipos';
import { calcularResumenFiscal } from './lib/invoiceMetrics';
import { aplicarFiltros, porApartado } from './lib/invoiceFilters';
import { descargarPdfComprobante } from './lib/invoiceExportPdf';
import { exportarReporteSireCsv } from './lib/invoiceExportSire';
import {
  DESPACHO_SIMULADO_MS,
  registrarRespuestaCdr,
} from './lib/invoiceOutbox';

const FILTROS_INICIALES: InvoiceFiltros = {
  busqueda: '',
  estado: 'TODOS',
  desde: '',
  hasta: '',
};

/**
 * Fecha `YYYY-MM-DD` en la zona horaria del equipo, no en UTC.
 *
 * Un comprobante emitido a las 20:00 en Lima sigue siendo del mismo día
 * calendario; `toISOString()` lo habría fechado un día antes.
 */
export const fechaLocalIso = (d: Date): string => {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

/** Indica si el usuario está viendo un subconjunto y no el periodo completo. */
const hayFiltrosActivos = (
  filtros: InvoiceFiltros,
  tab: InvoiceTabId,
): boolean =>
  tab !== 'comprobantes' ||
  filtros.busqueda.trim() !== '' ||
  filtros.estado !== 'TODOS' ||
  filtros.desde !== '' ||
  filtros.hasta !== '';

interface VisorState {
  comprobante: ComprobanteDemo;
  modo: 'cdr' | 'xml';
}

export const InvoiceList = () => {
  const [activeTab, setActiveTab] = useState<InvoiceTabId>('comprobantes');
  const [filtros, setFiltros] = useState<InvoiceFiltros>(FILTROS_INICIALES);
  const [comprobantes, setComprobantes] =
    useState<readonly ComprobanteDemo[]>(COMPROBANTES_DEMO);
  const [modalEmision, setModalEmision] = useState<TipoEmision | null>(null);
  const [visor, setVisor] = useState<VisorState | null>(null);

  const conteo = useMemo(() => contarPorTab(comprobantes), [comprobantes]);

  /** Lote filtrado que alimenta KPIs, monitor y grilla. */
  const visibles = useMemo(
    () => aplicarFiltros(porApartado(comprobantes, activeTab), filtros),
    [comprobantes, activeTab, filtros],
  );

  const resumen = useMemo(
    () => calcularResumenFiscal(visibles),
    [visibles],
  );

  const hayEnCola = comprobantes.some((c) => c.estado === 'EN_COLA');

  /**
   * Despacho simulado de la cola: cada comprobante en cola recibe su CDR a
   * los pocos segundos, como lo haría el worker Outbox contra el billService.
   */
  useEffect(() => {
    if (!hayEnCola) return;

    const temporizador = window.setTimeout(() => {
      setComprobantes((previos) =>
        previos.map((c) => registrarRespuestaCdr(c)),
      );
    }, DESPACHO_SIMULADO_MS);

    return () => window.clearTimeout(temporizador);
  }, [hayEnCola]);

  const agregarComprobante = useCallback((nuevo: ComprobanteDemo) => {
    setComprobantes((previos) => [nuevo, ...previos]);
    setModalEmision(null);
    setActiveTab('comprobantes');
    setFiltros({ ...FILTROS_INICIALES });
  }, []);

  /** Reproduce el ciclo del worker cuando el usuario pulsa "Refrescar". */
  const refrescarCola = useCallback(() => {
    setComprobantes((previos) =>
      previos.map((c) => registrarRespuestaCdr(c)),
    );
  }, []);

  /** Grilla de comprobantes con los visores XML/CDR y la descarga PDF. */
  const grilla = (mensajeVacio?: string) => (
    <InvoiceTable
      comprobantes={visibles}
      mensajeVacio={mensajeVacio}
      onVerXml={(c) => setVisor({ comprobante: c, modo: 'xml' })}
      onVerCdr={(c) => setVisor({ comprobante: c, modo: 'cdr' })}
      onDescargarPdf={descargarPdfComprobante}
    />
  );

  // `toISOString()` devuelve la fecha en UTC: en Lima (UTC-5) después de las
  // 19:00 retrocedía un día y el comprobante se emitía con fecha de ayer.
  const fechaHoy = fechaLocalIso(new Date());

  return (
    <Page>
      <PageHeader
        title="Facturación Electrónica UBL 2.1"
        description="Emisión, consulta y seguimiento de comprobantes electrónicos sincronizados con SUNAT"
      />

      <InvoiceDemoNotice />

      <InvoiceKpiCards resumen={resumen} filtrado={hayFiltrosActivos(filtros, activeTab)} />

      <Tabs
        value={activeTab}
        onValueChange={(valor) => setActiveTab(valor as InvoiceTabId)}
      >
        <InvoiceTabsNav conteo={conteo} />

        <InvoiceFiltersBar
          filtros={filtros}
          onFiltrosChange={setFiltros}
          onActualizar={() => {
            refrescarCola();
            setFiltros({ ...FILTROS_INICIALES });
          }}
          onEmitir={(tipo) => setModalEmision(tipo)}
        />

        <TabsContent value="monitor">
          <InvoiceOutboxMonitor
            comprobantes={visibles}
            resumen={resumen}
            onExportarSire={exportarReporteSireCsv}
          />
        </TabsContent>

        <TabsContent value="comprobantes">{grilla()}</TabsContent>

        <TabsContent value="notas">
          {grilla('No hay notas de crédito o débito en el periodo.')}
        </TabsContent>

        <TabsContent value="bajas">
          {grilla('No hay bajas ni resúmenes diarios en el periodo.')}
        </TabsContent>
      </Tabs>

      {visor && (
        <InvoiceCdrModal
          comprobante={visor.comprobante}
          modoInicial={visor.modo}
          onCerrar={() => setVisor(null)}
        />
      )}

      {modalEmision && (
        <InvoiceEmitModal
          tipoInicial={TIPO_POR_OPCION[modalEmision]}
          fecha={fechaHoy}
          existentes={comprobantes}
          onEmitir={agregarComprobante}
          onCerrar={() => setModalEmision(null)}
        />
      )}
    </Page>
  );
};

export default InvoiceList;

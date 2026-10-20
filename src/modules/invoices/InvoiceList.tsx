/**
 * Orquestador de la vista principal del módulo de Facturación (M1).
 *
 * Integra las tarjetas KPI fiscales, la navegación por los cuatro apartados
 * oficiales, la barra de filtros, la grilla enriquecida de comprobantes y los
 * modales de emisión y auditoría CDR.
 */
import { useMemo, useState } from 'react';
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

const FILTROS_INICIALES: InvoiceFiltros = {
  busqueda: '',
  estado: 'TODOS',
  desde: '',
  hasta: '',
};

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
  const resumen = useMemo(
    () => calcularResumenFiscal(comprobantes),
    [comprobantes],
  );
  const visibles = useMemo(
    () => aplicarFiltros(porApartado(comprobantes, activeTab), filtros),
    [comprobantes, activeTab, filtros],
  );

  const agregarComprobante = (nuevo: ComprobanteDemo) => {
    setComprobantes((previos) => [nuevo, ...previos]);
    setModalEmision(null);
    setActiveTab('comprobantes');
  };

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

  const fechaHoy = comprobantes[0]?.fechaEmision ?? '2026-10-16';

  return (
    <Page>
      <PageHeader
        title="Facturación Electrónica UBL 2.1"
        description="Emisión, consulta y seguimiento de comprobantes sincronizados con SUNAT"
      />

      <InvoiceDemoNotice />

      <InvoiceKpiCards resumen={resumen} />

      <Tabs
        value={activeTab}
        onValueChange={(valor) => setActiveTab(valor as InvoiceTabId)}
      >
        <InvoiceTabsNav conteo={conteo} />

        <InvoiceFiltersBar
          filtros={filtros}
          onFiltrosChange={setFiltros}
          onActualizar={() => setFiltros({ ...FILTROS_INICIALES })}
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
          onEmitir={agregarComprobante}
          onCerrar={() => setModalEmision(null)}
        />
      )}
    </Page>
  );
};

export default InvoiceList;

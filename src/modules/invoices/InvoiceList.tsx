import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Page, PageHeader, Tabs, TabsContent } from '@/components/ui';
import { useInvoicesList } from './hooks/useInvoicesList';
import type { ComprobanteDemo } from './data/invoiceDemoTypes';
import { InvoiceKpiCards } from './components/InvoiceKpiCards';
import {
  InvoiceTabsNav,
  RUTA_POR_TAB,
  contarPorTab,
  tabDesdeRuta,
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

const fechaLocalIso = (d: Date): string => {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

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
  comprobante: any;
  modo: 'cdr' | 'xml';
}

export const InvoiceList = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeTab = tabDesdeRuta(pathname);
  const [filtros, setFiltros] = useState<InvoiceFiltros>(FILTROS_INICIALES);
  const [modalEmision, setModalEmision] = useState<TipoEmision | null>(null);
  const [visor, setVisor] = useState<VisorState | null>(null);

  // Consulta REAL a la API mediante React Query
  const { data, isLoading, refetch } = useInvoicesList();

  // Mapeo adaptativo desde Supabase hacia la interfaz requerida por las utilidades
  const comprobantes = useMemo(() => {
    const rawItems = data?.data || [];
    return rawItems.map((inv: any) => {
      const ubl = inv.payload_ubl || {};
      const customer = ubl.customer || {};
      const tax = ubl.tax_details || {};

      const subtotalVal = Number(tax.subtotal || inv.subtotal || 0);
      const igvVal = Number(tax.igv || inv.igv || 0);
      const totalVal = Number(inv.monto_total || inv.total || 0);
      const detraccionVal = Number(tax.detraccion || inv.detraccion || 0);
      const retencionVal = Number(tax.retencion || inv.retencion || 0);

      const tipoDocCliente =
        customer.identity_document_type === '6'
          ? '6 - RUC'
          : customer.identity_document_type === '1'
          ? '1 - DNI'
          : '6 - RUC';

      const estadoMapeado =
        inv.estado === 'ACEPTADO'
          ? 'ACEPTADO'
          : inv.estado === 'ERROR_RED'
          ? 'RECHAZADO'
          : inv.estado || 'ACEPTADO';

      return {
        id: inv.id,
        tipo: inv.tipo_comprobante || (inv.serie?.startsWith('F') ? '01' : '03'),
        serie: inv.serie || 'F001',
        correlativo: inv.correlativo || 1,
        numero: inv.correlativo || 1,
        clienteRazonSocial:
          customer.legal_name ||
          inv.clienteRazonSocial ||
          inv.cliente_razon_social ||
          'CLIENTE GENERAL',
        clienteRuc:
          customer.identity_document_number ||
          inv.clienteRuc ||
          inv.cliente_ruc ||
          '00000000000',
        clienteTipoDoc: tipoDocCliente,
        fechaEmision: inv.fecha_emision || inv.createdAt || fechaLocalIso(new Date()),
        moneda: inv.moneda || 'PEN',
        baseImponible: subtotalVal,
        opGravada: subtotalVal,
        montoIgv: igvVal,
        subtotal: subtotalVal,
        igv: igvVal,
        montoTotal: totalVal,
        total: totalVal,
        totalNeto: totalVal,
        detraccion: detraccionVal,
        retencion: retencionVal,
        tieneDetraccion: detraccionVal > 0,
        tieneRetencion: retencionVal > 0,
        estado: estadoMapeado,
        cdrStatus: inv.estado === 'ACEPTADO' ? 'ACEPTADO_SUNAT' : 'EN_COLA_OUTBOX',
        observaciones: inv.observaciones || [],
        xmlUrl: inv.xml_url || '#',
        cdrUrl: inv.cdr_url || '#',
      } as unknown as ComprobanteDemo;
    });
  }, [data]);

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

  /** Recarga los registros directamente desde Supabase */
  const refrescarCola = useCallback(() => {
    refetch();
  }, [refetch]);

  /** Grilla de comprobantes */
  const grilla = (mensajeVacio?: string) => (
    <InvoiceTable
      comprobantes={visibles}
      mensajeVacio={isLoading ? 'Cargando comprobantes desde Supabase...' : mensajeVacio}
      onVerXml={(c) => setVisor({ comprobante: c, modo: 'xml' })}
      onVerCdr={(c) => setVisor({ comprobante: c, modo: 'cdr' })}
      onDescargarPdf={descargarPdfComprobante}
    />
  );

  return (
    <Page>
      <PageHeader
        title="Facturación Electrónica UBL 2.1"
        description="Emisión, consulta y seguimiento de comprobantes electrónicos sincronizados con SUNAT"
      />

      <InvoiceKpiCards resumen={resumen} filtrado={hayFiltrosActivos(filtros, activeTab)} />

      <Tabs
        value={activeTab}
        onValueChange={(valor) =>
          navigate(RUTA_POR_TAB[valor as InvoiceTabId])
        }
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
          onCerrar={() => setModalEmision(null)}
          onEmitirExito={() => {
            setModalEmision(null);
            refetch(); // Forzar recarga tras emitir
          }}
        />
      )}
    </Page>
  );
};

export default InvoiceList;
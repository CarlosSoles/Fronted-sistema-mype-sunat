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
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Page, PageHeader, Tabs, TabsContent } from '@/components/ui';
import type { ComprobanteDemo } from './data/invoiceDemoTypes';
import { InvoiceKpiCards } from './components/InvoiceKpiCards';
import { InvoiceDemoNotice } from './components/InvoiceDemoNotice';
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
import { TIPO_POR_OPCION } from './lib/invoiceEmitTipos';
import { calcularResumenFiscal } from './lib/invoiceMetrics';
import { aComprobanteDemo } from './lib/invoiceApiMapper';
import { invoicesApi } from './services/invoicesApi';
import { aplicarFiltros, porApartado } from './lib/invoiceFilters';
import { descargarPdfComprobante } from './lib/invoiceExportPdf';
import { exportarReporteSireCsv } from './lib/invoiceExportSire';

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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeTab = tabDesdeRuta(pathname);
  const [filtros, setFiltros] = useState<InvoiceFiltros>(FILTROS_INICIALES);
  /** Comprobantes emitidos en esta sesión: se suman al listado del backend. */
  const [extras, setExtras] = useState<readonly ComprobanteDemo[]>([]);
  const [modalEmision, setModalEmision] = useState<TipoEmision | null>(null);
  const [visor, setVisor] = useState<VisorState | null>(null);

  const {
    data: pagina,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['invoices', 1],
    queryFn: () => invoicesApi.getInvoices(1),
    staleTime: 1000 * 60 * 3,
  });

  /** Listado real del tenant + lo emitido localmente en esta visita. */
  const comprobantes = useMemo<readonly ComprobanteDemo[]>(
    () => [...extras, ...(pagina?.data.map(aComprobanteDemo) ?? [])],
    [extras, pagina],
  );

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

  const agregarComprobante = useCallback((nuevo: ComprobanteDemo) => {
    setExtras((previos) => [nuevo, ...previos]);
    setModalEmision(null);
    navigate(RUTA_POR_TAB.comprobantes);
    setFiltros({ ...FILTROS_INICIALES });
  }, [navigate]);

  /** Vuelve a consultar el listado cuando el usuario pulsa "Actualizar". */
  const refrescarCola = useCallback(() => {
    void refetch();
  }, [refetch]);

  /** Grilla de comprobantes con los visores XML/CDR y la descarga PDF. */
  const grilla = (mensajeVacio?: string) => (
    <InvoiceTable
      comprobantes={visibles}
      mensajeVacio={
        isLoading
          ? 'Cargando comprobantes…'
          : isError
            ? 'No se pudieron cargar los comprobantes del backend.'
            : mensajeVacio
      }
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

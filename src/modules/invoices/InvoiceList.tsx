/**
 * Orquestador de la vista principal del módulo de Facturación (M1).
 *
 * Integra las tarjetas KPI fiscales, la navegación por los cuatro apartados
 * oficiales, la barra de filtros y la grilla enriquecida de comprobantes.
 * Los montos se derivan con el motor real de `lib/invoiceCalculations`.
 */
import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Page,
  PageHeader,
  Tabs,
  TabsContent,
} from '@/components/ui';
import { Info } from 'lucide-react';
import { COMPROBANTES_DEMO } from './data/invoiceDemoData';
import { InvoiceKpiCards } from './components/InvoiceKpiCards';
import { InvoiceTabsNav, contarPorTab, type InvoiceTabId } from './components/InvoiceTabsNav';
import { InvoiceFiltersBar, type InvoiceFiltros } from './components/InvoiceFiltersBar';
import { InvoiceTable } from './components/InvoiceTable';
import { InvoiceOutboxMonitor } from './components/InvoiceOutboxMonitor';
import { calcularResumenFiscal } from './lib/invoiceMetrics';
import { aplicarFiltros, porApartado } from './lib/invoiceFilters';

const FILTROS_INICIALES: InvoiceFiltros = {
  busqueda: '',
  estado: 'TODOS',
  desde: '',
  hasta: '',
};

export const InvoiceList = () => {
  const [activeTab, setActiveTab] = useState<InvoiceTabId>('comprobantes');
  const [filtros, setFiltros] = useState<InvoiceFiltros>(FILTROS_INICIALES);

  const conteo = useMemo(() => contarPorTab(COMPROBANTES_DEMO), []);
  const resumen = useMemo(
    () => calcularResumenFiscal(COMPROBANTES_DEMO),
    [],
  );

  const visibles = useMemo(
    () => aplicarFiltros(porApartado(COMPROBANTES_DEMO, activeTab), filtros),
    [activeTab, filtros],
  );

  return (
    <Page>
      <PageHeader
        title="Facturación Electrónica UBL 2.1"
        description="Emisión, consulta y seguimiento de comprobantes sincronizados con SUNAT"
      />

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Datos de demostración</AlertTitle>
        <AlertDescription>
          La vista se muestra con comprobantes de ejemplo del periodo. Los
          montos de IGV, detracción y retención se calculan con el motor
          tributario del módulo.
        </AlertDescription>
      </Alert>

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
          onEmitir={() => setFiltros({ ...FILTROS_INICIALES })}
        />

        <TabsContent value="monitor">
          <InvoiceOutboxMonitor comprobantes={visibles} resumen={resumen} />
        </TabsContent>

        <TabsContent value="comprobantes">
          <InvoiceTable comprobantes={visibles} />
        </TabsContent>

        <TabsContent value="notas">
          <InvoiceTable
            comprobantes={visibles}
            mensajeVacio="No hay notas de crédito o débito en el periodo."
          />
        </TabsContent>

        <TabsContent value="bajas">
          <InvoiceTable
            comprobantes={visibles}
            mensajeVacio="No hay bajas ni resúmenes diarios en el periodo."
          />
        </TabsContent>
      </Tabs>
    </Page>
  );
};

export default InvoiceList;

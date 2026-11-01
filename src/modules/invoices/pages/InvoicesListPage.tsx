import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useInvoicesList } from '../hooks/useInvoicesList';
import { useInvoiceMetrics } from '../hooks/useInvoiceMetrics';
import { InvoiceMetricsSummaryBar } from '../components/InvoiceMetricsSummaryBar';
import { METRICAS_VACIAS } from '../lib/invoiceMetricsPeriodo';
import {
  apartadoDesdeRuta,
  DESCRIPCION_POR_APARTADO,
  esListadoPorTipo,
  TIPOS_POR_APARTADO,
  TITULO_POR_APARTADO,
} from '../lib/invoiceApartados';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  FilterBar,
  FilterSearch,
  Page,
  PageHeader,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PageText,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import { FilePlus, RefreshCw, Info, FileSearch } from 'lucide-react';
import { InvoiceCdrModal } from '../components/InvoiceCdrModal';
import type { Invoice } from '../types/invoice.types';
import type { ComprobanteDemo } from '../data/invoiceDemoTypes';
import { invoicesApi } from '../services/invoicesApi';

import { useRolePermissions } from '@/hooks/useRolePermissions';
import type { FiltrosInvoices } from '../services/invoicesApi';

const cdrStatusLabels = {
  ACEPTADO_SUNAT: 'Aceptado', EN_COLA_OUTBOX: 'Buffer Outbox', FALLO_CRITICO: 'En Cola DLQ', RECHAZADO_SUNAT: 'Rechazado',
} as const;

/** Estados que ofrece el filtro (los del enum del backend). */
const FILTROS_ESTADO = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'ACEPTADO', label: 'Aceptado' },
  { value: 'OBSERVADO', label: 'Observado' },
  { value: 'EN_COLA', label: 'En cola' },
  { value: 'ERROR_RED', label: 'Error de red' },
  { value: 'RECHAZADO', label: 'Rechazado' },
] as const;

/** Tipos del Catálogo 01 que ofrece el filtro. */
const FILTROS_TIPO = [
  { value: 'todos', label: 'Todos los tipos' },
  { value: '01', label: 'Factura' },
  { value: '03', label: 'Boleta' },
  { value: '07', label: 'Nota de crédito' },
  { value: '08', label: 'Nota de débito' },
] as const;

/**
 * Opciones del filtro de tipo para el apartado actual.
 *
 * En "Facturas y Boletas" no tiene sentido ofrecer "Nota de crédito": elegirla
 * devolvería una lista vacía y el usuario leería que no hay comprobantes.
 */
const opcionesTipoDe = (tiposDelApartado: readonly string[]) =>
  tiposDelApartado.length === 0
    ? FILTROS_TIPO
    : FILTROS_TIPO.filter((o) => o.value === 'todos' || tiposDelApartado.includes(o.value));

/** Estado del CDR del front al modelo del modal. */
const mapEstadoCdr = (
  status: Invoice['cdrStatus'],
): ComprobanteDemo['estado'] => {
  switch (status) {
    case 'ACEPTADO_SUNAT':
      return 'ACEPTADO';
    case 'RECHAZADO_SUNAT':
    case 'FALLO_CRITICO':
      return 'RECHAZADO';
    default:
      // EN_COLA_OUTBOX: el comprobante todavía no tiene respuesta de SUNAT.
      return 'EN_COLA';
  }
};

/**
 * Adapta la fila de la bandeja al tipo que espera el modal de auditoría.
 *
 * `Invoice` (lo que devuelve la API) y `ComprobanteDemo` (el modelo del modal)
 * describen lo mismo con nombres distintos. Se traduce aquí en lugar de cambiar
 * cualquiera de los dos: el modal también lo usa el flujo de demostración.
 *
 * `detalle` son los datos del ENDPOINT DE DETALLE, que trae el CDR completo. El
 * listado no los incluye: por eso el modal mostraba "Código PENDIENTE" en
 * comprobantes ya ACEPTADOS, contradiciendo el badge de la propia fila.
 */
const aComoComprobanteDemo = (
  inv: Invoice,
  detalle?: Invoice | null,
): ComprobanteDemo => {
  const fuente = detalle ?? inv;

  return {
    id: inv.numero,
    tipo: (inv.tipoComprobante ?? '01') as ComprobanteDemo['tipo'],
    serie: inv.serie,
    correlativo: Number(inv.numero.split('-')[1] ?? 0),
    fechaEmision: inv.fechaEmision,
    clienteRuc: fuente.clienteRuc || inv.clienteRuc,
    clienteTipoDoc:
      (fuente.clienteRuc || inv.clienteRuc).length === 11 ? '6' : '1',
    clienteRazonSocial: fuente.clienteRazonSocial || inv.clienteRazonSocial,
    baseImponible: fuente.subtotal,
    igv: fuente.igv,
    totalNeto: fuente.total,
    estado: mapEstadoCdr(fuente.cdrStatus),
    cdrCodigo: fuente.cdrCodigo ?? inv.cdrCodigo,
    // `cdrMensaje` es la descripción que devuelve el backend; el modelo del
    // modal la llama `cdrDescripcion`.
    cdrDescripcion:
      (fuente.cdrMensaje || inv.cdrMensaje) ??
      (fuente.cdrCodigo
        ? `Código ${fuente.cdrCodigo} reportado por SUNAT`
        : 'Sin respuesta de SUNAT todavía'),
    // El hash del XML no lo expone la API del front; el modal lo dirá.
    hashCpe: '',
    moneda: inv.moneda,
    detraccion: 0,
    retencion: 0,
    tipoOperacion: '0101',
    formaPago: 'Contado',
    cuotas: [],
    items: [],
  };
};

export default function InvoicesListPage() {
  // TA-59: la URL decide qué apartado se muestra. Sin esto, las cuatro rutas
  // del menú (facturas, notas, bajas, monitor) renderizaban el mismo listado
  // con la misma consulta y navegar solo cambiaba el resaltado del sidebar.
  const { pathname } = useLocation();
  const apartado = apartadoDesdeRuta(pathname);
  const tiposDelApartado = TIPOS_POR_APARTADO[apartado];

  // TA-59: la paginación y los filtros son estado real y se envían al backend,
  // que ya los soportaba; antes la pantalla los ignoraba y solo paginaba en
  // cliente sobre la primera página.
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  /**
   * Comprobante abierto en el modal de auditoría.
   *
   * `InvoiceCdrModal` existía pero ninguna pantalla lo importaba: el CDR, el XML
   * y el PDF no eran alcanzables desde la interfaz.
   */
  const [auditoria, setAuditoria] = useState<Invoice | null>(null);
  /** Detalle del comprobante abierto; trae el CDR que el listado no incluye. */
  const [detalleCdr, setDetalleCdr] = useState<Invoice | null>(null);

  /**
   * Abre el modal pidiendo el DETALLE del comprobante.
   *
   * El listado devuelve `cdr_codigo: null` aunque el comprobante esté ACEPTADO,
   * así que el modal mostraba "Código PENDIENTE — Sin respuesta de SUNAT
   * todavía" en una factura aceptada: se contradecía con el badge de la fila.
   * El endpoint de detalle sí trae el CDR.
   */
  const abrirAuditoria = (inv: Invoice) => {
    setAuditoria(inv);
    setDetalleCdr(null);
    invoicesApi
      .getInvoiceById(inv.id)
      .then((detalle) => setDetalleCdr(detalle))
      .catch(() => {
        // Si el detalle falla, el modal se abre con lo que trae la fila y no
        // se inventa el CDR: el componente muestra "sin respuesta".
        setDetalleCdr(null);
      });
  };

  const filtros: FiltrosInvoices = {
    estado: estado === 'todos' ? undefined : estado,
    // El apartado impone sus tipos; el filtro manual solo puede afinar dentro
    // de ese conjunto. En "comprobantes" con un tipo elegido se manda ese tipo;
    // en "notas" sin elección se piden 07 y 08, pero el backend acepta un solo
    // valor por petición, así que se pide el primero y se afina en cliente.
    tipo:
      tipo !== 'todos'
        ? tipo
        : esListadoPorTipo(apartado)
          ? tiposDelApartado[0]
          : undefined,
  };

  const { data, isLoading, refetch, isRefetching } = useInvoicesList(
    page,
    filtros,
  );
  // TA-69: la barra de resumen se alimenta del periodo completo, no de la
  // página visible, y por eso es una consulta aparte de la grilla.
  const { data: metricas, isLoading: cargandoMetricas } = useInvoiceMetrics();
  const { canEmitInvoices, isAuditor } = useRolePermissions();

  // La búsqueda por texto sigue siendo local: el backend no expone un parámetro
  // de texto libre y añadirlo obligaría a un LIKE sin índice sobre dos columnas.
  // Es la búsqueda sobre la página visible, no sobre toda la empresa.
  const filteredInvoices = (data?.data ?? [])
    // El apartado acota los tipos. El backend filtra por UN tipo por petición,
    // así que el resto del conjunto se descarta aquí.
    .filter(
      (inv) =>
        !esListadoPorTipo(apartado) ||
        tipo !== 'todos' ||
        tiposDelApartado.includes(inv.tipoComprobante),
    )
    .filter((inv) =>
      `${inv.serie}-${inv.numero} ${inv.clienteRazonSocial} ${inv.clienteRuc}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

  const totalPages = data?.totalPages ?? 1;

  return (
    <Page>
      <PageHeader
        title={TITULO_POR_APARTADO[apartado]}
        description={DESCRIPCION_POR_APARTADO[apartado]}
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw aria-hidden="true" />
          Actualizar
        </Button>
        {canEmitInvoices ? (
          <Button size="sm">
            <FilePlus aria-hidden="true" />
            Nueva Factura
          </Button>
        ) : (
          <Badge variant="outline" className="h-9 px-3 text-xs bg-muted/60 text-muted-foreground border-dashed">
            {isAuditor ? 'Inspección Fiscal (Solo Lectura)' : 'Consulta Contable (Lectura)'}
          </Badge>
        )}
      </PageHeader>

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Canal de Comunicación SUNAT Activo</AlertTitle>
        <AlertDescription>
          Los comprobantes emitidos se firman digitalmente y se encolan con garantía de entrega outbox.
        </AlertDescription>
      </Alert>

      {/*
        TA-69: métricas del PERIODO, calculadas en el servidor.

        Van antes de la barra de filtros porque describen el mes completo y no
        la vista filtrada: si estuvieran después, el usuario leería el número
        como si correspondiera al filtro que acaba de elegir. Los filtros
        afectan a la grilla, no a estas cifras, y por eso la barra no las
        recalcula cuando cambia un filtro.
      */}
      <InvoiceMetricsSummaryBar
        metricas={metricas ?? METRICAS_VACIAS}
        cargando={cargandoMetricas}
      />

      <FilterBar>
        <FilterSearch
          value={searchTerm}
          onChange={setSearchTerm}
          onClear={() => setSearchTerm('')}
          placeholder="Filtrar en esta página por serie, número o RUC..."
        />
        <Select
          value={estado}
          onValueChange={(valor) => {
            setEstado(valor);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filtrar por estado" className="h-9 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTROS_ESTADO.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={tipo}
          onValueChange={(valor) => {
            setTipo(valor);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filtrar por tipo" className="h-9 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opcionesTipoDe(tiposDelApartado).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <Card flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprobante</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead align="right">Total</TableHead>
              <TableHead>Estado CDR</TableHead>
              <TableHead align="right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Cargando comprobantes...
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.numero}</TableCell>
                  <TableCell>
                    <PageText variant="label">{inv.clienteRazonSocial}</PageText>
                    <PageText variant="caption">RUC: {inv.clienteRuc}</PageText>
                  </TableCell>
                  <TableCell>
                    {formatDateToPeru(inv.fechaEmision)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(inv.total, inv.moneda)}
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={inv.cdrStatus === 'FALLO_CRITICO' ? 'destructive' : 'outline'}>
                      {cdrStatusLabels[inv.cdrStatus]}
                      {inv.cdrCodigo ? ` (${inv.cdrCodigo})` : ''}
                    </Badge>
                    {/* TA-59: el badge OBSERVADO solo aparece si el estado crudo
                        lo dice; el status de CDR lo colapsa con ACEPTADO. */}
                    {inv.estadoBackend === 'OBSERVADO' && (
                      <Badge variant="outline" className="ml-1 text-[10px]">
                        Observado
                      </Badge>
                    )}
                  </TableCell>
                  {/*
                    Acciones por fila.
                    `InvoiceCdrModal` existía pero NINGUNA pantalla lo abría, así
                    que el CDR, el XML y el PDF no eran alcanzables desde la
                    interfaz. Se detectó recorriendo la bandeja en el navegador el
                    31-10: las filas no tenían ningún botón.
                  */}
                  <TableCell align="right">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Ver CDR de ${inv.numero}`}
                      onClick={() => abrirAuditoria(inv)}
                    >
                      <FileSearch className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Ver CDR
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No se encontraron comprobantes registrados en este periodo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de auditoría: CDR, XML y PDF del comprobante elegido. */}
      {auditoria && (
        <InvoiceCdrModal
          comprobante={aComoComprobanteDemo(auditoria, detalleCdr)}
          modoInicial="cdr"
          onCerrar={() => {
            setAuditoria(null);
            setDetalleCdr(null);
          }}
        />
      )}

      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} /></PaginationItem>
          <PaginationItem>
            <PaginationLink isActive>
              {page} de {totalPages}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem><PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} /></PaginationItem>
        </PaginationContent>
      </Pagination>
    </Page>
  );
}

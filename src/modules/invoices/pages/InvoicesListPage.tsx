import { useState } from 'react';
import { useInvoicesList } from '../hooks/useInvoicesList';
import { useInvoiceMetrics } from '../hooks/useInvoiceMetrics';
import { InvoiceMetricsSummaryBar } from '../components/InvoiceMetricsSummaryBar';
import { METRICAS_VACIAS } from '../lib/invoiceMetricsPeriodo';
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
import { FilePlus, RefreshCw, Info } from 'lucide-react';

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

export default function InvoicesListPage() {
  // TA-59: la paginación y los filtros son estado real y se envían al backend,
  // que ya los soportaba; antes la pantalla los ignoraba y solo paginaba en
  // cliente sobre la primera página.
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filtros: FiltrosInvoices = {
    estado: estado === 'todos' ? undefined : estado,
    tipo: tipo === 'todos' ? undefined : tipo,
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
  const filteredInvoices = (data?.data ?? []).filter((inv) =>
    `${inv.serie}-${inv.numero} ${inv.clienteRazonSocial} ${inv.clienteRuc}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const totalPages = data?.totalPages ?? 1;

  return (
    <Page>
      <PageHeader
        title="Facturación Electrónica UBL 2.1"
        description="Emisión, consulta y seguimiento de comprobantes electrónicos sincronizados con SUNAT"
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
            {FILTROS_TIPO.map((o) => (
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
              <TableHead align="center">Estado CDR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No se encontraron comprobantes registrados en este periodo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

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

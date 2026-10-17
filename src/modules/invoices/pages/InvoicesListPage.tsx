import { useState } from 'react';
import { useInvoicesList } from '../hooks/useInvoicesList';
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

const cdrStatusLabels = {
  ACEPTADO_SUNAT: 'Aceptado', EN_COLA_OUTBOX: 'Buffer Outbox', FALLO_CRITICO: 'En Cola DLQ', RECHAZADO_SUNAT: 'Rechazado',
} as const;

export default function InvoicesListPage() {
  const { data, isLoading, refetch, isRefetching } = useInvoicesList();
  const [searchTerm, setSearchTerm] = useState('');
  const { canEmitInvoices, isAuditor } = useRolePermissions();

  const filteredInvoices = (data?.data ?? []).filter((inv) =>
    `${inv.serie}-${inv.numero} ${inv.clienteRazonSocial} ${inv.clienteRuc}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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
            {isAuditor ? '👁️ Inspección Fiscal (Solo Lectura)' : '📊 Consulta Contable (Lectura)'}
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

      <FilterBar>
        <FilterSearch
          value={searchTerm}
          onChange={setSearchTerm}
          onClear={() => setSearchTerm('')}
          placeholder="Filtrar por serie, número o RUC de cliente..."
        />
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
                  <TableCell>
                    {inv.serie}-{inv.numero}
                  </TableCell>
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
          <PaginationItem><PaginationPrevious /></PaginationItem>
          <PaginationItem><PaginationLink isActive>1</PaginationLink></PaginationItem>
          <PaginationItem><PaginationNext /></PaginationItem>
        </PaginationContent>
      </Pagination>
    </Page>
  );
}

import { useSireReconciliation } from '../hooks/useSireReconciliation';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Page,
  PageGrid,
  PageHeader,
  PageText,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import { CheckCheck, RefreshCw, AlertTriangle } from 'lucide-react';

const matchStatusLabels = {
  CONCILIADO: 'Conciliado',
  DISCREPANCIA: 'Discrepancia',
  SOLO_SUNAT: 'Solo en SUNAT',
  SOLO_LOCAL: 'Solo en ERP',
} as const;

export default function SireReconciliationPage() {
  const { data, isLoading, refetch, isRefetching } = useSireReconciliation('202610');

  return (
    <Page>
      <PageHeader
        title="Conciliación Fiscal SIRE (RVIE / RCE)"
        description="Cruce automático entre la propuesta tributaria de SUNAT y los registros de ventas/compras del ERP"
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw aria-hidden="true" />
          Sincronizar Propuesta
        </Button>
        <Button size="sm">
          <CheckCheck aria-hidden="true" />
          Aceptar Propuesta SIRE
        </Button>
      </PageHeader>

      <Alert variant="warning">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Discrepancias Fiscales Detectadas</AlertTitle>
        <AlertDescription>
          Existen diferencias de montos entre la propuesta oficial de SUNAT y los comprobantes contables locales.
        </AlertDescription>
      </Alert>

      {/* Tarjetas de Resumen de Conciliación */}
      <PageGrid columns={3}>
        <Card>
          <CardContent>
            <PageText variant="caption">Total Propuesta SUNAT</PageText>
            <PageText variant="metric">
              {formatCurrency(data?.summary.totalPropuestaSunat ?? 0, 'PEN')}
            </PageText>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <PageText variant="caption">Total Registros Locales (ERP)</PageText>
            <PageText variant="metric">
              {formatCurrency(data?.summary.totalRegistroLocal ?? 0, 'PEN')}
            </PageText>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <PageText variant="caption">Discrepancias Detectadas</PageText>
            <PageText variant="metric-destructive">
              {data?.summary.comprobantesConDiscrepancia ?? 0}
            </PageText>
          </CardContent>
        </Card>
      </PageGrid>

      {/* Tabla de Conciliación */}
      <Card flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprobante</TableHead>
              <TableHead>Emisor</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead align="right">Monto SUNAT</TableHead>
              <TableHead align="right">Monto ERP</TableHead>
              <TableHead align="center">Estado Cruce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Consultando propuesta SIRE con SUNAT...
                </TableCell>
              </TableRow>
            ) : data?.vouchers && data.vouchers.length > 0 ? (
              data.vouchers.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    {v.serie}-{v.numero}
                  </TableCell>
                  <TableCell>
                    <PageText variant="label">{v.emisorRazonSocial}</PageText>
                    <PageText variant="caption">RUC: {v.emisorRuc}</PageText>
                  </TableCell>
                  <TableCell>{formatDateToPeru(v.fechaEmision)}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(v.montoSunat, 'PEN')}
                  </TableCell>
                  <TableCell align="right">
                    {v.montoLocal ? formatCurrency(v.montoLocal, 'PEN') : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={v.matchStatus === 'DISCREPANCIA' ? 'destructive' : 'outline'}>
                      {matchStatusLabels[v.matchStatus]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No hay registros pendientes de conciliación en el período actual.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink isActive>1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </Page>
  );
}

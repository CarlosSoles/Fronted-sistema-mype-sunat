import { PageHeader } from '@/components/layout/PageHeader';
import { MatchStatusBadge } from '../components/MatchStatusBadge';
import { useSireReconciliation } from '../hooks/useSireReconciliation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import { CheckCheck, RefreshCw } from 'lucide-react';

export default function SireReconciliationPage() {
  const { data, isLoading, refetch, isRefetching } = useSireReconciliation('202610');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conciliación Fiscal SIRE (RVIE / RCE)"
        description="Cruce automático entre la propuesta tributaria de SUNAT y los registros de ventas/compras del ERP"
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Sincronizar Propuesta
        </Button>
        <Button size="sm" className="gap-1.5">
          <CheckCheck className="h-4 w-4" />
          Aceptar Propuesta SIRE
        </Button>
      </PageHeader>

      {/* Tarjetas de Resumen de Conciliación */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground block">Total Propuesta SUNAT</span>
            <span className="text-xl font-bold">
              {formatCurrency(data?.summary.totalPropuestaSunat ?? 0, 'PEN')}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground block">Total Registros Locales (ERP)</span>
            <span className="text-xl font-bold">
              {formatCurrency(data?.summary.totalRegistroLocal ?? 0, 'PEN')}
            </span>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground block">Discrepancias Detectadas</span>
            <span className="text-xl font-bold text-destructive">
              {data?.summary.comprobantesConDiscrepancia ?? 0}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Conciliación */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprobante</TableHead>
              <TableHead>Emisor</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead className="text-right">Monto SUNAT</TableHead>
              <TableHead className="text-right">Monto ERP</TableHead>
              <TableHead className="text-center">Estado Cruce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  Consultando propuesta SIRE con SUNAT...
                </TableCell>
              </TableRow>
            ) : data?.vouchers && data.vouchers.length > 0 ? (
              data.vouchers.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-semibold text-xs">
                    {v.serie}-{v.numero}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">{v.emisorRazonSocial}</p>
                    <p className="text-[10px] text-muted-foreground">RUC: {v.emisorRuc}</p>
                  </TableCell>
                  <TableCell className="text-xs">{formatDateToPeru(v.fechaEmision)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">
                    {formatCurrency(v.montoSunat, 'PEN')}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold">
                    {v.montoLocal ? formatCurrency(v.montoLocal, 'PEN') : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <MatchStatusBadge status={v.matchStatus} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  No hay registros pendientes de conciliación en el período actual.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { PageHeader } from '@/components/layout/PageHeader';
import { CdrStatusBadge } from '../components/CdrStatusBadge';
import { useInvoicesList } from '../hooks/useInvoicesList';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import { FilePlus, RefreshCw } from 'lucide-react';

export default function InvoicesListPage() {
  const { data, isLoading, refetch, isRefetching } = useInvoicesList();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturación Electrónica UBL 2.1"
        description="Emisión, consulta y seguimiento de comprobantes electrónicos sincronizados con SUNAT"
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
        <Button size="sm" className="gap-1.5">
          <FilePlus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </PageHeader>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprobante</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Estado CDR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                  Cargando comprobantes...
                </TableCell>
              </TableRow>
            ) : data?.data && data.data.length > 0 ? (
              data.data.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-semibold text-xs">
                    {inv.serie}-{inv.numero}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">{inv.clienteRazonSocial}</p>
                    <p className="text-[10px] text-muted-foreground">RUC: {inv.clienteRuc}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDateToPeru(inv.fechaEmision)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold">
                    {formatCurrency(inv.total, inv.moneda)}
                  </TableCell>
                  <TableCell className="text-center">
                    <CdrStatusBadge status={inv.cdrStatus} codigo={inv.cdrCodigo} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                  No se encontraron comprobantes registrados en este periodo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

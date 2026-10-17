import { DoubleEntryBalanceCard } from '../components/DoubleEntryBalanceCard';
import { useAccountingEntries } from '../hooks/useAccountingEntries';
import {
  Badge,
  Button,
  Card,
  Page,
  PageHeader,
  PageText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatCurrency, formatDateToPeru } from '@/lib/formatters';
import { BookOpen, Download, PlusCircle, RefreshCw } from 'lucide-react';

export default function AccountingEntriesPage() {
  const { data: entries, isLoading, refetch, isRefetching } = useAccountingEntries();

  const totalDebe = entries?.reduce((acc, e) => acc + e.totalDebe, 0) ?? 0;
  const totalHaber = entries?.reduce((acc, e) => acc + e.totalHaber, 0) ?? 0;

  return (
    <Page>
      <PageHeader
        title="Contabilidad PCGE & Libros PLE"
        description="Libro Diario, Mayor y generación de archivos estructurados para SUNAT (PLE 5.1)"
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw aria-hidden="true" />
          Refrescar
        </Button>
        <Button variant="outline" size="sm">
          <Download aria-hidden="true" />
          Exportar PLE (.txt)
        </Button>
        <Button size="sm">
          <PlusCircle aria-hidden="true" />
          Nuevo Asiento
        </Button>
      </PageHeader>

      {/* Tarjeta de validación de partida doble */}
      <DoubleEntryBalanceCard totalDebe={totalDebe} totalHaber={totalHaber} />

      {/* Tabla de Asientos Contables */}
      <Card flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Asiento</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Glosa / Concepto</TableHead>
              <TableHead align="right">Total Debe</TableHead>
              <TableHead align="right">Total Haber</TableHead>
              <TableHead align="center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Cargando libro diario PCGE...
                </TableCell>
              </TableRow>
            ) : entries && entries.length > 0 ? (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.numeroAsiento}</TableCell>
                  <TableCell>{formatDateToPeru(entry.fechaContable)}</TableCell>
                  <TableCell>{entry.glosa}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(entry.totalDebe, 'PEN')}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(entry.totalHaber, 'PEN')}
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={entry.estaCuadrado ? 'secondary' : 'destructive'}>
                      {entry.estaCuadrado ? 'Cuadrado' : 'Descuadrado'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <BookOpen aria-hidden="true" />
                  <PageText variant="muted">No hay asientos contables registrados en el período activo.</PageText>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Page>
  );
}

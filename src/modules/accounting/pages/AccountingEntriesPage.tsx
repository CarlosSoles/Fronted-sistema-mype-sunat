import { PageHeader } from '@/components/layout/PageHeader';
import { DoubleEntryBalanceCard } from '../components/DoubleEntryBalanceCard';
import { useAccountingEntries } from '../hooks/useAccountingEntries';
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
import { BookOpen, Download, PlusCircle, RefreshCw } from 'lucide-react';

export default function AccountingEntriesPage() {
  const { data: entries, isLoading, refetch, isRefetching } = useAccountingEntries();

  const totalDebe = entries?.reduce((acc, e) => acc + e.totalDebe, 0) ?? 0;
  const totalHaber = entries?.reduce((acc, e) => acc + e.totalHaber, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contabilidad PCGE & Libros PLE"
        description="Libro Diario, Mayor y generación de archivos estructurados para SUNAT (PLE 5.1)"
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Refrescar
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Exportar PLE (.txt)
        </Button>
        <Button size="sm" className="gap-1.5">
          <PlusCircle className="h-4 w-4" />
          Nuevo Asiento
        </Button>
      </PageHeader>

      {/* Tarjeta de validación de partida doble */}
      <DoubleEntryBalanceCard totalDebe={totalDebe} totalHaber={totalHaber} />

      {/* Tabla de Asientos Contables */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Asiento</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Glosa / Concepto</TableHead>
              <TableHead className="text-right">Total Debe</TableHead>
              <TableHead className="text-right">Total Haber</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  Cargando libro diario PCGE...
                </TableCell>
              </TableRow>
            ) : entries && entries.length > 0 ? (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-semibold text-xs">{entry.numeroAsiento}</TableCell>
                  <TableCell className="text-xs">{formatDateToPeru(entry.fechaContable)}</TableCell>
                  <TableCell className="text-xs">{entry.glosa}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">
                    {formatCurrency(entry.totalDebe, 'PEN')}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold">
                    {formatCurrency(entry.totalHaber, 'PEN')}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${entry.estaCuadrado ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                      {entry.estaCuadrado ? 'Cuadrado' : 'Descuadrado'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <BookOpen className="h-6 w-6 text-muted-foreground/60 mb-1" />
                    <span>No hay asientos contables registrados en el período activo.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

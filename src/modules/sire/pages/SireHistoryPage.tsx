import { Link } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { ArrowRight, History } from 'lucide-react';

export default function SireHistoryPage() {
  return (
    <Page>
      <PageHeader
        title="Historial SIRE"
        description="Consulta los periodos fiscales conciliados y cerrados."
      />
      <Card flush>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History aria-hidden="true" /> Periodos fiscales</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead align="right">Cumplimiento</TableHead>
                <TableHead>Fecha de cierre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} align="center">
                  El historial estará disponible cuando el backend exponga la consulta de periodos conciliados y cerrados.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Button variant="outline" asChild>
        <Link to="/sire/conciliacion">Ir a conciliación <ArrowRight aria-hidden="true" /></Link>
      </Button>
    </Page>
  );
}

import { Badge, Card, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

const PCGE_ACCOUNTS = [
  { code: '121101', name: 'Facturas por Cobrar - Emitidas en Cartera', element: 'Elemento 1: Activo', type: 'Deudora' },
  { code: '401111', name: 'IGV - Cuenta Propia', element: 'Elemento 4: Pasivo', type: 'Acreedora' },
  { code: '601101', name: 'Mercaderías Manufacturadas', element: 'Elemento 6: Gastos', type: 'Deudora' },
  { code: '701111', name: 'Venta de Mercaderías - Terceros', element: 'Elemento 7: Ingresos', type: 'Acreedora' },
];

export default function AccountingPlanCuentasPage() {
  return (
    <Page>
      <PageHeader
        title="Plan Contable General Empresarial (PCGE)"
        description="Catálogo maestro de cuentas contables habilitadas para la empresa"
      />
      <Card flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código PCGE</TableHead>
              <TableHead>Denominación de la Cuenta</TableHead>
              <TableHead>Elemento</TableHead>
              <TableHead align="center">Naturaleza</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PCGE_ACCOUNTS.map((acc) => (
              <TableRow key={acc.code}>
                <TableCell className="font-mono font-bold">{acc.code}</TableCell>
                <TableCell>{acc.name}</TableCell>
                <TableCell>{acc.element}</TableCell>
                <TableCell align="center">
                  <Badge variant={acc.type === 'Deudora' ? 'secondary' : 'outline'}>
                    {acc.type}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Page>
  );
}
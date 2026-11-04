import { Badge, Card, Page, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

/**
 * Plan de cuentas que usa el módulo de facturación.
 *
 * POR QUÉ ESTAS Y NO OTRAS
 *
 * Las cuatro filas anteriores (`121101`, `401111`, `601101`, `701111`) no eran
 * del PCGE: tenían un dígito de más y no coincidían con ninguna cuenta del
 * asiento real, así que la pantalla mostraba un catálogo que no se usaba en
 * ninguna parte.
 *
 * Esta lista sale de dos fuentes verificables, no de memoria:
 *
 *  - las cuentas que asigna `accountingBridge.ts` al asentar una venta
 *    (12121, 12129, 40111, 40114, 70121, 70321, 70521, 74111);
 *  - las cuentas que realmente aparecen en `accounting_lines` de la base de
 *    datos (12121, 1212, 40111, 70121).
 *
 * Se incluyen además las de compras y gastos porque completan los elementos 1,
 * 2, 4, 6 y 7 que el docente pidió ver: "tenemos las 70, 40, 12... y tiene su
 * subdivisionaria".
 */
const PCGE_ACCOUNTS = [
  // Elemento 1 — Activo
  { code: '10411', name: 'Cuentas corrientes operativas', element: 'Elemento 1: Activo', type: 'Deudora' },
  { code: '12121', name: 'Facturas, boletas y otros comprobantes por cobrar, emitidas', element: 'Elemento 1: Activo', type: 'Deudora' },
  { code: '12129', name: 'Cuentas por cobrar - detracciones', element: 'Elemento 1: Activo', type: 'Deudora' },
  // Elemento 2 — Activo realizable
  { code: '20111', name: 'Mercaderías manufacturadas', element: 'Elemento 2: Activo realizable', type: 'Deudora' },
  // Elemento 4 — Pasivo
  { code: '40111', name: 'IGV - Cuenta propia', element: 'Elemento 4: Pasivo', type: 'Acreedora' },
  { code: '40114', name: 'IGV - Retenciones', element: 'Elemento 4: Pasivo', type: 'Acreedora' },
  { code: '42121', name: 'Facturas, boletas y otros comprobantes por pagar', element: 'Elemento 4: Pasivo', type: 'Acreedora' },
  // Elemento 6 — Gastos
  { code: '60111', name: 'Mercaderías manufacturadas (compras)', element: 'Elemento 6: Gastos', type: 'Deudora' },
  { code: '69121', name: 'Costo de ventas - mercaderías', element: 'Elemento 6: Gastos', type: 'Deudora' },
  // Elemento 7 — Ingresos
  { code: '70121', name: 'Servicios prestados / ventas gravadas', element: 'Elemento 7: Ingresos', type: 'Acreedora' },
  { code: '70321', name: 'Ventas exoneradas del IGV', element: 'Elemento 7: Ingresos', type: 'Acreedora' },
  { code: '70521', name: 'Ventas inafectas del IGV', element: 'Elemento 7: Ingresos', type: 'Acreedora' },
  { code: '74111', name: 'Impuesto a las bolsas plásticas por pagar (ICBPER)', element: 'Elemento 7: Ingresos', type: 'Acreedora' },
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
# Guía de Uso de Componentes Web (TA-23)

**Biblioteca oficial:** shadcn/ui + Tailwind CSS v4

**Punto de importación:** `@/components/ui`

Importa los componentes siempre desde el barrel. Los ejemplos son fragmentos de JSX para adaptar dentro de una pantalla:

```tsx
import { Button, Input, Table, Badge, Dialog, Card, Alert, Pagination, Form, FilterBar, Select, Separator } from '@/components/ui';
```

## 1. Button

```tsx
import { Button } from '@/components/ui';

<Button variant="default" size="sm">Emitir factura</Button>
<Button variant="destructive" disabled>Anular</Button>
```

## 2. Input

```tsx
import { Input } from '@/components/ui';

<Input id="ruc" name="ruc" inputMode="numeric" maxLength={11} placeholder="RUC del cliente" />
```

## 3. Table

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

<Table>
  <TableHeader><TableRow><TableHead>Comprobante</TableHead><TableHead align="right">Total</TableHead></TableRow></TableHeader>
  <TableBody><TableRow><TableCell>F001-00000001</TableCell><TableCell align="right">S/ 118.00</TableCell></TableRow></TableBody>
</Table>
```

## 4. Badge

```tsx
import { Badge } from '@/components/ui';

<Badge variant="default">Aceptado</Badge>
<Badge variant="destructive">Rechazado</Badge>
```

## 5. Dialog

```tsx
import { Button, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui';

<Dialog>
  <DialogTrigger asChild><Button>Ver CDR</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>Constancia SUNAT</DialogTitle><DialogDescription>Comprobante aceptado.</DialogDescription></DialogHeader>
  </DialogContent>
</Dialog>
```

## 6. Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

<Card>
  <CardHeader><CardTitle>Total facturado</CardTitle><CardDescription>Periodo actual</CardDescription></CardHeader>
  <CardContent><strong>S/ 45,280.00</strong></CardContent>
</Card>
```

## 7. Alert

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui';

<Alert variant="warning">
  <AlertTitle>Discrepancia detectada</AlertTitle>
  <AlertDescription>El total difiere de la propuesta SUNAT.</AlertDescription>
</Alert>
```

## 8. Pagination

```tsx
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui';

<Pagination>
  <PaginationContent>
    <PaginationItem><PaginationPrevious /></PaginationItem>
    <PaginationItem><PaginationLink isActive>1</PaginationLink></PaginationItem>
    <PaginationItem><PaginationNext /></PaginationItem>
  </PaginationContent>
</Pagination>
```

## 9. FilterBar

```tsx
import { useState } from 'react';
import { FilterBar, FilterSearch } from '@/components/ui';

const [query, setQuery] = useState('');
<FilterBar><FilterSearch value={query} onChange={setQuery} onClear={() => setQuery('')} placeholder="Buscar comprobante..." /></FilterBar>
```

## 10. Select

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';

<Select defaultValue="01">
  <SelectTrigger aria-label="Tipo de comprobante"><SelectValue placeholder="Tipo" /></SelectTrigger>
  <SelectContent><SelectItem value="01">Factura</SelectItem><SelectItem value="03">Boleta</SelectItem></SelectContent>
</Select>
```

## 11. Form

```tsx
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from '@/components/ui';

const form = useForm({ defaultValues: { serie: '' } });
<Form {...form}>
  <FormField control={form.control} name="serie" render={({ field }) => (
    <FormItem><FormLabel>Serie</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
  )} />
</Form>
```

## 12. Separator

```tsx
import { Separator } from '@/components/ui';

<>
  <h2>Información fiscal</h2>
  <Separator orientation="horizontal" />
  <p>Datos de contribuyente</p>
</>
```

## Composición de pantallas

Las páginas también deben importar el layout reusable (`Page`, `PageHeader`, `PageGrid`, `PageField`, `PageText`) desde el mismo barrel. No deben declarar etiquetas HTML intrínsecas ni clases de presentación; consulta la [regla de fuente única](../specs/Plan.md#33-regla-de-una-única-fuente-de-ui-normativa-ta-23).

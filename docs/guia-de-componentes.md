# Guía de Uso de Componentes Web — SYNC-SUNAT

> **Biblioteca única de UI (TA-23).** Todos los componentes de interfaz viven en `src/components/ui/` y se consumen exclusivamente desde el punto de importación público `@/components/ui`.
>
> **Norma vinculante:** [Plan Maestro de Gobernanza — §3.3 Regla de una Única Fuente de UI](../specs/Plan.md#33-regla-de-una-única-fuente-de-ui-normativa-ta-23). Una pantalla **no** declara HTML ni CSS propio fuera de esta biblioteca.

---

## 1. Regla de la única fuente

1. **Un solo punto de importación.** Las pantallas y subcomponentes importan siempre del *barrel*:

   ```tsx
   import { Button, Card, CardHeader, Table } from '@/components/ui';
   ```

   **Prohibido** importar archivos internos:

   ```tsx
   // ❌ No hacer esto
   import { Button } from '@/components/ui/button';
   import { Card } from '@/components/ui/card';
   ```

2. **Sin HTML ni CSS propio en pantallas.** Una vista (`pages/`) o un subcomponente de módulo no declara elementos intrínsecos (`div`, `span`, `button`, `input`, `table`…), etiquetas `<style>`, estilos inline ni clases Tailwind de presentación. Si el patrón visual no existe, **se añade a `src/components/ui/`**, no se improvisa en la pantalla.
3. **Sin equivalentes locales.** No se crean botones, tablas, diálogos, alertas, badges, selectores ni filtros paralelos por módulo: se reutilizan los de esta guía.
4. **Hooks, servicios, tipos e iconos quedan fuera de la prohibición.** La regla aplica a la capa visual, no a la lógica de negocio.

---

## 2. Catálogo rápido (12 componentes)

| # | Componente | Para qué sirve | Sección |
| :-: | :--- | :--- | :-: |
| 1 | `Table` | Listados de comprobantes, propuestas y discrepancias | [4.1](#41-table) |
| 2 | `Form` | Formularios con React Hook Form + Zod y mensajes de error ligados | [4.2](#42-form) |
| 3 | `Alert` | Banners de retroalimentación accesibles (`role="alert"`) | [4.3](#43-alert) |
| 4 | `Badge` | Etiquetas de estado (`ACEPTADO`, `OBSERVADO`, `RECHAZADO`…) | [4.4](#44-badge) |
| 5 | `Pagination` | Navegación entre páginas de resultados | [4.5](#45-pagination) |
| 6 | `FilterBar` | Barra de búsqueda y filtros de listados | [4.6](#46-filterbar) |
| 7 | `Dialog` | Modales con trampa de foco y cierre con `Escape` | [4.7](#47-dialog) |
| 8 | `Button` | Acción principal o secundaria con variantes y tamaños | [4.8](#48-button) |
| 9 | `Input` | Campo de texto con accesibilidad ARIA | [4.9](#49-input) |
| 10 | `Select` | Selector desplegable operable por teclado | [4.10](#410-select) |
| 11 | `Card` | Contenedor modular con cabecera, cuerpo y pie | [4.11](#411-card) |
| 12 | `Separator` | Divisor semántico horizontal o vertical | [4.12](#412-separator) |

---

## 3. Convenciones generales

- **Importaciones de tipos:** con `verbatimModuleSyntax` activo, usa `import { type MiTipo }` cuando importes solo tipos.
- **Nombres:** componentes en `PascalCase.tsx`; hooks y utilidades en `camelCase.ts`.
- **Límite de tamaño:** ningún archivo `.tsx` debe superar las 150–200 líneas; si una vista crece, extrae subcomponentes a `components/` del módulo.
- **Accesibilidad:** todo control interactivo debe ser operable con `Tab`, `Shift+Tab`, `Enter` y `Escape`; los formularios exponen `aria-invalid` y `aria-describedby` automáticamente vía `FormControl`/`FormMessage`.
- **Marca y tokens:** los colores, radios y espaciados provienen de los tokens definidos en `src/index.css` (ver `specs/design_system.spec.md`). No introduzcas colores literales.

---

## 4. Ejemplos de uso

Cada ejemplo es autocontenido y respeta la regla: **solo** se importan componentes desde `@/components/ui`.

### 4.1 Table

Listado tabular accesible con alineación por columna (`align="left" | "center" | "right"`) y contenedor con scroll horizontal.

```tsx
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';

type Comprobante = {
  serie: string;
  numero: string;
  total: number;
  estado: 'ACEPTADO' | 'RECHAZADO';
};

export function TablaComprobantes({ comprobantes }: { comprobantes: Comprobante[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comprobantes del periodo</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serie</TableHead>
              <TableHead>Número</TableHead>
              <TableHead align="right">Total (S/)</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comprobantes.map((comprobante) => (
              <TableRow key={`${comprobante.serie}-${comprobante.numero}`}>
                <TableCell>{comprobante.serie}</TableCell>
                <TableCell>{comprobante.numero}</TableCell>
                <TableCell align="right">{comprobante.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={comprobante.estado === 'ACEPTADO' ? 'secondary' : 'destructive'}>
                    {comprobante.estado}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

**Piezas:** `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`.

---

### 4.2 Form

Integración oficial con **React Hook Form** y **Zod**. `FormLabel`, `FormControl` y `FormMessage` se conectan automáticamente al campo: el `id`, `aria-invalid` y `aria-describedby` se generan solos.

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageForm,
} from '@/components/ui';

const esquemaEmisor = z.object({
  ruc: z.string().regex(/^\d{11}$/, 'El RUC debe tener 11 dígitos'),
});

type ValoresEmisor = z.infer<typeof esquemaEmisor>;

export function FormularioEmisor() {
  const form = useForm<ValoresEmisor>({
    resolver: zodResolver(esquemaEmisor),
    defaultValues: { ruc: '' },
  });

  return (
    <Form {...form}>
      <PageForm onSubmit={form.handleSubmit((valores) => console.log(valores))}>
        <FormField
          control={form.control}
          name="ruc"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RUC del emisor</FormLabel>
              <FormControl>
                <Input placeholder="20123456789" inputMode="numeric" maxLength={11} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Guardar emisor</Button>
      </PageForm>
    </Form>
  );
}
```

**Piezas:** `Form` (proveedor), `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`.

---

### 4.3 Alert

Banner de retroalimentación con `role="alert"`. Variantes: `default`, `info`, `success`, `warning`, `destructive`.

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';

export function AvisoContingencia() {
  return (
    <Alert variant="warning">
      <AlertTitle>SUNAT en modo contingencia</AlertTitle>
      <AlertDescription>
        Los comprobantes se resguardan en la cola local y se enviarán automáticamente al
        restablecerse la conexión.
      </AlertDescription>
    </Alert>
  );
}
```

**Piezas:** `Alert`, `AlertTitle`, `AlertDescription`.

---

### 4.4 Badge

Etiqueta compacta de estado. Variantes: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.

```tsx
import { Badge } from '@/components/ui';

export function EstadoConciliacion({ conciliado }: { conciliado: boolean }) {
  return (
    <Badge variant={conciliado ? 'secondary' : 'destructive'}>
      {conciliado ? 'Conciliado' : 'Discrepancia'}
    </Badge>
  );
}
```

**Props:** `variant`, `asChild`.

---

### 4.5 Pagination

Navegación de páginas construida sobre `Button`, con estado activo (`aria-current="page"`) y botones anterior/siguiente.

```tsx
import { useState } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui';

export function Paginador({ totalPaginas }: { totalPaginas: number }) {
  const [pagina, setPagina] = useState(1);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            disabled={pagina === 1}
            onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
          />
        </PaginationItem>
        {Array.from({ length: totalPaginas }, (_, indice) => indice + 1).map((numero) => (
          <PaginationItem key={numero}>
            <PaginationLink isActive={numero === pagina} onClick={() => setPagina(numero)}>
              {numero}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            disabled={pagina === totalPaginas}
            onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
```

**Piezas:** `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`.

---

### 4.6 FilterBar

Barra de filtros con `role="search"`. `FilterSearch` controla el texto y muestra el botón de limpieza solo cuando hay valor.

```tsx
import { useState } from 'react';
import { FilterBar, FilterItem, FilterSearch } from '@/components/ui';

export function FiltroComprobantes({ onBuscar }: { onBuscar: (texto: string) => void }) {
  const [texto, setTexto] = useState('');

  return (
    <FilterBar>
      <FilterItem>
        <FilterSearch
          value={texto}
          onChange={(valor) => {
            setTexto(valor);
            onBuscar(valor);
          }}
          onClear={() => {
            setTexto('');
            onBuscar('');
          }}
          placeholder="Buscar por RUC, serie o número"
        />
      </FilterItem>
    </FilterBar>
  );
}
```

**Piezas:** `FilterBar`, `FilterItem`, `FilterSearch`. Combina varios `FilterItem` para añadir `Select` de estado o rangos de fecha.

---

### 4.7 Dialog

Modal accesible (Radix): trampa de foco, cierre con `Escape` y botón de cierre incluido por defecto.

```tsx
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';

export function DialogoAnulacion() {
  const [abierto, setAbierto] = useState(false);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline">Anular comprobante</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular comprobante</DialogTitle>
          <DialogDescription>
            La anulación se enviará a SUNAT y no podrá revertirse.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button variant="destructive" onClick={() => setAbierto(false)}>
            Confirmar anulación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Piezas:** `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`.

---

### 4.8 Button

Acción principal con variantes (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) y tamaños (`xs`, `sm`, `default`, `lg`, `icon`, `icon-sm`, `icon-lg`).

```tsx
import { Button } from '@/components/ui';

export function BotonEmitir({ onEmitir }: { onEmitir: () => void }) {
  return (
    <Button variant="default" size="lg" onClick={onEmitir}>
      Emitir comprobante
    </Button>
  );
}
```

**Props:** `variant`, `size`, `asChild`, `fullWidth`. Usa `asChild` para delegar el render a un enlace (`react-router`), manteniendo los estilos.

---

### 4.9 Input

Campo de texto con estados de foco, error (`aria-invalid`) y deshabilitado. Acompáñalo de `PageField` para obtener etiqueta asociada por `htmlFor`.

```tsx
import { Input, PageField } from '@/components/ui';

export function CampoRuc() {
  return (
    <PageField label="RUC del emisor" htmlFor="ruc-emisor">
      <Input id="ruc-emisor" inputMode="numeric" maxLength={11} placeholder="20123456789" />
    </PageField>
  );
}
```

**Props:** todas las de `<input>` (`type`, `placeholder`, `disabled`, `aria-invalid`, …). Para formularios con validación usa `FormControl` + `FormField` (ver 4.2).

---

### 4.10 Select

Selector desplegable operable por teclado, con `placeholder` y grupos opcionales.

```tsx
import { useState } from 'react';
import {
  PageField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

export function SelectorEstado() {
  const [estado, setEstado] = useState('TODOS');

  return (
    <PageField label="Estado del comprobante" htmlFor="estado-comprobante">
      <Select value={estado} onValueChange={setEstado}>
        <SelectTrigger id="estado-comprobante">
          <SelectValue placeholder="Seleccione un estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos</SelectItem>
          <SelectItem value="ACEPTADO">Aceptado</SelectItem>
          <SelectItem value="RECHAZADO">Rechazado</SelectItem>
        </SelectContent>
      </Select>
    </PageField>
  );
}
```

**Piezas:** `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`.

---

### 4.11 Card

Contenedor modular con cabecera, acción, cuerpo y pie. `CardAction` se coloca automáticamente a la derecha de la cabecera.

```tsx
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  PageText,
} from '@/components/ui';

export function ResumenSire() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen SIRE — RVIE</CardTitle>
        <CardDescription>Periodo 2026-10</CardDescription>
        <CardAction>
          <Badge variant="outline">En revisión</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <PageText variant="muted">Ventas declaradas</PageText>
        <PageText variant="metric">S/ 128,450.00</PageText>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Ver detalle</Button>
      </CardFooter>
    </Card>
  );
}
```

**Piezas:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`.

---

### 4.12 Separator

Divisor semántico horizontal (por defecto) o vertical.

```tsx
import { Page, PageText, Separator } from '@/components/ui';

export function SeccionResumen() {
  return (
    <Page>
      <PageText>Propuestas importadas</PageText>
      <Separator />
      <PageText variant="muted">Última actualización: 16/11/2026</PageText>
    </Page>
  );
}
```

**Props:** `orientation` (`horizontal` | `vertical`), `decorative` (por defecto `true`; usa `false` cuando el divisor separe bloques con significado propio).

---

## 5. Checklist antes de crear una pantalla

- [ ] Todos los imports vienen de `@/components/ui` (nunca de `@/components/ui/<archivo>`).
- [ ] No hay `div`, `span`, `button`, `input`, `table`, `<style>` ni estilos inline en la vista.
- [ ] No hay clases Tailwind de presentación en la vista; si falta un patrón, se añade a `src/components/ui/`.
- [ ] Los formularios usan `Form` + Zod y muestran `FormMessage`.
- [ ] Las acciones destructivas piden confirmación con `Dialog` y usan `variant="destructive"`.
- [ ] El listado usa `Table` + `Pagination` y se filtra con `FilterBar`.
- [ ] La vista no supera las 120–150 líneas y delega el resto en subcomponentes.

---

## 6. Cómo añadir un componente nuevo

1. Créalo en `src/components/ui/<nombre>.tsx` con la misma convención shadcn/ui (props nativas + `data-slot`).
2. Expórtalo desde `src/components/ui/index.ts`.
3. Documenta aquí su ejemplo de uso (esta guía es de mantenimiento obligatorio).
4. Añade la prueba correspondiente en `test/`.
5. Actualiza `specs/design_system.spec.md` si incorporas un patrón visual nuevo.

---

## 7. Referencias

- [Plan Maestro de Gobernanza (`specs/Plan.md`)](../specs/Plan.md) — §3.3 Regla de una Única Fuente de UI.
- [Especificación del Sistema de Diseño (`specs/design_system.spec.md`)](../specs/design_system.spec.md) — tokens, tipografía y estados.
- [README principal](../README.md) — instalación, estructura y reglas de contribución.

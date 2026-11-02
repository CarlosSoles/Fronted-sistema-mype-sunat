import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Tabs, TabsContent, TabsList, TabsTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { Bell, FileUp, RefreshCw } from 'lucide-react';
import type { SireBookType } from '../types/sire.types';

type WorkflowTab = 'proposal' | 'excluded' | 'preliminary' | 'generated';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const bookLabel = (bookType: SireBookType) => bookType === 'RVIE_VENTAS' ? 'RVIE' : 'RCE';

const EmptyTable = ({ message }: { message: string }) => (
  <TableRow>
    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">{message}</TableCell>
  </TableRow>
);

export const SireWorkflowPanel = ({ initialRuc }: { initialRuc: string }) => {
  const [ruc, setRuc] = useState(initialRuc);
  const [period, setPeriod] = useState(currentPeriod);
  const [bookType, setBookType] = useState<SireBookType>('RVIE_VENTAS');
  const [tab, setTab] = useState<WorkflowTab>('proposal');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Flujo de propuesta SIRE</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta y administra la propuesta, el preliminar y el registro generado.
            </p>
          </div>
          <Badge variant="outline" aria-label="Estado del flujo">Borrador</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium">
            RUC
            <Input
              aria-label="RUC de la propuesta"
              inputMode="numeric"
              maxLength={11}
              value={ruc}
              onChange={(event) => setRuc(event.target.value.replace(/\D/g, '').slice(0, 11))}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Periodo (YYYYMM)
            <Input
              aria-label="Periodo de la propuesta"
              inputMode="numeric"
              maxLength={6}
              value={period}
              onChange={(event) => setPeriod(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Tipo de libro
            <select
              aria-label="Tipo de libro de la propuesta"
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              value={bookType}
              onChange={(event) => {
                if (event.target.value === 'RVIE_VENTAS' || event.target.value === 'RCE_COMPRAS') {
                  setBookType(event.target.value);
                }
              }}
            >
              <option value="RVIE_VENTAS">RVIE · Ventas</option>
              <option value="RCE_COMPRAS">RCE · Compras</option>
            </select>
          </label>
        </div>

        <Alert variant="info">
          <AlertTitle>Integración SUNAT pendiente</AlertTitle>
          <AlertDescription>
            El backend aún no expone las URL y respuestas definitivas para propuesta, preliminar, generación y tickets.
            Las acciones están bloqueadas para no enviar solicitudes con un contrato inventado.
          </AlertDescription>
        </Alert>

        <Tabs value={tab} onValueChange={(value) => setTab(value as WorkflowTab)}>
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="proposal">Propuesta</TabsTrigger>
            <TabsTrigger value="excluded">Excluidos</TabsTrigger>
            <TabsTrigger value="preliminary">Preliminar</TabsTrigger>
            <TabsTrigger value="generated">Generado</TabsTrigger>
          </TabsList>

          <TabsContent value="proposal" forceMount className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Comprobantes propuestos · {bookLabel(bookType)}</h3>
                <p className="text-sm text-muted-foreground">RUC {ruc || 'no seleccionado'} · periodo {period}</p>
              </div>
              <Button type="button" disabled title="Pendiente de contrato backend">Aceptar Propuesta Completa</Button>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Comprobante</TableHead><TableHead>Fecha</TableHead><TableHead>Total</TableHead>
                  <TableHead>CAR</TableHead><TableHead>Origen</TableHead><TableHead>Acción</TableHead>
                </TableRow></TableHeader>
                <TableBody><EmptyTable message="No hay propuesta consultada para este RUC y periodo." /></TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="excluded" forceMount className="mt-4 space-y-3">
            <div>
              <h3 className="font-semibold">Comprobantes excluidos</h3>
              <p className="text-sm text-muted-foreground">Las exclusiones requieren CAR o identificador y motivo.</p>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Comprobante</TableHead><TableHead>CAR</TableHead><TableHead>Motivo</TableHead><TableHead>Estado</TableHead><TableHead>Acción</TableHead>
                </TableRow></TableHeader>
                <TableBody><EmptyTable message="No hay comprobantes excluidos para este periodo." /></TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="preliminary" forceMount className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Preliminar</h3>
                <p className="text-sm text-muted-foreground">Solo los registros de origen USUARIO podrán eliminarse.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled title="Pendiente de contrato backend"><FileUp aria-hidden="true" />Subir TXT (Reemplazo)</Button>
                <Button type="button" disabled title="Pendiente de contrato backend">Registrar Preliminar</Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Comprobante</TableHead><TableHead>Origen</TableHead><TableHead>Total</TableHead><TableHead>Estado</TableHead><TableHead>Acción</TableHead>
                </TableRow></TableHeader>
                <TableBody><EmptyTable message="No hay registros en el preliminar para este periodo." /></TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="generated" forceMount className="mt-4 space-y-3">
            <div>
              <h3 className="font-semibold">Registro generado</h3>
              <p className="text-sm text-muted-foreground">Esta pestaña será de solo lectura cuando SUNAT confirme el estado oficial.</p>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Comprobante</TableHead><TableHead>Total</TableHead><TableHead>Estado</TableHead><TableHead>Fecha de generación</TableHead><TableHead>Registro</TableHead>
                </TableRow></TableHeader>
                <TableBody><EmptyTable message="Todavía no hay registros generados para este periodo." /></TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <section className="rounded-xl border bg-muted/30 p-4" aria-label="Monitor de tickets">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="size-4" aria-hidden="true" />
              <h3 className="font-semibold">Monitor de tickets</h3>
            </div>
            <Button type="button" variant="outline" size="sm" disabled title="Pendiente de contrato backend">
              <RefreshCw aria-hidden="true" />Actualizar
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            No hay tickets pendientes. El polling se habilitará cuando el backend confirme su contrato y estados oficiales.
          </p>
        </section>
      </CardContent>
    </Card>
  );
};

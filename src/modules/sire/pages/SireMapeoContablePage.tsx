import type { FormEvent } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
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
import { CheckCircle2, LoaderCircle, Save, TableProperties } from 'lucide-react';
import { useSireMapeoContable } from '../hooks/useSireMapeoContable';
import { SIRE_MAPEO_TIPOS, type SireMapeoTipoOperacion } from '../types/sire.types';

const TIPO_LABELS: Record<SireMapeoTipoOperacion, string> = {
  VENTAS: 'VENTAS',
  COMPRAS: 'COMPRAS',
  IGV: 'IGV',
  BASE: 'BASE',
};

/**
 * Pantalla de Mapeo Contable SIRE.
 *
 * Relaciona cada tipo de operación (VENTAS, COMPRAS, IGV y BASE) con su cuenta
 * contable. Al montar carga el mapeo guardado y al guardar envía el arreglo
 * completo a `POST /sire/mapeo-contable`.
 */
export default function SireMapeoContablePage() {
  const {
    isLoading,
    isSaving,
    values,
    error,
    saveError,
    successMessage,
    setCuenta,
    save,
    resetMessages,
  } = useSireMapeoContable();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await save();
  };

  return (
    <Page>
      <PageHeader
        title="Mapeo Contable"
        description="Asigna una cuenta contable a cada tipo de operación SIRE. Los cambios reemplazan el mapeo completo de la empresa."
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar el mapeo contable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
            {successMessage}
          </AlertTitle>
        </Alert>
      )}

      <Card flush>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableProperties className="h-4 w-4 text-primary" aria-hidden="true" />
            Cuentas contables por operación
          </CardTitle>
          <CardDescription>
            Escribe el código de cuenta contable (PCGE) que corresponde a cada operación.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Operación</TableHead>
                  <TableHead>Cuenta Contable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                        Cargando mapeo contable…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  SIRE_MAPEO_TIPOS.map((tipo) => (
                    <TableRow key={tipo}>
                      <TableCell className="font-medium">{TIPO_LABELS[tipo]}</TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Cuenta contable de ${TIPO_LABELS[tipo]}`}
                          autoComplete="off"
                          maxLength={20}
                          placeholder="Ej. 121"
                          value={values[tipo]}
                          disabled={isSaving}
                          onChange={(event) => {
                            resetMessages();
                            setCuenta(tipo, event.target.value);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {saveError && <PageText variant="error">{saveError}</PageText>}

            <div className="flex flex-wrap items-center gap-3 px-4">
              <Button type="submit" disabled={isLoading || isSaving} className="gap-2">
                {isSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {isSaving ? 'Guardando…' : 'Guardar Mapeo'}
              </Button>
              <PageText variant="caption" className="text-muted-foreground">
                Se guardan las cuatro operaciones a la vez.
              </PageText>
            </div>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}

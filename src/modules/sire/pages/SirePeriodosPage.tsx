import { useState, type FormEvent } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Page,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { LoaderCircle, Search } from 'lucide-react';
import { useSireConsultation } from '../hooks/useSireConsultation';
import {
  SIRE_BOOK_CODES,
  SIRE_BOOK_CODE_LABELS,
  type SireBookCode,
  type SirePeriodo,
} from '../types/sire.types';
import { getBookCodeFeedback } from '../validators/sireSchema';

const SIN_DATO = '—';

const PeriodosTable = ({ periods }: { periods: SirePeriodo[] }) => (
  <div className="overflow-x-auto rounded-xl border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Periodo</TableHead>
          <TableHead>Libro</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead align="right">Registros</TableHead>
          <TableHead>Inicio</TableHead>
          <TableHead>Fin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {periods.length ? (
          periods.map((periodo, index) => (
            <TableRow key={`${periodo.period}-${index}`}>
              <TableCell>{periodo.period}</TableCell>
              <TableCell>{periodo.bookCode ?? SIN_DATO}</TableCell>
              <TableCell>{periodo.status ?? SIN_DATO}</TableCell>
              <TableCell align="right">{periodo.recordCount ?? SIN_DATO}</TableCell>
              <TableCell>{periodo.startDate ?? SIN_DATO}</TableCell>
              <TableCell>{periodo.endDate ?? SIN_DATO}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} align="center">
              SUNAT no devolvió periodos para el libro consultado.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);

export default function SirePeriodosPage() {
  const [bookCode, setBookCode] = useState<SireBookCode | ''>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const {
    isLoading,
    statusMessage,
    error,
    jobStatus,
    messageId,
    periods,
    consultar,
    limpiar,
  } = useSireConsultation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const bookCodeError = getBookCodeFeedback(bookCode);

    if (bookCodeError || !bookCode) {
      setValidationError(bookCodeError ?? 'El código de libro es obligatorio.');
      return;
    }

    setValidationError(null);
    await consultar({ bookCode: bookCode as SireBookCode });
  };

  const errorMessage = validationError ?? error;

  return (
    <Page>
      <PageHeader
        title="Consulta de periodos SIRE"
        description="Consulta a SUNAT los periodos de un libro. El backend procesa la solicitud en segundo plano y el frontend sigue su avance hasta que concluye."
      />
      <Card>
        <CardHeader>
          <CardTitle>Datos de consulta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <label className="block max-w-sm space-y-1.5 text-sm font-medium">
              Código de libro
              <Select
                value={bookCode}
                disabled={isLoading}
                onValueChange={(value) => {
                  setBookCode(value as SireBookCode);
                  setValidationError(null);
                  limpiar();
                }}
              >
                <SelectTrigger aria-label="Código de libro" className="h-9">
                  <SelectValue placeholder="Selecciona el libro" />
                </SelectTrigger>
                <SelectContent>
                  {SIRE_BOOK_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {SIRE_BOOK_CODE_LABELS[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4" aria-hidden="true" />
              )}
              {isLoading ? 'Consultando a SUNAT...' : 'Consultar'}
            </Button>
          </form>

          {isLoading && (
            <div role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Consultando a SUNAT...</span>
            </div>
          )}

          {!isLoading && statusMessage && (
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              {statusMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo completar la consulta de periodos</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {jobStatus === 'COMPLETED' && periods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Periodos devueltos por SUNAT</CardTitle>
            <p className="text-sm text-muted-foreground">
              {messageId ? `Identificador de la consulta: ${messageId}` : 'Consulta completada.'}
            </p>
          </CardHeader>
          <CardContent>
            <PeriodosTable periods={periods} />
          </CardContent>
        </Card>
      )}
    </Page>
  );
}

import { Link } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Page,
  PageHeader,
  PageText,
} from '@/components/ui';
import { ArrowRight, LoaderCircle, Upload } from 'lucide-react';
import { useSireProposalImport } from '../hooks/useSireProposalImport';

/**
 * Importación real de una propuesta SIRE.
 *
 * Envía `multipart/form-data` a `POST /sire/importar` con `file`, `periodo` y
 * `libro`. El backend responde 202 con un `messageId` y procesa el archivo en
 * segundo plano.
 */
export default function SireImportarPropuestaPage() {
  const {
    period,
    bookType,
    file,
    loading,
    error,
    result,
    handleSubmit,
    changePeriod,
    changeBookType,
    selectFile,
  } = useSireProposalImport();

  return (
    <Page>
      <PageHeader
        title="Importar propuesta SIRE"
        description="Carga una propuesta oficial de SUNAT en formato .txt o .zip. El backend usa las credenciales globales de la empresa y procesa el archivo en segundo plano."
      />

      <Card>
        <CardHeader>
          <CardTitle>Archivo de propuesta SIRE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <label className="block max-w-xs space-y-1.5 text-sm font-medium">
              Periodo fiscal (YYYYMM)
              <Input
                aria-label="Periodo fiscal (YYYYMM)"
                inputMode="numeric"
                maxLength={6}
                placeholder="202610"
                value={period}
                disabled={loading}
                onChange={(event) => {
                  changePeriod(event.target.value.replace(/\D/g, '').slice(0, 6));
                }}
              />
            </label>

            <label className="block max-w-xs space-y-1.5 text-sm font-medium">
              Libro
              <select
                aria-label="Libro"
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                value={bookType}
                disabled={loading}
                onChange={(event) => changeBookType(event.target.value)}
              >
                <option value="RVIE_VENTAS">RVIE · Ventas</option>
                <option value="RCE_COMPRAS">RCE · Compras</option>
              </select>
            </label>

            <label className="block max-w-md space-y-1.5 text-sm font-medium">
              Archivo (.txt o .zip)
              <Input
                aria-label="Archivo SIRE (.txt o .zip)"
                key={file?.name ?? 'no-file'}
                type="file"
                accept=".txt,.zip,text/plain,application/zip"
                disabled={loading}
                onChange={(event) => {
                  selectFile(event.target.files?.[0] ?? null);
                }}
              />
            </label>

            <PageText variant="caption" className="text-muted-foreground">
              Nombre oficial recomendado: LE&lt;RUC&gt;-&lt;RVIE|RCE&gt;-&lt;AAAAMM&gt;.zip o .txt.
              Máximo 5 MiB.
            </PageText>

            {file && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {file.name} · {(file.size / 1024).toFixed(1)} KB
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="px-1"
                  disabled={loading}
                  onClick={() => selectFile(null)}
                >
                  Cancelar selección
                </Button>
              </div>
            )}

            <Button type="submit" disabled={loading || !file}>
              {loading ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Upload aria-hidden="true" />
              )}
              {loading ? 'Importando…' : 'Importar'}
            </Button>
          </form>

          {loading && (
            <p role="status" className="text-sm text-muted-foreground">
              Enviando el archivo al backend…
            </p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo importar la propuesta</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert variant="success">
              <AlertTitle>Importación recibida</AlertTitle>
              <AlertDescription>
                {result.nombreArchivo} quedó registrado para el periodo {result.periodo} (
                {result.libro}) con estado {result.estado}. Identificador:{' '}
                <span className="font-mono text-xs">{result.messageId}</span>. El backend continúa
                procesando el archivo en segundo plano.
              </AlertDescription>
            </Alert>
          )}

          <Button variant="link" asChild className="px-0">
            <Link to="/sire/periodos">
              Ir a consulta de periodos <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </Page>
  );
}

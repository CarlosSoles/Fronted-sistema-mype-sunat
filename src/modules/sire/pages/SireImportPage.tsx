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
} from '@/components/ui';
import { ArrowRight, LoaderCircle, Upload } from 'lucide-react';
import { useSireProposalImport } from '../hooks/useSireProposalImport';

export default function SireImportPage() {
  const { period, bookType, file, loading, error, result, handleSubmit, changePeriod, changeBookType, selectFile } =
    useSireProposalImport();

  return (
    <Page>
      <PageHeader
        title="Importar propuesta SIRE"
        description="Importa una propuesta en el formato interno provisional y continúa con la conciliación."
      />
      <Alert variant="warning">
        <AlertTitle>Formato interno provisional — no oficial SUNAT</AlertTitle>
        <AlertDescription>
          La importación usa un formato interno provisional de 9 columnas y no el layout oficial SUNAT. No uses este
          flujo para cargar archivos oficiales. Formato sujeto a cambios según resolución oficial de SUNAT.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>Archivo de propuesta</CardTitle>
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
                onChange={(event) => {
                  changeBookType(event.target.value);
                }}
              >
                <option value="RVIE_VENTAS">RVIE · Ventas</option>
                <option value="RCE_COMPRAS">RCE · Compras</option>
              </select>
            </label>
            <Input
              aria-label="Archivo TXT provisional"
              key={file?.name ?? 'no-file'}
              type="file"
              accept=".txt,text/plain"
              disabled={loading}
              onChange={(event) => {
                selectFile(event.target.files?.[0] ?? null);
              }}
            />
            {file && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{file.name} · {(file.size / 1024).toFixed(1)} KB</span>
                <Button type="button" variant="link" className="px-1" disabled={loading} onClick={() => {
                  selectFile(null);
                }}>
                  Cancelar selección
                </Button>
              </div>
            )}
            <Button type="submit" disabled={loading || !file}>
              {loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
              {loading ? 'Importando…' : 'Importar propuesta'}
            </Button>
          </form>
          {loading && <p role="status">La importación está pendiente de respuesta del servidor.</p>}
          <p className="text-xs text-muted-foreground">
            Formato esperado: RUC|tipo|serie|correlativo|fecha (YYYY-MM-DD)|base|IGV|total|CAR. Máximo 5 MiB.
          </p>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo importar la propuesta</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {result && (
            <Alert variant={result.rejected > 0 || result.imported === 0 ? 'warning' : 'success'}>
              <AlertTitle>
                {result.rejected > 0
                  ? result.imported > 0 ? 'Importación parcial' : 'No se importaron comprobantes'
                  : result.imported > 0 ? 'Importación completada' : 'Importación sin comprobantes'}
              </AlertTitle>
              <AlertDescription>
                Se importaron {result.imported} filas y se rechazaron {result.rejected}.
                {result.errors.length > 0 && (
                  <ul className="mt-2 list-disc pl-5">
                    {result.errors.map((item) => (
                      <li key={`${item.line}-${item.reason}`}>
                        Línea {item.line}: {item.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
          <Button variant="link" asChild className="px-0">
            <Link to="/sire/conciliacion">
              Ir a conciliación disponible <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </Page>
  );
}

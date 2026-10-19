import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardHeader, CardTitle, Input, Page, PageHeader } from '@/components/ui';
import { ArrowRight, Clock3, Upload } from 'lucide-react';

export default function SireImportPage() {
  const [period, setPeriod] = useState('');

  return (
    <Page>
      <PageHeader
        title="Importar propuesta SIRE"
        description="Selecciona el periodo fiscal y prepara la propuesta de SUNAT."
      />
      <Alert variant="warning">
        <Clock3 aria-hidden="true" />
        <AlertTitle>Próximamente</AlertTitle>
        <AlertDescription>
          La importación TXT aún no está disponible en el backend. No se enviará ni procesará ningún archivo.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>Archivo de propuesta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block max-w-xs space-y-1.5 text-sm font-medium">
            Periodo fiscal (YYYYMM)
            <Input
              aria-label="Periodo fiscal (YYYYMM)"
              inputMode="numeric"
              maxLength={6}
              placeholder="202610"
              value={period}
              onChange={(event) => setPeriod(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <Input
            aria-label="Archivo TXT de SUNAT"
            type="file"
            accept=".txt,text/plain"
            disabled
          />
          <Button type="button" disabled>
            <Upload aria-hidden="true" />
            Importar propuesta
            <span className="sr-only"> (próximamente)</span>
          </Button>
          <p className="text-xs text-muted-foreground">
            El selector y la importación estarán disponibles cuando se publique el endpoint y el layout oficial.
          </p>
          <Button variant="link" asChild className="px-0">
            <Link to="/sire/conciliacion">Ir a conciliación disponible <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </CardContent>
      </Card>
    </Page>
  );
}

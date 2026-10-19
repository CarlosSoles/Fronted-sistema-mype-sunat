import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, Page, PageGrid, PageHeader, PageText } from '@/components/ui';
import { ArrowRight, FileOutput } from 'lucide-react';
import { useSireReconciliationStore } from '../stores/sireReconciliationStore';

const metrics = [
  ['porcentajeCumplimiento', 'Porcentaje de cumplimiento', '%'],
  ['coincidenciaExacta', 'Coincidencias exactas', ''],
  ['diferenciaMontos', 'Diferencias de montos', ''],
  ['omisionLocal', 'Omisiones en ERP', ''],
  ['omisionSunat', 'Omisiones en SUNAT', ''],
  ['duplicadoLlave', 'Llaves duplicadas', ''],
] as const;

export default function SireClosurePage() {
  const { period, summary } = useSireReconciliationStore();

  return (
    <Page>
      <PageHeader
        title="Resumen de cierre SIRE"
        description={period
          ? `Métricas del periodo ${period}, informadas por el backend.`
          : 'Revisa las métricas del periodo antes del cierre fiscal.'}
      />
      {!summary && (
        <Alert variant="info">
          <AlertTitle>Resumen pendiente de conciliación</AlertTitle>
          <AlertDescription>
            Inicia el cruce para obtener las métricas calculadas por el backend para el periodo.
          </AlertDescription>
        </Alert>
      )}
      <PageGrid columns={3}>
        {metrics.map(([key, label, suffix]) => (
          <Card key={key}>
            <CardContent>
              <PageText variant="caption">{label}</PageText>
              <PageText variant="metric">
                {summary ? `${summary[key].toFixed(key === 'porcentajeCumplimiento' ? 2 : 0)}${suffix}` : '—'}
              </PageText>
            </CardContent>
          </Card>
        ))}
      </PageGrid>
      <Card>
        <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            La generación de archivos de reemplazo aún no está habilitada en el backend.
          </p>
          <Button type="button" disabled>
            <FileOutput aria-hidden="true" />
            Generar archivo de reemplazo · Próximamente
          </Button>
        </CardContent>
      </Card>
      <Button variant="outline" asChild>
        <Link to="/sire/conciliacion">Ir a conciliación <ArrowRight aria-hidden="true" /></Link>
      </Button>
    </Page>
  );
}

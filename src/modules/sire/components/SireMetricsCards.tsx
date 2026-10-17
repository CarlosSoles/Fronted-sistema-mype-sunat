import { Card, CardContent, PageGrid, PageText } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';
import { type SireReconciliationSummary } from '../types/sire.types';

interface Props {
  summary: SireReconciliationSummary;
}

export const SireMetricsCards = ({ summary }: Props) => (
  <PageGrid columns={3}>
    <Card>
      <CardContent>
        <PageText variant="caption">Total SUNAT</PageText>
        <PageText variant="metric">{formatCurrency(summary.totalPropuestaSunat, 'PEN')}</PageText>
      </CardContent>
    </Card>
    <Card>
      <CardContent>
        <PageText variant="caption">Total ERP</PageText>
        <PageText variant="metric">{formatCurrency(summary.totalRegistroLocal, 'PEN')}</PageText>
      </CardContent>
    </Card>
    <Card>
      <CardContent>
        <PageText variant="caption">Discrepancias</PageText>
        <PageText variant="metric-destructive">{summary.comprobantesConDiscrepancia}</PageText>
      </CardContent>
    </Card>
  </PageGrid>
);

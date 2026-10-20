/**
 * Panel del Monitor Outbox y Auditoría CDR (pestaña 4, M1).
 *
 * Resume el estado de la cola `pg-boss`, el histórico de códigos CDR y expone
 * los accesos rápidos a descargas de XML/CDR del periodo.
 */
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageGrid,
  PageText,
} from '@/components/ui';
import { Download, Layers, ShieldCheck } from 'lucide-react';
import type { ComprobanteDemo } from '../data/invoiceDemoData';
import type { ResumenFiscal } from '../lib/invoiceMetrics';

interface InvoiceOutboxMonitorProps {
  comprobantes: readonly ComprobanteDemo[];
  resumen: ResumenFiscal;
}

/** Distribución de códigos CDR del periodo. */
const contarCodigosCdr = (
  comprobantes: readonly ComprobanteDemo[],
): Array<{ codigo: string; total: number }> => {
  const mapa = new Map<string, number>();

  comprobantes.forEach((c) => {
    const codigo = c.cdrCodigo ?? 'PENDIENTE';
    mapa.set(codigo, (mapa.get(codigo) ?? 0) + 1);
  });

  return [...mapa.entries()]
    .map(([codigo, total]) => ({ codigo, total }))
    .sort((a, b) => b.total - a.total);
};

export const InvoiceOutboxMonitor = ({
  comprobantes,
  resumen,
}: InvoiceOutboxMonitorProps) => {
  const codigos = contarCodigosCdr(comprobantes);
  const pendientes = comprobantes.filter((c) => c.estado === 'EN_COLA');

  return (
    <PageGrid columns={2}>
      <Card>
        <CardHeader>
          <CardTitle>Cola Outbox (pg-boss)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers aria-hidden="true" />
            <PageText variant="metric">{resumen.enCola}</PageText>
            <Badge variant="secondary" className="text-[10px]">
              pendientes
            </Badge>
          </div>
          <PageText variant="caption">
            Tiempo de despacho promedio:{' '}
            {resumen.despachoPromedioMs > 0
              ? `${resumen.despachoPromedioMs} ms`
              : 'sin registros'}
          </PageText>

          {pendientes.length > 0 ? (
            pendientes.map((c) => (
              <PageText key={c.id} variant="caption">
                {c.serie}-{c.correlativo} · en espera desde{' '}
                {c.fechaEmision}
              </PageText>
            ))
          ) : (
            <PageText variant="caption">
              No hay comprobantes pendientes de despacho.
            </PageText>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auditoría CDR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" />
            <PageText variant="metric">{comprobantes.length}</PageText>
            <Badge variant="secondary" className="text-[10px]">
              respuestas
            </Badge>
          </div>

          {codigos.map((item) => (
            <div
              key={item.codigo}
              className="flex items-center justify-between"
            >
              <PageText variant="caption">
                Código {item.codigo}
              </PageText>
              <Badge variant="outline" className="text-[10px]">
                {item.total}
              </Badge>
            </div>
          ))}

          <Button variant="outline" size="sm">
            <Download aria-hidden="true" />
            Descargar CDR del periodo
          </Button>
        </CardContent>
      </Card>
    </PageGrid>
  );
};

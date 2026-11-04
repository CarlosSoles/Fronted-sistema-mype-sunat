/**
 * Barra de métricas del módulo de facturación (TA-69).
 *
 * POR QUÉ EXISTE SI YA HAY `InvoiceKpiCards`
 *
 * `InvoiceKpiCards` calcula sus cifras en el navegador, sobre los comprobantes
 * que la grilla tiene cargados. Eso da números que cambian según la página que
 * el usuario esté viendo: en la página 1 dice una cosa y en la 3 otra, y nunca
 * cuenta lo que quedó fuera del filtro. Sirve para la consola, no para informar
 * un periodo.
 *
 * Esta barra consume `GET /api/v1/invoices/metrics`, que suma en el servidor
 * sobre TODA la empresa y el periodo. La diferencia importa: el docente (o el
 * contador) pregunta cuánto se facturó en el mes, no en la página visible.
 *
 * LAS CIFRAS NO SE RECALCULAN AQUÍ
 *
 * El backend ya devuelve `facturado` con las notas de crédito restadas. Volver
 * a restarlas en el front daría un total distinto al que muestra el backend, y
 * dos cifras del mismo periodo en la misma pantalla es peor que ninguna.
 */
import {
  Badge,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  PageGrid,
  PageText,
} from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';
import type { MetricasFacturacion } from '../lib/invoiceMetricsPeriodo';

interface InvoiceMetricsSummaryBarProps {
  metricas: MetricasFacturacion;
  /** `true` mientras se recargan las métricas (mantiene la cifra anterior). */
  cargando?: boolean;
}

/** Redondeo para mostrar porcentajes sin decimales innecesarios. */
const porcentaje = (valor: number): string => {
  const limpio = Math.round(valor * 10) / 10;
  return Number.isInteger(limpio) ? `${limpio}%` : `${limpio.toFixed(1)}%`;
};

export const InvoiceMetricsSummaryBar = ({
  metricas,
  cargando = false,
}: InvoiceMetricsSummaryBarProps) => {
  const aceptacion =
    metricas.aceptados + metricas.rechazados > 0
      ? porcentaje(metricas.tasaAceptacion)
      : 'Sin procesar';

  return (
    <PageGrid columns={4} data-metrics="invoices-periodo">
      <Card size="sm" data-kpi="facturado">
        <CardHeader>
          <CardTitle>Facturado del periodo</CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[10px]">
              {cargando ? 'Actualizando…' : metricas.periodo}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <PageText className="text-2xl font-semibold">
            {formatCurrency(metricas.facturado)}
          </PageText>
          <PageText className="text-xs text-muted-foreground">
            Neto con notas de crédito restadas ({formatCurrency(metricas.acreditado)})
          </PageText>
        </CardContent>
      </Card>

      <Card size="sm" data-kpi="emitidos">
        <CardHeader>
          <CardTitle>Comprobantes emitidos</CardTitle>
          <CardAction>
            <Badge variant="secondary" className="text-[10px]">
              Bruto {formatCurrency(metricas.facturadoBruto)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <PageText className="text-2xl font-semibold">{metricas.emitidos}</PageText>
          <PageText className="text-xs text-muted-foreground">
            {metricas.pendientes - metricas.erroresRed} en espera de SUNAT
          </PageText>
        </CardContent>
      </Card>

      {/*
        Tarjeta propia para los ERROR_RED.

        Antes se contaban dentro de "pendientes", y eso describía mal el estado:
        un pendiente espera respuesta de SUNAT, mientras que un error de red es
        un envío que FALLÓ. El backend ya no suma su importe a lo facturado, así
        que la pantalla no puede seguir llamándolos "pendientes" sin
        contradecirlo.

        Solo se pinta cuando hay alguno: con cero, una tarjeta vacía más solo
        ocupa sitio.
      */}
      {metricas.erroresRed > 0 && (
        <Card size="sm" data-kpi="errores-red">
          <CardHeader>
            <CardTitle>Sin confirmar</CardTitle>
            <CardAction>
              <Badge variant="destructive" className="text-[10px]">
                Reintentar
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <PageText className="text-2xl font-semibold">
              {metricas.erroresRed}
            </PageText>
            <PageText className="text-xs text-muted-foreground">
              Falló el envío. Su importe NO está en lo facturado
            </PageText>
          </CardContent>
        </Card>
      )}

      <Card size="sm" data-kpi="aceptacion">
        <CardHeader>
          <CardTitle>Tasa de aceptación</CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[10px]">
              {metricas.aceptados} aceptado(s)
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <PageText className="text-2xl font-semibold">{aceptacion}</PageText>
          <PageText className="text-xs text-muted-foreground">
            Sobre los comprobantes ya procesados por SUNAT
          </PageText>
        </CardContent>
      </Card>

      <Card size="sm" data-kpi="rechazados">
        <CardHeader>
          <CardTitle>Rechazados</CardTitle>
          <CardAction>
            <Badge
              variant={metricas.rechazados > 0 ? 'destructive' : 'outline'}
              className="text-[10px]"
            >
              {metricas.rechazados > 0 ? 'Requieren corrección' : 'Sin rechazos'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <PageText className="text-2xl font-semibold">{metricas.rechazados}</PageText>
          <PageText className="text-xs text-muted-foreground">
            No cuentan como venta ante SUNAT
          </PageText>
        </CardContent>
      </Card>
    </PageGrid>
  );
};

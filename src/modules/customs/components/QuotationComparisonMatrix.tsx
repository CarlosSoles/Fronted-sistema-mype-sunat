import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  type ImportQuotationRecord,
  type ProformaRecord,
} from '../services/importQuotationsApi';
import { useAwardProforma, useDeleteProforma } from '../hooks/useImportQuotations';
import {
  Trophy,
  CheckCircle2,
  Ship,
  Trash2,
  Archive,
  Package,
  Plus,
} from 'lucide-react';

interface QuotationComparisonMatrixProps {
  quotation: ImportQuotationRecord;
  onOpenAddProforma: () => void;
  onOrderCreated?: (orderId: string) => void;
}

export const QuotationComparisonMatrix: React.FC<QuotationComparisonMatrixProps> = ({
  quotation,
  onOpenAddProforma,
  onOrderCreated,
}) => {
  const awardMutation = useAwardProforma();
  const deleteMutation = useDeleteProforma();

  const handleAward = async (proforma: ProformaRecord) => {
    const confirmText = `¿Confirmas adjudicar la cotización a "${proforma.supplierName}" por un valor FOB de $${proforma.totalFob.toFixed(2)} USD?\n\nAl confirmar:\n1. Esta proforma se convertirá en la Orden de Compra Internacional definitiva.\n2. Las demás opciones pasarán a la cartera de proveedores descartados pero calificados.`;
    if (!window.confirm(confirmText)) return;

    try {
      const res = await awardMutation.mutateAsync({
        quotationId: quotation.id,
        proformaId: proforma.id,
      });
      alert(`¡Orden de compra ${res.generatedOrder.orderNumber} generada con éxito!`);
      if (onOrderCreated) {
        onOrderCreated(res.generatedOrder.id);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al adjudicar la cotización.');
    }
  };

  const handleDelete = async (proformaId: string) => {
    if (!window.confirm('¿Seguro de eliminar esta oferta de la mesa de negociación?')) return;
    try {
      await deleteMutation.mutateAsync({ quotationId: quotation.id, proformaId });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al eliminar la proforma.');
    }
  };

  const proformas = quotation.proformas || [];
  const requestedItems = quotation.items || [];
  const isAwarded = quotation.status === 'ADJUDICADA';
  const minFob = proformas.length > 0 ? Math.min(...proformas.map((p) => p.totalFob)) : 0;

  return (
    <div className="space-y-4">
      {/* Banner del Requerimiento General */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-card border rounded-lg">
        <div>
          <span className="text-xs text-muted-foreground block font-medium">Mesa de Negociación Activa:</span>
          <span className="text-base font-bold text-foreground">{quotation.title}</span>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="font-mono text-[10px]">
              {quotation.quotationNumber}
            </Badge>
            <Badge
              variant={
                quotation.status === 'ADJUDICADA'
                  ? 'default'
                  : quotation.status === 'CANCELADA'
                  ? 'destructive'
                  : 'secondary'
              }
              className="text-[10px]"
            >
              {quotation.status === 'ADJUDICADA'
                ? '✅ Negociación Adjudicada'
                : quotation.status === 'CANCELADA'
                ? 'Cancelada'
                : '🟡 En Negociación / Evaluación'}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              Incoterm Obj.: <b>{quotation.targetIncoterm || 'FOB'}</b> · Moneda: <b>{quotation.targetCurrency || 'USD'}</b>
            </span>
            {quotation.order && (
              <span className="text-xs text-primary font-bold">
                Orden Vinculada: {quotation.order.orderNumber}
              </span>
            )}
          </div>
        </div>

        {!isAwarded && (
          <Button onClick={onOpenAddProforma} size="sm" className="font-semibold gap-1.5 text-xs shadow-xs">
            <Plus className="h-3.5 w-3.5" />
            + Registrar Oferta de Proveedor
          </Button>
        )}
      </div>

      {/* Sección: Productos e Ítems Solicitados en esta Negociación */}
      <Card className="border shadow-xs">
        <CardHeader className="p-3 pb-2 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
              <Package className="h-3.5 w-3.5 text-primary" />
              Productos Requeridos del Inventario para esta Importación ({requestedItems.length})
            </span>
            {quotation.notes && (
              <span className="text-[11px] text-muted-foreground italic truncate max-w-md">
                Notas: {quotation.notes}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {requestedItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Descripción del Producto</th>
                    <th className="p-2.5 text-right">Cant. Solicitada</th>
                    <th className="p-2.5 text-center">Unidad</th>
                    <th className="p-2.5 text-right">Precio Target Est.</th>
                    <th className="p-2.5">Partida Arancelaria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {requestedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="p-2.5 font-mono font-semibold text-primary">{item.sku || 'S/N'}</td>
                      <td className="p-2.5 font-medium">{item.description}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{item.quantity}</td>
                      <td className="p-2.5 text-center text-muted-foreground">{item.unitCode || 'NIU'}</td>
                      <td className="p-2.5 text-right font-mono">
                        {item.targetPrice ? `$${Number(item.targetPrice).toFixed(2)}` : 'N/A'}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-muted-foreground">{item.hsCode || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground">
              {quotation.title} (Requerimiento general sin desglose detallado de ítems).
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección: Mesa de Proveedores Competidores */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <Ship className="h-4 w-4 text-primary" />
              Mesa Comparativa de Proveedores Extranjeros ({proformas.length} cotizaciones)
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Compara precios FOB, costos de flete y seguro (CIF estimado), plazos de entrega y términos comerciales.
            </p>
          </div>
        </div>

        {proformas.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/10 space-y-3">
            <Ship className="h-10 w-10 text-muted-foreground mx-auto" />
            <h4 className="font-bold text-sm text-foreground">Aún no hay ofertas registradas en esta negociación</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Para seleccionar la mejor opción comercial, registra las cotizaciones de mínimo 3 a 4 proveedores extranjeros que suministren estos productos.
            </p>
            <Button onClick={onOpenAddProforma} size="sm" className="font-semibold gap-1.5 mt-2">
              <Plus className="h-3.5 w-3.5" />
              Registrar Oferta de Proveedor
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {proformas.map((p) => {
              const isWinner = p.status === 'GANADORA';
              const isDiscarded = p.status === 'DESCARTADA_EN_CARTERA';
              const isBestPrice = p.totalFob === minFob && proformas.length > 1;

              return (
                <Card
                  key={p.id}
                  className={`border-2 transition-shadow text-xs flex flex-col justify-between ${
                    isWinner
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-md'
                      : isDiscarded
                      ? 'border-border/60 opacity-85 bg-muted/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <CardHeader className="p-3.5 pb-2 border-b border-border/40">
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <span className="font-bold text-xs text-foreground block line-clamp-1">
                          {p.supplierName}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          País: <b>{p.supplierCountry}</b> · Proforma: <b className="font-mono">{p.proformaNumber}</b>
                        </span>
                      </div>
                      {isWinner ? (
                        <Badge className="bg-emerald-600 text-white text-[9px] gap-1 shrink-0">
                          <Trophy className="h-3 w-3" /> GANADOR
                        </Badge>
                      ) : isDiscarded ? (
                        <Badge variant="secondary" className="text-[9px] shrink-0">
                          <Archive className="h-3 w-3 mr-0.5" /> En Cartera
                        </Badge>
                      ) : isBestPrice ? (
                        <Badge variant="outline" className="text-[9px] border-emerald-500 text-emerald-600 shrink-0">
                          Mejor Precio
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>

                  <CardContent className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Resumen Financiero */}
                      <div className="p-2 rounded bg-muted/40 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-[11px]">Total FOB:</span>
                          <span className="font-mono font-bold text-sm text-foreground">
                            ${p.totalFob.toFixed(2)} {p.currencyCode}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground">Flete + Seguro Est.:</span>
                          <span className="font-mono">${(p.estimatedFreight + p.estimatedInsurance).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] pt-1 border-t border-border/50">
                          <span className="font-semibold text-primary">Total CIF Est.:</span>
                          <span className="font-mono font-bold text-primary">
                            ${p.totalCif.toFixed(2)} {p.currencyCode}
                          </span>
                        </div>
                      </div>

                      {/* Condiciones Logísticas */}
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between py-0.5 border-b border-border/30">
                          <span className="text-muted-foreground">Incoterm:</span>
                          <span className="font-bold text-foreground">{p.incoterm}</span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-border/30">
                          <span className="text-muted-foreground">Puerto Origen:</span>
                          <span className="font-medium">{p.originPort || 'No esp.'}</span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-border/30">
                          <span className="text-muted-foreground">Plazo Entrega:</span>
                          <span className="font-medium font-mono">{p.leadTimeDays ?? 30} días</span>
                        </div>
                        <div className="py-0.5">
                          <span className="text-muted-foreground block text-[10px]">Pago:</span>
                          <span className="font-medium text-[11px] line-clamp-2">{p.paymentTerms || 'Contado / T/T'}</span>
                        </div>
                      </div>

                      {/* Desglose de Ítems Cotizados por este Proveedor */}
                      <div className="pt-2 border-t border-border/40">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                          Productos Cotizados ({p.items?.length || 0}):
                        </span>
                        <ul className="space-y-1 text-[11px]">
                          {(p.items || []).slice(0, 3).map((it, idx) => (
                            <li key={idx} className="flex justify-between text-muted-foreground">
                              <span className="truncate max-w-[130px]">{it.description}</span>
                              <span className="font-mono shrink-0">
                                {it.quantity} x ${it.unitPrice.toFixed(2)}
                              </span>
                            </li>
                          ))}
                          {(p.items || []).length > 3 && (
                            <li className="text-[10px] text-muted-foreground italic">
                              + {p.items.length - 3} ítems adicionales...
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="pt-3 border-t border-border/40 space-y-1.5">
                      {!isAwarded && (
                        <Button
                          size="sm"
                          onClick={() => handleAward(p)}
                          disabled={awardMutation.isPending}
                          className="w-full font-bold gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Adjudicar y Comprar
                        </Button>
                      )}

                      {!isAwarded && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(p.id)}
                          disabled={deleteMutation.isPending}
                          className="w-full h-6 text-[10px] text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Descartar Oferta
                        </Button>
                      )}

                      {isWinner && (
                        <div className="text-center p-2 rounded bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
                          Proforma Ganadora Adjudicada
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

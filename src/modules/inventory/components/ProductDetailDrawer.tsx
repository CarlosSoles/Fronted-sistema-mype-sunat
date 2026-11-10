import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Package,
  BookOpen,
  Edit2,
  Globe,
  Scale,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  MapPin,
  Layers,
} from 'lucide-react';
import { type InventoryBalance } from '../types/inventory.types';

interface ProductDetailDrawerProps {
  product: InventoryBalance | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: InventoryBalance) => void;
  onOpenKardex: (sku: string) => void;
}

const SUNAT_TYPES: Record<string, string> = {
  '01': '01 - Mercaderías',
  '02': '02 - Productos Terminados',
  '03': '03 - Materias Primas',
  '04': '04 - Envases y Embalajes',
  '05': '05 - Materiales Auxiliares y Suministros',
  '07': '07 - Repuestos y Accesorios',
  '99': '99 - Otros',
};

const money = (n: number | null | undefined) =>
  typeof n === 'number'
    ? `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onOpenKardex,
}) => {
  if (!product) return null;

  const isLowStock =
    typeof product.minStockAlert === 'number' &&
    product.minStockAlert > 0 &&
    product.currentStock <= product.minStockAlert;

  const isImported = (product as any).origin_type === 'IMPORTADO';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto text-xs">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-base text-primary">
                  {product.sku}
                </span>
                <Badge
                  variant={isImported ? 'default' : 'secondary'}
                  className={isImported ? 'bg-blue-600 text-white text-[10px]' : 'text-[10px]'}
                >
                  {isImported ? '🌐 IMPORTADO' : '🇵🇪 NACIONAL'}
                </Badge>
                {product.brand && (
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {product.brand}
                  </Badge>
                )}
                {product.category && (
                  <Badge variant="outline" className="text-[10px]">
                    {product.category}
                  </Badge>
                )}
                {(product as any).warehouse_location && (
                  <Badge variant="secondary" className="text-[10px] flex items-center gap-1 font-mono">
                    <MapPin className="h-3 w-3" /> {(product as any).warehouse_location}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-sm font-semibold text-foreground mt-1">
                {product.description}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Alerta de Stock Mínimo si aplica */}
          {isLowStock && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Alerta de Reabastecimiento:</strong> El stock actual ({product.currentStock}) ha alcanzado o está por debajo del umbral mínimo configurado ({product.minStockAlert} {product.sunatUnitCode || 'NIU'}).
              </span>
            </div>
          )}

          {/* TARJETAS DE SALDO Y VALORIZACIÓN ACTUAL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-3 bg-card border-border/80">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                Stock Físico Actual
              </span>
              <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                {product.currentStock.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {product.sunatUnitCode || 'NIU'}
                </span>
              </p>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <Building2 className="h-3 w-3" /> Almacén: {product.warehouseCode || 'ALM-01'}
              </span>
            </Card>

            <Card className="p-3 bg-card border-border/80">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                Costo Promedio (CPP)
              </span>
              <p className="text-xl font-bold font-mono text-primary mt-0.5">
                S/ {product.averageUnitCost.toFixed(4)}
              </p>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <Scale className="h-3 w-3" /> Promedio Ponderado Móvil
              </span>
            </Card>

            <Card className="p-3 bg-card border-border/80">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                Valor Total Inventario
              </span>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                S/ {product.totalInventoryValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <DollarSign className="h-3 w-3" /> Base Imponible PEN
              </span>
            </Card>
          </div>

          {/* PRECIOS Y REGLAS COMERCIALES (OBS 11, 13) */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground uppercase tracking-wider text-[11px]">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              Estructura de Precios de Venta y Márgenes
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card p-2 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Costo Referencial:</span>
                <span className="font-mono font-bold text-foreground">{money((product as any).cost_price ?? product.averageUnitCost)}</span>
              </div>
              <div className="bg-card p-2 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Precio Venta (Minorista):</span>
                <span className="font-mono font-bold text-emerald-600">{money((product as any).sale_price)}</span>
              </div>
              <div className="bg-card p-2 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Precio Mayorista:</span>
                <span className="font-mono font-bold text-foreground">{money((product as any).wholesale_price)}</span>
              </div>
              <div className="bg-card p-2 rounded border">
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Precio Promo:</span>
                <span className="font-mono font-bold text-amber-600">{money((product as any).promo_price)}</span>
              </div>
            </div>
          </div>

          {/* FICHA TÉCNICA Y CLASIFICACIÓN */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-foreground uppercase tracking-wider text-[11px]">
              <Package className="h-3.5 w-3.5 text-primary" />
              Especificaciones y Mantenedores
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Marca:</span>
                <span className="font-semibold text-foreground">{product.brand || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Modelo:</span>
                <span className="font-semibold text-foreground">{product.model || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Categoría:</span>
                <span className="font-semibold text-foreground">{product.category || 'General'}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Fabricante:</span>
                <span className="font-semibold text-foreground">{(product as any).manufacturer || '—'}</span>
              </div>
            </div>
          </div>

          {/* LOGÍSTICA / COMERCIO EXTERIOR */}
          {isImported ? (
            <div className="p-3.5 rounded-lg border bg-blue-500/5 border-blue-500/20 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-foreground uppercase tracking-wider text-[11px]">
                <Globe className="h-3.5 w-3.5 text-blue-600" />
                Parámetros de Importación y Despacho Aduanero (DAM)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                    Partida Arancelaria (HS Code):
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {product.hsCode || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                    País de Origen:
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {(product as any).country_of_origin || 'CN'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                    Peso Neto Unitario:
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {product.weightKg ? `${product.weightKg} kg` : '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-foreground uppercase tracking-wider text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Cumplimiento Tributario SUNAT
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Código de Barras:</span>
                  <span className="font-mono font-semibold text-foreground">{product.barcode || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Afectación IGV:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {product.taxAffectation === '10' ? '10 - Gravado' : product.taxAffectation || '10'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Tipo Existencia (T.5):</span>
                  <span className="font-medium text-foreground">
                    {SUNAT_TYPES[product.sunatTypeCode || '01'] || '01 - Mercaderías'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* VARIACIONES DEL ARTÍCULO (ATRIBUTOS Y VARIANTES FÍSICAS) */}
          {(product as any).variants && (product as any).variants.length > 0 && (
            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground uppercase tracking-wider text-[11px]">
                  <Layers className="h-3.5 w-3.5 text-emerald-600" />
                  Variaciones del Artículo ({((product as any).variants || []).length})
                </div>
                {(product as any).attributes && (product as any).attributes.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-semibold">Atributos:</span>
                    {(product as any).attributes.map((attr: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-background font-medium">
                        {attr}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="border rounded-md overflow-hidden bg-background">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b text-muted-foreground text-[10px] uppercase">
                    <tr>
                      <th className="p-2 font-semibold">Variante / Atributo</th>
                      <th className="p-2 font-mono font-semibold">SKU Específico</th>
                      <th className="p-2 font-mono font-semibold">Cód. Barras</th>
                      <th className="p-2 text-right font-semibold">Costo Adic.</th>
                      <th className="p-2 text-right font-semibold">Precio Venta</th>
                      <th className="p-2 text-right font-semibold">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {(product as any).variants.map((v: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-2 font-medium text-foreground">{v.variant_name}</td>
                        <td className="p-2 font-mono text-primary font-bold">{v.sku}</td>
                        <td className="p-2 font-mono text-muted-foreground">{v.barcode || '—'}</td>
                        <td className="p-2 text-right font-mono text-muted-foreground">
                          {Number(v.additional_cost || 0) > 0 ? `+ ${money(v.additional_cost)}` : 'S/ 0.00'}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-600">
                          {v.price_override ? money(v.price_override) : (product.sale_price ? money(product.sale_price) : 'Base')}
                        </td>
                        <td className="p-2 text-right font-mono font-semibold">
                          {v.current_stock ?? 0} {product.sunatUnitCode || 'NIU'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PRESENTACIONES COMERCIALES (OBS 10, 25) */}
          {(product as any).presentations && (product as any).presentations.length > 0 && (
            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-foreground uppercase tracking-wider text-[11px]">
                <Boxes className="h-3.5 w-3.5 text-emerald-600" />
                Presentaciones Comerciales y Factores de Conversión
              </div>
              <div className="flex flex-wrap gap-2">
                {(product as any).presentations.map((p: any, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs p-1.5 font-normal flex items-center gap-1">
                    <strong>{p.presentation_name}</strong>
                    <span className="text-muted-foreground font-mono">(= {p.factor} {product.sunatUnitCode || 'NIU'})</span>
                    {p.sale_price ? <span className="font-mono font-semibold text-emerald-600 ml-1">{money(p.sale_price)}</span> : null}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cerrar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="text-xs gap-1.5 text-primary border-primary/30"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Editar Ficha
            </Button>

            <Button
              size="sm"
              onClick={() => {
                onClose();
                onOpenKardex(product.sku);
              }}
              className="text-xs gap-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Ver Kardex Valorizado (PLE 13.1)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

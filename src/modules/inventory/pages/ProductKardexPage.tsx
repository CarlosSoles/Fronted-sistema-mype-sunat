import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../services/inventoryApi';
import { type KardexLedgerResponse } from '../types/inventory.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Search } from 'lucide-react';

export default function ProductKardexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSku = searchParams.get('sku') || 'LAP-001';

  const [skuInput, setSkuInput] = useState(initialSku);
  const [kardexData, setKardexData] = useState<KardexLedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchKardex = async (skuToSearch: string) => {
    if (!skuToSearch.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await inventoryApi.getKardexBySku(skuToSearch.trim());
      setKardexData(data);
      setSearchParams({ sku: skuToSearch.trim() });
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Producto no encontrado en inventario.');
      setKardexData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialSku) {
      fetchKardex(initialSku);
    }
  }, [initialSku]);

  const latestMovement = kardexData?.movements?.slice(-1)[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Kardex Permanente Valorizado
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Formato PLE 13.1
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Control perpetuo por producto bajo el Método de Promedio Ponderado Móvil (CPP / NIC 2).
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Ingrese código SKU..."
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchKardex(skuInput)}
            className="w-48 text-sm uppercase"
          />
          <Button onClick={() => fetchKardex(skuInput)} disabled={isLoading} className="gap-1">
            <Search className="h-4 w-4" />
            Consultar
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {errorMessage}
        </div>
      )}

      {kardexData && (
        <>
          {/* Ficha Resumen de Cabecera */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Producto</p>
                <p className="text-lg font-bold text-primary mt-1 font-mono">{kardexData.product.sku}</p>
                <p className="text-xs text-muted-foreground truncate" title={kardexData.product.description}>
                  {kardexData.product.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Existencias Físicas</p>
                <p className="text-2xl font-bold mt-1">
                  {(latestMovement?.resultingStock ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
                  <span className="text-xs text-muted-foreground font-normal">NIU</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Costo Promedio (CPP)</p>
                <p className="text-2xl font-bold mt-1 text-primary font-mono">
                  S/ {(latestMovement?.resultingAverageCost ?? 0).toFixed(4)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Valor Total Acumulado</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 font-mono">
                  S/ {(latestMovement?.resultingTotalValue ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de 3 Bloques PLE 13.1 */}
          <div className="border rounded-md bg-card overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/70 text-center font-bold text-muted-foreground uppercase">
                  <th colSpan={4} className="p-2 border-r">Documento de Sustento</th>
                  <th colSpan={3} className="p-2 border-r bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Entradas
                  </th>
                  <th colSpan={3} className="p-2 border-r bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    Salidas
                  </th>
                  <th colSpan={3} className="p-2 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    Saldo Acumulado
                  </th>
                </tr>
                <tr className="border-b bg-muted/40 text-muted-foreground uppercase text-[11px]">
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Operación</th>
                  <th className="p-2">Comprobante</th>
                  <th className="p-2 border-r whitespace-nowrap">Número</th>

                  {/* Entradas */}
                  <th className="p-2 text-right">Cantidad</th>
                  <th className="p-2 text-right">Costo U.</th>
                  <th className="p-2 text-right border-r">Total</th>

                  {/* Salidas */}
                  <th className="p-2 text-right">Cantidad</th>
                  <th className="p-2 text-right">Costo U.</th>
                  <th className="p-2 text-right border-r">Total</th>

                  {/* Saldo */}
                  <th className="p-2 text-right">Cantidad</th>
                  <th className="p-2 text-right">Promedio Móvil</th>
                  <th className="p-2 text-right font-bold">Total Valuado</th>
                </tr>
              </thead>
              <tbody>
                {kardexData.movements.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-6 text-center text-muted-foreground">
                      No hay asientos registrados para este producto.
                    </td>
                  </tr>
                ) : (
                  kardexData.movements.map((m) => {
                    const isEntry = m.direction === 'ENTRADA';
                    return (
                      <tr key={m.id || m.movementNumber} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-mono">
                          {new Date(m.movementDate).toLocaleDateString('es-PE')}
                        </td>
                        <td className="p-2 font-semibold">T.{m.operationTypeCode}</td>
                        <td className="p-2 font-mono">{m.documentTypeCode ? `[${m.documentTypeCode}]` : '-'}</td>
                        <td className="p-2 font-mono border-r whitespace-nowrap">
                          {m.documentSerial ? `${m.documentSerial}-` : ''}
                          {m.documentNumber || m.movementNumber}
                        </td>

                        {/* Entradas */}
                        <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {isEntry ? m.quantity.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {isEntry ? `S/ ${m.unitCost.toFixed(4)}` : '-'}
                        </td>
                        <td className="p-2 text-right font-mono border-r font-semibold">
                          {isEntry ? `S/ ${m.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '-'}
                        </td>

                        {/* Salidas */}
                        <td className="p-2 text-right font-mono text-amber-600 dark:text-amber-400">
                          {!isEntry ? m.quantity.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {!isEntry ? `S/ ${m.unitCost.toFixed(4)}` : '-'}
                        </td>
                        <td className="p-2 text-right font-mono border-r font-semibold">
                          {!isEntry ? `S/ ${m.totalCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '-'}
                        </td>

                        {/* Saldo Acumulado */}
                        <td className="p-2 text-right font-mono font-bold text-primary">
                          {m.resultingStock.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right font-mono">
                          S/ {m.resultingAverageCost.toFixed(4)}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          S/ {m.resultingTotalValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

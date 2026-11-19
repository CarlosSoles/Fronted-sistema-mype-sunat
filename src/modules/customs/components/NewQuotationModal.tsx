import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateImportQuotation } from '../hooks/useImportQuotations';
import { inventoryApi } from '@/modules/inventory/services/inventoryApi';
import {
  FileQuestion,
  Save,
  AlertCircle,
  Plus,
  Trash2,
  Package,
} from 'lucide-react';

interface NewQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (quotationId: string) => void;
}

interface ProductItemRow {
  productId?: string;
  sku: string;
  description: string;
  quantity: number;
  targetPrice: number;
  unitCode: string;
  hsCode?: string;
}

interface InventoryProductOption {
  id: string;
  sku: string;
  description: string;
  barcode?: string;
  unitCode: string;
  costPrice?: number;
}

export const NewQuotationModal: React.FC<NewQuotationModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [targetIncoterm, setTargetIncoterm] = useState('FOB');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Inventario disponible
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProductOption[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Items seleccionados
  const [items, setItems] = useState<ProductItemRow[]>([]);

  const createMutation = useCreateImportQuotation();

  // Cargar catálogo de productos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setIsLoadingProducts(true);
      inventoryApi
        .getAllProducts({ includeServices: false })
        .then((data) => {
          setInventoryProducts(
            (data || []).map((p) => ({
              id: p.id,
              sku: p.sku,
              description: p.description,
              barcode: p.barcode,
              unitCode: p.unitCode || 'NIU',
              costPrice: p.costPrice || 0,
            }))
          );
        })
        .catch((err) => {
          console.error('Error cargando inventario:', err);
        })
        .finally(() => {
          setIsLoadingProducts(false);
        });

      // Inicializar con al menos 1 fila
      setItems([
        {
          productId: '',
          sku: '',
          description: '',
          quantity: 100,
          targetPrice: 0,
          unitCode: 'NIU',
        },
      ]);
    }
  }, [isOpen]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: '',
        sku: '',
        description: '',
        quantity: 100,
        targetPrice: 0,
        unitCode: 'NIU',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const selected = inventoryProducts.find((p) => p.id === productId);
    const updated = [...items];
    if (selected) {
      updated[index] = {
        ...updated[index],
        productId: selected.id,
        sku: selected.sku,
        description: selected.description,
        unitCode: selected.unitCode || 'NIU',
        targetPrice: selected.costPrice || 0,
      };

      // Si el título está vacío, sugerir uno
      if (!title.trim()) {
        setTitle(`Importación ${selected.sku} — ${selected.description.substring(0, 45)}`);
      }
    } else {
      updated[index] = {
        ...updated[index],
        productId: '',
        sku: '',
        description: '',
      };
    }
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof ProductItemRow, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validItems = items.filter((it) => it.description.trim() && it.quantity > 0);
    if (validItems.length === 0) {
      setError('Debes especificar al menos un producto a importar con cantidad mayor a 0.');
      return;
    }

    const finalTitle = title.trim() || `Importación Lote ${validItems[0].sku || validItems[0].description}`;

    try {
      const res = await createMutation.mutateAsync({
        title: finalTitle,
        targetIncoterm,
        targetCurrency,
        notes: notes.trim() || undefined,
        items: validItems.map((it) => ({
          productId: it.productId || undefined,
          sku: it.sku || undefined,
          description: it.description.trim(),
          quantity: Number(it.quantity),
          targetPrice: Number(it.targetPrice) || undefined,
          unitCode: it.unitCode || 'NIU',
          hsCode: it.hsCode || undefined,
        })),
      });

      setTitle('');
      setNotes('');
      setItems([]);
      onClose();
      if (onCreated) onCreated(res.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al crear la solicitud de cotización.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto text-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-primary">
            <FileQuestion className="h-4 w-4" />
            Nueva Solicitud de Cotización Internacional (RFQ)
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Abre una mesa de negociación para registrar los productos que necesitas importar y contrastar las ofertas de múltiples proveedores extranjeros.
          </p>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Título y condiciones generales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="font-semibold block mb-1">Título del Requerimiento / Proyecto *</label>
              <Input
                placeholder="ej. Importación 500 Cajas Porcelanato Carrara White 60x60"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Incoterm Objetivo</label>
              <select
                value={targetIncoterm}
                onChange={(e) => setTargetIncoterm(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="FOB">FOB (Recomendado)</option>
                <option value="EXW">EXW (Fábrica en origen)</option>
                <option value="CIF">CIF (Costo, flete y seguro)</option>
                <option value="CFR">CFR (Costo y flete)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Moneda Objetivo</label>
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="USD">USD — Dólar Americano</option>
                <option value="EUR">EUR — Euro</option>
                <option value="CNY">CNY — Yuan Chino</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Catálogo de Referencia</label>
              <div className="h-8 px-2.5 flex items-center text-xs text-muted-foreground bg-muted/40 rounded-md border font-medium">
                {isLoadingProducts ? 'Cargando inventario...' : `${inventoryProducts.length} productos en inventario`}
              </div>
            </div>
          </div>

          {/* Sección de Selección de Productos del Inventario */}
          <div className="border rounded-lg p-3 bg-muted/15 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-primary" />
                  Productos del Inventario a Cotizar *
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Selecciona uno o más productos de nuestro inventario que entrarán a la mesa de cotización con proveedores.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs gap-1 font-semibold"
              >
                <Plus className="h-3 w-3" />
                Agregar Producto
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2.5 items-center bg-card p-2.5 rounded-md border shadow-2xs"
                >
                  {/* Selector de producto del inventario */}
                  <div className="col-span-12 sm:col-span-4">
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">
                      Producto / SKU
                    </label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => handleSelectProduct(idx, e.target.value)}
                      className="w-full h-8 px-2 text-xs rounded border border-input bg-background font-medium"
                    >
                      <option value="">-- Seleccionar de inventario (o escribir manual) --</option>
                      {inventoryProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.description.substring(0, 45)} {p.barcode ? `(EAN: ${p.barcode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Descripción editable */}
                  <div className="col-span-12 sm:col-span-3">
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">
                      Descripción del Ítem
                    </label>
                    <Input
                      placeholder="Descripción comercial"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="h-8 text-xs font-medium"
                      required
                    />
                  </div>

                  {/* Cantidad solicitada */}
                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">
                      Cant. Solicitada
                    </label>
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs text-right font-bold font-mono"
                      required
                    />
                  </div>

                  {/* Precio FOB Objetivo */}
                  <div className="col-span-5 sm:col-span-2">
                    <label className="text-[11px] text-muted-foreground font-semibold block mb-1">
                      Target ($ FOB)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={item.targetPrice || ''}
                      onChange={(e) => handleItemChange(idx, 'targetPrice', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs text-right font-mono"
                    />
                  </div>

                  {/* Eliminar fila */}
                  <div className="col-span-1 sm:col-span-1 flex justify-center items-end pb-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Eliminar ítem"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Especificaciones y requerimientos técnicos */}
          <div>
            <label className="font-semibold block mb-1">Notas / Especificaciones Técnicas y Requisitos de Calidad</label>
            <textarea
              rows={2}
              placeholder="Especificaciones requeridas (ej. norma ISO, porcentaje de absorción de agua, espesor, empaque paletizado, etc.)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 text-xs rounded-md border border-input bg-background font-normal resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="gap-1.5 font-semibold"
            >
              <Save className="h-3.5 w-3.5" />
              {createMutation.isPending ? 'Creando...' : 'Crear Negociación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

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
import { catalogsApi, type CountryItem } from '../services/catalogsApi';
import { useAddProforma } from '../hooks/useImportQuotations';
import { type ForeignSupplierSummary } from '../types';
import { type QuotationItemRecord } from '../services/importQuotationsApi';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Building2,
  AlertCircle,
} from 'lucide-react';

interface AddProformaModalProps {
  quotationId: string;
  quotationItems?: QuotationItemRecord[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ItemRow {
  productId?: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCode: string;
  hsCode?: string;
}

export const AddProformaModal: React.FC<AddProformaModalProps> = ({
  quotationId,
  quotationItems,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [suppliers, setSuppliers] = useState<ForeignSupplierSummary[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('NEW');

  // Datos del nuevo proveedor (si se crea sobre la marcha)
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCountry, setNewSupplierCountry] = useState('CN');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');

  // Datos de la proforma
  const [proformaNumber, setProformaNumber] = useState('');
  const [incoterm, setIncoterm] = useState('FOB');
  const [originPort, setOriginPort] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [leadTimeDays, setLeadTimeDays] = useState(30);
  const [paymentTerms, setPaymentTerms] = useState('30% adelanto + 70% contra BL');
  const [estimatedFreight, setEstimatedFreight] = useState(0);
  const [estimatedInsurance, setEstimatedInsurance] = useState(0);
  const [notes, setNotes] = useState('');

  // Items
  const [items, setItems] = useState<ItemRow[]>([
    { sku: '', description: '', quantity: 100, unitPrice: 10, unitCode: 'NIU' },
  ]);

  const [error, setError] = useState<string | null>(null);
  const addProformaMutation = useAddProforma();

  useEffect(() => {
    if (isOpen) {
      if (quotationItems && quotationItems.length > 0) {
        setItems(
          quotationItems.map((qi) => ({
            productId: qi.productId,
            sku: qi.sku || '',
            description: qi.description,
            quantity: Number(qi.quantity) || 1,
            unitPrice: Number(qi.targetPrice) || 0,
            unitCode: qi.unitCode || 'NIU',
            hsCode: qi.hsCode,
          }))
        );
      } else {
        setItems([
          { sku: '', description: '', quantity: 100, unitPrice: 10, unitCode: 'NIU' },
        ]);
      }

      void catalogsApi.getForeignSuppliers().then((res) => {
        setSuppliers(res);
        if (res.length > 0) {
          setSelectedSupplierId(res[0].id);
          setIsCreatingSupplier(false);
        } else {
          setIsCreatingSupplier(true);
        }
      });
      void catalogsApi.getCountries().then(setCountries);
    }
  }, [isOpen, quotationItems]);

  const handleAddItem = () => {
    setItems([...items, { sku: '', description: '', quantity: 1, unitPrice: 0, unitCode: 'NIU' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const totalFob = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const totalCif = totalFob + (Number(estimatedFreight) || 0) + (Number(estimatedInsurance) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let supplierId = selectedSupplierId;
    let supplierName = '';
    let supplierCountry = 'CN';

    if (isCreatingSupplier) {
      if (!newSupplierName.trim()) {
        setError('El nombre del proveedor extranjero es obligatorio.');
        return;
      }
      try {
        const createdSupplier = await catalogsApi.createForeignSupplier({
          business_name: newSupplierName.trim(),
          country_code: newSupplierCountry,
          contact_name: newSupplierContact.trim() || undefined,
          email: newSupplierEmail.trim() || undefined,
          payment_terms: paymentTerms,
        });
        supplierId = createdSupplier.id;
        supplierName = createdSupplier.business_name;
        supplierCountry = createdSupplier.country_code;
      } catch (err: any) {
        setError('No se pudo registrar el nuevo proveedor extranjero.');
        return;
      }
    } else {
      const found = suppliers.find((s) => s.id === selectedSupplierId);
      if (!found) {
        setError('Selecciona un proveedor válido.');
        return;
      }
      supplierId = found.id;
      supplierName = found.business_name;
      supplierCountry = found.country_code || 'CN';
    }

    if (!proformaNumber.trim()) {
      setError('El número de proforma / cotización es obligatorio.');
      return;
    }

    if (items.some((it) => !it.description.trim() || it.quantity <= 0)) {
      setError('Todos los ítems deben tener descripción y cantidad mayor a cero.');
      return;
    }

    try {
      await addProformaMutation.mutateAsync({
        quotationId,
        payload: {
          supplierId,
          supplierName,
          supplierCountry,
          proformaNumber: proformaNumber.trim().toUpperCase(),
          incoterm,
          originPort: originPort.trim() || undefined,
          currencyCode,
          totalFob,
          estimatedFreight: Number(estimatedFreight) || 0,
          estimatedInsurance: Number(estimatedInsurance) || 0,
          leadTimeDays: Number(leadTimeDays) || 30,
          paymentTerms: paymentTerms.trim() || undefined,
          notes: notes.trim() || undefined,
          items: items.map((it) => ({
            productId: it.productId || undefined,
            sku: it.sku?.trim() || undefined,
            description: it.description.trim(),
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            unitCode: it.unitCode || 'NIU',
            hsCode: it.hsCode || undefined,
          })),
        },
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al guardar la proforma.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl text-xs max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-primary">
            <FileText className="h-4 w-4" />
            Registrar Oferta / Proforma de Proveedor
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Ingresa las condiciones cotizadas por esta fábrica o exportador para contrastarlo en el comparativo.
          </p>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Sección de Proveedor Extranjero */}
          <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Proveedor Internacional
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingSupplier(!isCreatingSupplier)}
                className="h-6 text-[11px] text-primary hover:text-primary/80"
              >
                {isCreatingSupplier ? '← Seleccionar de la lista' : '+ Registrar Nuevo Proveedor'}
              </Button>
            </div>

            {!isCreatingSupplier ? (
              <div>
                <label className="font-medium block mb-1">Seleccionar Proveedor en Cartera *</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.business_name} ({s.country_code}) {s.contact_name ? `· Contacto: ${s.contact_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="font-medium block mb-1">Nombre / Razón Social del Proveedor *</label>
                  <Input
                    placeholder="ej. Shenzhen Techlog Co., Ltd"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="h-8 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">País de Origen</label>
                  <select
                    value={newSupplierCountry}
                    onChange={(e) => setNewSupplierCountry(e.target.value)}
                    className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-medium block mb-1">Persona de Contacto</label>
                  <Input
                    placeholder="ej. Mr. David Liu (Sales Rep)"
                    value={newSupplierContact}
                    onChange={(e) => setNewSupplierContact(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Correo Electrónico</label>
                  <Input
                    type="email"
                    placeholder="sales@techlog.com"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Condiciones Comerciales de la Proforma */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div>
              <label className="font-medium block mb-1">N° Proforma / Cotización *</label>
              <Input
                placeholder="ej. PI-2026-904"
                value={proformaNumber}
                onChange={(e) => setProformaNumber(e.target.value)}
                className="h-8 text-xs font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Moneda *</label>
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="USD">USD - Dólar EE.UU.</option>
                <option value="EUR">EUR - Euro</option>
                <option value="CNY">CNY - Yuan Chino</option>
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Incoterm Ofertado *</label>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="FOB">FOB (Puerto embarque)</option>
                <option value="EXW">EXW (En fábrica)</option>
                <option value="CIF">CIF (Costo, flete, seguro)</option>
                <option value="CFR">CFR (Costo y flete)</option>
                <option value="DAP">DAP (Puesto en destino)</option>
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Puerto de Origen</label>
              <Input
                placeholder="ej. Ningbo / Shanghai"
                value={originPort}
                onChange={(e) => setOriginPort(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Plazo Entrega (Días)</label>
              <Input
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="font-medium block mb-1">Condiciones de Pago Negociadas</label>
              <Input
                placeholder="ej. 30% TT anticipo + 70% contra copia BL"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Flete Est. (USD)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={estimatedFreight}
                  onChange={(e) => setEstimatedFreight(Number(e.target.value))}
                  className="h-8 text-xs font-mono text-right"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Seguro Est. (USD)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={estimatedInsurance}
                  onChange={(e) => setEstimatedInsurance(Number(e.target.value))}
                  className="h-8 text-xs font-mono text-right"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-medium block mb-1">Notas de Negociación / Observaciones</label>
            <Input
              placeholder="ej. Muestras técnicas validadas, requiere inspección pre-embarque SGS"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Tabla de Productos Cotizados */}
          <div className="border rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-foreground">Productos / Ítems Cotizados</span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="h-6 text-[11px] gap-1">
                <Plus className="h-3 w-3" /> Añadir Ítem
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                  <div className="col-span-2">
                    <Input
                      placeholder="SKU"
                      value={it.sku}
                      onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-5">
                    <Input
                      placeholder="Descripción del producto *"
                      value={it.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="h-7 text-xs font-medium"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="1"
                      placeholder="Cantidad"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      className="h-7 text-xs font-mono text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="P. Unit FOB"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                      className="h-7 text-xs font-mono text-right font-semibold"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totales calculados */}
            <div className="pt-2 border-t flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Total FOB: ${totalFob.toFixed(2)} USD</span>
              <span className="text-primary font-bold">Total CIF Estimado: ${totalCif.toFixed(2)} USD</span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={addProformaMutation.isPending} className="gap-1.5 font-semibold">
              <Save className="h-3.5 w-3.5" />
              {addProformaMutation.isPending ? 'Guardando...' : 'Guardar Oferta de Proveedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

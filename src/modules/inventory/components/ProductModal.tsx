import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '../validators/productSchema';
import { inventoryApi } from '../services/inventoryApi';
import { masterDataApi } from '@/modules/customs/services/masterDataApi';
import { CatalogsManagerModal } from './CatalogsManagerModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  PlusCircle,
  AlertCircle,
  Edit2,
  Package,
  Globe,
  DollarSign,
  Building2,
  Boxes,
  Plus,
  Trash2,
  Settings2,
  CheckCircle2,
  Layers,
  Tag,
  X,
} from 'lucide-react';
import { type InventoryBalance } from '../types/inventory.types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: InventoryBalance | null;
  mode?: 'create' | 'edit';
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  mode = 'create',
}) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'origin' | 'pricing' | 'variants' | 'presentations' | 'suppliers'>('general');
  const [newAttributeInput, setNewAttributeInput] = useState('');
  const [isCatalogsModalOpen, setIsCatalogsModalOpen] = useState(false);

  // Catálogos cargados desde la BD
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [manufacturers, setManufacturers] = useState<Array<{ id: string; name: string; country_code: string }>>([]);
  const [sunatUnits, setSunatUnits] = useState<Array<{ code: string; name: string }>>([]);
  const [existenceTypes, setExistenceTypes] = useState<Array<{ code: string; name: string }>>([]);
  const [suppliersList, setSuppliersList] = useState<Array<{ id: string; legal_name: string; doc_number: string }>>([]);

  const isEdit = mode === 'edit' && Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      description: '',
      origin_type: 'NACIONAL',
      is_service: false,
      is_active: true,
      brand: '',
      model: '',
      category: '',
      manufacturer: '',
      country_of_origin: 'PE',
      barcode: '',
      hs_code: '',
      weight_kg: undefined,
      volume_m3: undefined,
      sunat_type_code: '01',
      sunat_unit_code: 'NIU',
      tax_affectation: '10',
      min_stock_alert: 0,
      cost_price: undefined,
      sale_price: undefined,
      wholesale_price: undefined,
      promo_price: undefined,
      commission_rate: undefined,
      min_price: undefined,
      warehouse_location: '',
      attributes: [],
      variants: [],
      presentations: [
        { presentation_name: 'Unidad Individual', factor: 1, sunat_unit_code: 'NIU', is_default: true },
      ],
      suppliers: [],
    },
  });

  const originType = watch('origin_type');

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: 'variants',
  });

  const {
    fields: presentationFields,
    append: appendPresentation,
    remove: removePresentation,
  } = useFieldArray({
    control,
    name: 'presentations',
  });

  const {
    fields: supplierFields,
    append: appendSupplier,
    remove: removeSupplier,
  } = useFieldArray({
    control,
    name: 'suppliers',
  });

  // Cargar catálogos al abrir el modal
  const loadCatalogs = async () => {
    try {
      const [u, ext, br, cat, mod, mf, partners] = await Promise.all([
        inventoryApi.getUnits().catch(() => []),
        inventoryApi.getExistenceTypes().catch(() => []),
        inventoryApi.getBrands().catch(() => []),
        inventoryApi.getCategories().catch(() => []),
        inventoryApi.getModels().catch(() => []),
        inventoryApi.getManufacturers().catch(() => []),
        masterDataApi.getPartners({ role: 'PROVEEDOR' }).catch(() => []),
      ]);
      setSunatUnits(u);
      setExistenceTypes(ext);
      setBrands(br);
      setCategories(cat);
      setModels(mod);
      setManufacturers(mf);
      setSuppliersList(partners);
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      setActiveTab('general');
      loadCatalogs();

      if (isEdit && initialData) {
        // Cargar datos existentes y buscar detalle completo en backend
        setValue('sku', initialData.sku);
        setValue('description', initialData.description);
        setValue('origin_type', (initialData as any).origin_type || 'NACIONAL');
        setValue('is_service', (initialData as any).is_service || false);
        setValue('brand', initialData.brand || '');
        setValue('model', initialData.model || '');
        setValue('category', initialData.category || '');
        setValue('manufacturer', (initialData as any).manufacturer || '');
        setValue('country_of_origin', (initialData as any).country_of_origin || 'PE');
        setValue('barcode', initialData.barcode || '');
        setValue('hs_code', initialData.hsCode || '');
        setValue('weight_kg', initialData.weightKg ?? undefined);
        setValue('volume_m3', initialData.volumeM3 ?? undefined);
        setValue('sunat_type_code', initialData.sunatTypeCode || '01');
        setValue('sunat_unit_code', initialData.sunatUnitCode || 'NIU');
        setValue('min_stock_alert', initialData.minStockAlert ?? 0);
        setValue('cost_price', (initialData as any).cost_price ?? initialData.averageUnitCost ?? undefined);
        setValue('sale_price', (initialData as any).sale_price ?? undefined);
        setValue('wholesale_price', (initialData as any).wholesale_price ?? undefined);
        setValue('promo_price', (initialData as any).promo_price ?? undefined);
        setValue('commission_rate', (initialData as any).commission_rate ?? undefined);
        setValue('warehouse_location', (initialData as any).warehouse_location || '');

        // Consultar ficha extendida (proveedores, presentaciones, variantes y atributos)
        inventoryApi.getProductBySku(initialData.sku).then((detailed) => {
          if (detailed) {
            if (detailed.attributes && Array.isArray(detailed.attributes)) {
              setValue('attributes', detailed.attributes);
            }
            if (detailed.variants && detailed.variants.length > 0) {
              setValue('variants', detailed.variants.map((v: any) => ({
                id: v.id,
                variant_name: v.variant_name,
                sku: v.sku,
                barcode: v.barcode || '',
                additional_cost: Number(v.additional_cost || 0),
                price_override: v.price_override ? Number(v.price_override) : undefined,
                current_stock: Number(v.current_stock || 0),
                is_active: v.is_active ?? true,
              })));
            }
            if (detailed.presentations && detailed.presentations.length > 0) {
              setValue('presentations', detailed.presentations.map((p: any) => ({
                presentation_name: p.presentation_name,
                factor: Number(p.factor),
                sunat_unit_code: p.sunat_unit_code,
                barcode: p.barcode || undefined,
                sale_price: p.sale_price ? Number(p.sale_price) : undefined,
                is_default: p.is_default,
              })));
            }
            if (detailed.suppliers && detailed.suppliers.length > 0) {
              setValue('suppliers', detailed.suppliers.map((s: any) => ({
                supplier_id: s.supplier_id,
                supplier_product_code: s.supplier_product_code || undefined,
                purchase_cost: s.purchase_cost ? Number(s.purchase_cost) : undefined,
                currency_code: s.currency_code || 'PEN',
                lead_time_days: s.lead_time_days ?? 0,
                is_preferred: s.is_preferred,
                notes: s.notes || undefined,
              })));
            }
          }
        }).catch(() => {});
      } else {
        reset({
          sku: '',
          description: '',
          origin_type: 'NACIONAL',
          is_service: false,
          is_active: true,
          brand: '',
          model: '',
          category: '',
          manufacturer: '',
          country_of_origin: 'PE',
          barcode: '',
          hs_code: '',
          weight_kg: undefined,
          volume_m3: undefined,
          sunat_type_code: '01',
          sunat_unit_code: 'NIU',
          tax_affectation: '10',
          min_stock_alert: 0,
          cost_price: undefined,
          sale_price: undefined,
          wholesale_price: undefined,
          promo_price: undefined,
          commission_rate: undefined,
          min_price: undefined,
          warehouse_location: '',
          attributes: [],
          variants: [],
          presentations: [
            { presentation_name: 'Unidad Individual', factor: 1, sunat_unit_code: 'NIU', is_default: true },
          ],
          suppliers: [],
        });
      }
    }
  }, [isOpen, isEdit, initialData, setValue, reset]);

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      if (isEdit && initialData) {
        await inventoryApi.updateProduct(initialData.sku, data);
      } else {
        await inventoryApi.registerProduct(data);
      }
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.message || err.message || 'Error al guardar el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (errores: Record<string, { message?: string }>) => {
    setServerError('Revisa los campos obligatorios marcados en el formulario.');
    if (errores.sku || errores.description || errores.sunat_unit_code) setActiveTab('general');
    else if (errores.barcode || errores.hs_code || errores.weight_kg || errores.volume_m3) setActiveTab('origin');
    else if (errores.presentations) setActiveTab('presentations');
    else if (errores.variants) setActiveTab('variants');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto text-xs">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                {isEdit ? (
                  <>
                    <Edit2 className="h-5 w-5 text-emerald-600" />
                    Editar Ficha de Producto ({initialData?.sku})
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-5 w-5 text-emerald-600" />
                    Registrar Producto en Catálogo Maestro (SUNAT)
                  </>
                )}
              </DialogTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCatalogsModalOpen(true)}
                className="h-7 text-xs gap-1 border-emerald-600/30 text-emerald-600 hover:bg-emerald-50"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Mantenedores
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Configuración de existencias, clasificación arancelaria, presentaciones comerciales, proveedores y reglas de precios.
            </p>
          </DialogHeader>

          {serverError && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
            {/* SELECTOR DE ORIGEN (OBS 3: DIFERENCIAR NACIONAL VS IMPORTADO) */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted/40 rounded-lg border">
              <button
                type="button"
                onClick={() => {
                  setValue('origin_type', 'NACIONAL');
                  setValue('country_of_origin', 'PE');
                }}
                className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 font-medium transition-all ${
                  originType === 'NACIONAL'
                    ? 'bg-background shadow-xs text-foreground font-semibold border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="text-base">🇵🇪</span>
                <span>Producto Nacional (Compra Local)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('origin_type', 'IMPORTADO');
                  if (watch('country_of_origin') === 'PE') setValue('country_of_origin', 'CN');
                }}
                className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 font-medium transition-all ${
                  originType === 'IMPORTADO'
                    ? 'bg-background shadow-xs text-foreground font-semibold border text-emerald-600'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="text-base">🌐</span>
                <span>Producto Importado (Exterior / DAM)</span>
              </button>
            </div>

            {/* PESTAÑAS DEL FORMULARIO */}
            <div className="flex flex-wrap gap-1 border-b pb-2">
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'general' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('general')}
                className="h-7 text-xs gap-1.5"
              >
                <Package className="h-3.5 w-3.5" /> General y Clasificación
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'origin' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('origin')}
                className="h-7 text-xs gap-1.5"
              >
                <Globe className="h-3.5 w-3.5" /> Datos {originType === 'IMPORTADO' ? 'de Importación' : 'Nacionales'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'pricing' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('pricing')}
                className="h-7 text-xs gap-1.5"
              >
                <DollarSign className="h-3.5 w-3.5" /> Precios y Reglas
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'variants' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('variants')}
                className="h-7 text-xs gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" /> Variantes y Atributos ({variantFields.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'presentations' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('presentations')}
                className="h-7 text-xs gap-1.5"
              >
                <Boxes className="h-3.5 w-3.5" /> Presentaciones ({presentationFields.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'suppliers' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('suppliers')}
                className="h-7 text-xs gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5" /> Proveedores ({supplierFields.length})
              </Button>
            </div>

            {/* 1. TAB: GENERAL Y CLASIFICACIÓN */}
            {activeTab === 'general' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-medium text-foreground">SKU / Código Único *</label>
                    <Input
                      placeholder={originType === 'IMPORTADO' ? 'ej: IMP-LED-6060' : 'ej: CEM-SOL-01'}
                      {...register('sku')}
                      disabled={isEdit}
                      className="mt-1 h-8 font-mono uppercase font-semibold text-xs"
                    />
                    {errors.sku && <p className="text-destructive text-[11px] mt-0.5">{errors.sku.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-medium text-foreground">Descripción del Producto *</label>
                    <Input
                      placeholder="ej: Cemento Portland Tipo I Bolsa 42.5 kg"
                      {...register('description')}
                      className="mt-1 h-8 text-xs"
                    />
                    {errors.description && <p className="text-destructive text-[11px] mt-0.5">{errors.description.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-2.5 rounded-lg border">
                  <div>
                    <label className="font-medium text-muted-foreground text-[11px]">Tipo Existencia (T.5)</label>
                    <select
                      {...register('sunat_type_code')}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                    >
                      {existenceTypes.map((t) => (
                        <option key={t.code} value={t.code}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground text-[11px]">Unidad Medida (T.6) *</label>
                    <select
                      {...register('sunat_unit_code')}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 font-semibold"
                    >
                      {sunatUnits.map((u) => (
                        <option key={u.code} value={u.code}>{u.code} — {u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground text-[11px]">Stock Mínimo Alerta</label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      {...register('min_stock_alert', { valueAsNumber: true })}
                      className="mt-1 h-8 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground text-[11px]">Ubicación Almacén</label>
                    <Input
                      placeholder="Pasillo 2 / Rack B-3"
                      {...register('warehouse_location')}
                      className="mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Mantenedores: Marcas, Modelos, Categorías y Fabricantes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-2.5 rounded-lg border">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-foreground text-[11px]">Marca</label>
                      <button
                        type="button"
                        onClick={() => setIsCatalogsModalOpen(true)}
                        className="text-[10px] text-emerald-600 hover:underline"
                      >
                        + Crear
                      </button>
                    </div>
                    <select
                      {...register('brand')}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                    >
                      <option value="">(Seleccionar marca)</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-foreground text-[11px]">Categoría</label>
                      <button
                        type="button"
                        onClick={() => setIsCatalogsModalOpen(true)}
                        className="text-[10px] text-emerald-600 hover:underline"
                      >
                        + Crear
                      </button>
                    </div>
                    <select
                      {...register('category')}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                    >
                      <option value="">(Seleccionar categoría)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-foreground text-[11px]">Modelo</label>
                      <button
                        type="button"
                        onClick={() => setIsCatalogsModalOpen(true)}
                        className="text-[10px] text-emerald-600 hover:underline"
                      >
                        + Crear
                      </button>
                    </div>
                    {models.length > 0 ? (
                      <select
                        {...register('model')}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                      >
                        <option value="">(Seleccionar modelo)</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        placeholder="ej: Mod-2026"
                        {...register('model')}
                        className="mt-1 h-8 text-xs font-mono"
                      />
                    )}
                  </div>
                  <div>
                    <label className="font-medium text-foreground text-[11px]">Fabricante</label>
                    <select
                      {...register('manufacturer')}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                    >
                      <option value="">(Seleccionar fabricante)</option>
                      {manufacturers.map((mf) => (
                        <option key={mf.id} value={mf.name}>{mf.name} ({mf.country_code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input type="checkbox" {...register('is_service')} className="rounded" />
                    <span>¿Es un servicio? (No genera existencias físicas ni Kardex)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input type="checkbox" {...register('is_active')} className="rounded" />
                    <span>Producto Activo en Catálogo</span>
                  </label>
                </div>
              </div>
            )}

            {/* 2. TAB: DATOS ESPECÍFICOS SEGÚN ORIGEN */}
            {activeTab === 'origin' && (
              <div className="space-y-3">
                {originType === 'IMPORTADO' ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs">
                      <Globe className="h-4 w-4" />
                      Atributos de Comercio Exterior y Despacho Aduanero (SUNAT / DAM)
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Estos campos son requeridos para la correcta declaración en la DAM y el prorrateo del landed cost aduanero.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-medium text-foreground text-[11px]">
                          Partida Arancelaria (Subpartida Nal. 10 dígitos)
                        </label>
                        <Input
                          placeholder="ej: 8481.80.90.00"
                          {...register('hs_code')}
                          className="mt-1 h-8 text-xs font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-foreground text-[11px]">País de Origen / Procedencia</label>
                        <select
                          {...register('country_of_origin')}
                          className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 font-mono font-medium"
                        >
                          <option value="CN">CN — China</option>
                          <option value="US">US — Estados Unidos</option>
                          <option value="DE">DE — Alemania</option>
                          <option value="IT">IT — Italia</option>
                          <option value="BR">BR — Brasil</option>
                          <option value="JP">JP — Japón</option>
                          <option value="PE">PE — Perú</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-medium text-foreground text-[11px]">Peso Neto Unitario (Kg)</label>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="ej: 2.450"
                          {...register('weight_kg', { valueAsNumber: true })}
                          className="mt-1 h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-foreground text-[11px]">Volumen Unitario (m³ / CBM)</label>
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="ej: 0.0150"
                          {...register('volume_m3', { valueAsNumber: true })}
                          className="mt-1 h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-foreground text-[11px]">Código de Barras Comercial</label>
                        <Input
                          placeholder="8, 12 o 13 dígitos"
                          {...register('barcode')}
                          className="mt-1 h-8 text-xs font-mono"
                        />
                        {errors.barcode && <p className="text-destructive text-[11px] mt-0.5">{errors.barcode.message}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/20 border p-3 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                      <Package className="h-4 w-4 text-emerald-600" />
                      Atributos para Mercaderías Nacionales y Facturación Local
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-medium text-foreground text-[11px]">Código de Barras Comercial (EAN-13)</label>
                        <Input
                          placeholder="ej: 7751234567890"
                          {...register('barcode')}
                          className="mt-1 h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-foreground text-[11px]">Afectación al IGV (Catálogo 07)</label>
                        <select
                          {...register('tax_affectation')}
                          className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                        >
                          <option value="10">10 — Gravado - Operación Onerosa (18%)</option>
                          <option value="20">20 — Exonerado - Operación Onerosa</option>
                          <option value="30">30 — Inafecto - Operación Onerosa</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. TAB: PRECIOS Y REGLAS COMERCIALES (OBS 11, 13) */}
            {activeTab === 'pricing' && (
              <div className="space-y-3">
                <div className="bg-muted/30 p-3 rounded-lg border space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-xs">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Estructura de Precios y Márgenes Comerciales
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-medium text-muted-foreground text-[11px]">Costo Neto Referencial (S/)</label>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="0.00"
                        {...register('cost_price', { valueAsNumber: true })}
                        className="mt-1 h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-foreground text-[11px]">Precio Venta Normal / Minorista (S/)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register('sale_price', { valueAsNumber: true })}
                        className="mt-1 h-8 text-xs font-mono font-bold text-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-foreground text-[11px]">Precio Mayorista (S/)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register('wholesale_price', { valueAsNumber: true })}
                        className="mt-1 h-8 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-muted-foreground text-[11px]">Precio Promocional (S/)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register('promo_price', { valueAsNumber: true })}
                        className="mt-1 h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-muted-foreground text-[11px]">Comisión Vendedor (%)</label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="ej: 3.5"
                        {...register('commission_rate', { valueAsNumber: true })}
                        className="mt-1 h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-muted-foreground text-[11px]">Precio Mínimo de Descuento (S/)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register('min_price', { valueAsNumber: true })}
                        className="mt-1 h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. TAB: VARIACIONES DE PRODUCTO Y ATRIBUTOS */}
            {activeTab === 'variants' && (
              <div className="space-y-4">
                {/* Banner explicativo de variaciones */}
                <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    Arquitectura de Variaciones de Producto (Atributos, Unidades y Variantes)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Gestiona las variaciones técnicas y comerciales de tus productos con trazabilidad en 3 niveles:
                    <br />
                    1. <strong>Unidad de Cantidad Base:</strong> Unidad SUNAT oficial (<strong>{watch('sunat_unit_code') || 'NIU'}</strong>), convertible a cajas/fardos en la pestaña <em>Presentaciones</em>.
                    <br />
                    2. <strong>Atributos del Artículo:</strong> Ejes diferenciadores como Color, Calibre/Grosor, Acabado o Talla.
                    <br />
                    3. <strong>Variaciones del Artículo:</strong> Cada unidad comerciable con su SKU hijo propio, código de barras específico, precio diferenciado y stock físico.
                  </p>
                </div>

                {/* SECCIÓN 1: ATRIBUTOS DEL ARTÍCULO */}
                <div className="p-3 bg-card rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        Atributos del Artículo (Ejes de Variación)
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Define los ejes que diferencian las variaciones de este artículo.
                      </p>
                    </div>
                  </div>

                  {/* Badges de Atributos Activos */}
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[30px] p-2 bg-muted/20 rounded-md border border-dashed">
                    {(watch('attributes') || []).length > 0 ? (
                      (watch('attributes') || []).map((attr, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {attr}
                          <button
                            type="button"
                            onClick={() => {
                              const current = watch('attributes') || [];
                              setValue('attributes', current.filter((_, i) => i !== idx));
                            }}
                            className="hover:text-destructive ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">
                        No hay atributos configurados. Agrega uno abajo o usa las sugerencias rápidas.
                      </span>
                    )}
                  </div>

                  {/* Input para agregar nuevo atributo + Sugerencias */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="ej: Color, Calibre, Acabado, Medida, Talla, Voltaje..."
                        value={newAttributeInput}
                        onChange={(e) => setNewAttributeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = newAttributeInput.trim();
                            if (val) {
                              const current = watch('attributes') || [];
                              if (!current.includes(val)) {
                                setValue('attributes', [...current, val]);
                              }
                              setNewAttributeInput('');
                            }
                          }
                        }}
                        className="h-8 text-xs font-medium"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const val = newAttributeInput.trim();
                          if (val) {
                            const current = watch('attributes') || [];
                            if (!current.includes(val)) {
                              setValue('attributes', [...current, val]);
                            }
                            setNewAttributeInput('');
                          }
                        }}
                        className="h-8 text-xs shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Agregar Atributo
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-[10px] uppercase">Sugerencias:</span>
                      {['Color', 'Medida / Dimensión', 'Calibre / Grosor', 'Acabado / Material', 'Talla', 'Potencia / Voltaje'].map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              const current = watch('attributes') || [];
                              if (!current.includes(preset)) {
                                setValue('attributes', [...current, preset]);
                              }
                            }}
                            className="px-2 py-0.5 rounded border bg-background hover:bg-muted text-[10px] transition-colors"
                          >
                            + {preset}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 2: VARIACIONES DEL ARTÍCULO (MATRIZ FÍSICA) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <Boxes className="h-3.5 w-3.5 text-emerald-600" />
                        Variaciones del Artículo ({variantFields.length})
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Cada variación física cuenta con su propio SKU hijo, código de barras, precio diferenciado y stock.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const baseSku = (watch('sku') || 'ART').trim().toUpperCase();
                        appendVariant({
                          variant_name: '',
                          sku: `${baseSku}-V${variantFields.length + 1}`,
                          barcode: '',
                          additional_cost: 0,
                          price_override: undefined,
                          current_stock: 0,
                          is_active: true,
                        });
                      }}
                      className="h-7 text-xs gap-1 border-emerald-600/30 text-emerald-600 hover:bg-emerald-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      + Agregar Variante
                    </Button>
                  </div>

                  <div className="border rounded-md overflow-hidden bg-card">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b text-muted-foreground text-[11px]">
                        <tr>
                          <th className="p-2">Nombre de Variante *</th>
                          <th className="p-2 w-36">SKU Hijo *</th>
                          <th className="p-2 w-32">Cód. Barras</th>
                          <th className="p-2 w-24 text-right">Sobrecosto (S/)</th>
                          <th className="p-2 w-24 text-right">Precio Venta (S/)</th>
                          <th className="p-2 w-24 text-right">Stock Inicial</th>
                          <th className="p-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs">
                        {variantFields.map((field, idx) => (
                          <tr key={field.id} className="hover:bg-muted/20">
                            <td className="p-2">
                              <Input
                                placeholder="ej: Negro / Calibre 12, Rojo / XL..."
                                {...register(`variants.${idx}.variant_name`)}
                                className="h-7 text-xs font-medium"
                              />
                              {errors.variants?.[idx]?.variant_name && (
                                <p className="text-destructive text-[10px] mt-0.5">
                                  {errors.variants[idx]?.variant_name?.message}
                                </p>
                              )}
                            </td>
                            <td className="p-2">
                              <Input
                                placeholder="SKU-VAR"
                                {...register(`variants.${idx}.sku`)}
                                className="h-7 text-xs font-mono font-bold uppercase"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                placeholder="EAN variante"
                                {...register(`variants.${idx}.barcode`)}
                                className="h-7 text-xs font-mono"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...register(`variants.${idx}.additional_cost`, { valueAsNumber: true })}
                                className="h-7 text-xs text-right font-mono"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Base"
                                {...register(`variants.${idx}.price_override`, { valueAsNumber: true })}
                                className="h-7 text-xs text-right font-mono font-bold text-emerald-600"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0"
                                {...register(`variants.${idx}.current_stock`, { valueAsNumber: true })}
                                className="h-7 text-xs text-right font-mono font-semibold"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVariant(idx)}
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {variantFields.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-muted-foreground space-y-1">
                              <p className="font-medium text-foreground">Este artículo no tiene variantes específicas.</p>
                              <p className="text-[11px]">
                                Si tu producto se vende en diferentes colores, calibres, medidas o tallas, haz clic en "+ Agregar Variante" para crearlas con su propio SKU y control de stock.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. TAB: PRESENTACIONES Y CONVERSIONES (OBS 10, 25) */}
            {activeTab === 'presentations' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-xs">
                    Define las unidades de presentación para compras y ventas con su factor de conversión a la unidad base.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendPresentation({
                        presentation_name: 'Caja x 50',
                        factor: 50,
                        sunat_unit_code: 'BX',
                        is_default: false,
                      })
                    }
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Agregar Presentación
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground">
                      <tr>
                        <th className="p-2">Presentación</th>
                        <th className="p-2 w-28 text-right">Factor Conv.</th>
                        <th className="p-2 w-32">Unidad SUNAT</th>
                        <th className="p-2 w-32">Cód. Barras</th>
                        <th className="p-2 w-28 text-right">Precio Ref.</th>
                        <th className="p-2 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {presentationFields.map((field, idx) => (
                        <tr key={field.id} className="hover:bg-muted/20">
                          <td className="p-2">
                            <Input
                              placeholder="ej: Caja x 50, Fardo x 24..."
                              {...register(`presentations.${idx}.presentation_name`)}
                              className="h-7 text-xs"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              min="0.0001"
                              step="any"
                              {...register(`presentations.${idx}.factor`, { valueAsNumber: true })}
                              className="h-7 text-xs text-right font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              {...register(`presentations.${idx}.sunat_unit_code`)}
                              className="w-full h-7 rounded-md border border-input bg-background px-2 text-xs"
                            >
                              {sunatUnits.map((u) => (
                                <option key={u.code} value={u.code}>{u.code}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder="EAN empaque"
                              {...register(`presentations.${idx}.barcode`)}
                              className="h-7 text-xs font-mono"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...register(`presentations.${idx}.sale_price`, { valueAsNumber: true })}
                              className="h-7 text-xs text-right font-mono"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={presentationFields.length <= 1}
                              onClick={() => removePresentation(idx)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. TAB: PROVEEDORES ASOCIADOS (OBS 6, 12) */}
            {activeTab === 'suppliers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-xs">
                    Proveedores autorizados que comercializan o importan este producto.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendSupplier({
                        supplier_id: suppliersList[0]?.id || '',
                        currency_code: 'PEN',
                        lead_time_days: 7,
                        is_preferred: supplierFields.length === 0,
                      })
                    }
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Asociar Proveedor
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground">
                      <tr>
                        <th className="p-2">Proveedor</th>
                        <th className="p-2 w-36">Cód. Producto Prov.</th>
                        <th className="p-2 w-28 text-right">Costo Cotiz.</th>
                        <th className="p-2 w-20">Moneda</th>
                        <th className="p-2 w-24 text-center">Preferido</th>
                        <th className="p-2 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {supplierFields.map((field, idx) => (
                        <tr key={field.id} className="hover:bg-muted/20">
                          <td className="p-2">
                            <select
                              {...register(`suppliers.${idx}.supplier_id`)}
                              className="w-full h-7 rounded-md border border-input bg-background px-2 text-xs"
                            >
                              {suppliersList.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.legal_name} ({s.doc_number})
                                </option>
                              ))}
                              {suppliersList.length === 0 && (
                                <option value="">(Sin proveedores registrados)</option>
                              )}
                            </select>
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder="Cód. catálogo prov."
                              {...register(`suppliers.${idx}.supplier_product_code`)}
                              className="h-7 text-xs font-mono"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              step="0.0001"
                              placeholder="0.00"
                              {...register(`suppliers.${idx}.purchase_cost`, { valueAsNumber: true })}
                              className="h-7 text-xs text-right font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              {...register(`suppliers.${idx}.currency_code`)}
                              className="w-full h-7 rounded-md border border-input bg-background px-1 text-xs"
                            >
                              <option value="PEN">PEN</option>
                              <option value="USD">USD</option>
                            </select>
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              {...register(`suppliers.${idx}.is_preferred`)}
                              className="rounded"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSupplier(idx)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {supplierFields.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-3 text-center text-muted-foreground">
                            No hay proveedores vinculados. Haz clic en "+ Asociar Proveedor".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isEdit ? 'Guardar Cambios' : 'Registrar Producto'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL MANTENEDOR DE CATÁLOGOS */}
      <CatalogsManagerModal
        isOpen={isCatalogsModalOpen}
        onClose={() => {
          setIsCatalogsModalOpen(false);
          loadCatalogs();
        }}
      />
    </>
  );
};

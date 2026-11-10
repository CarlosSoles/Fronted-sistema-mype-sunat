import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { inventoryApi } from '../services/inventoryApi';
import {
  Tag,
  Building,
  Layers,
  Sparkles,
  Plus,
  Check,
  BookOpen,
  Pencil,
  Trash2,
  X,
  Save,
  Globe,
} from 'lucide-react';

interface CatalogsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'brands' | 'models' | 'categories' | 'manufacturers' | 'tags' | 'units';
}

interface EditState {
  type: 'brand' | 'model' | 'category' | 'manufacturer' | 'tag';
  id: string;
  name: string;
  code?: string;
  description?: string;
  brand_name?: string;
  sunat_code?: string;
  country_code?: string;
  website?: string;
  contact_info?: string;
  color?: string;
}

export const CatalogsManagerModal: React.FC<CatalogsManagerModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'brands',
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'brands' | 'models' | 'categories' | 'manufacturers' | 'tags' | 'units'>(defaultTab);

  // Estados de formularios para nuevos registros
  const [brandName, setBrandName] = useState('');
  const [brandCode, setBrandCode] = useState('');
  const [brandDesc, setBrandDesc] = useState('');

  const [modelName, setModelName] = useState('');
  const [modelCode, setModelCode] = useState('');
  const [modelBrand, setModelBrand] = useState('');
  const [modelDesc, setModelDesc] = useState('');

  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catSunatCode, setCatSunatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const [manufName, setManufName] = useState('');
  const [manufCountry, setManufCountry] = useState('PE');
  const [manufWeb, setManufWeb] = useState('');
  const [manufContact, setManufContact] = useState('');

  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('emerald');

  // Estado para edición activa
  const [editingItem, setEditingItem] = useState<EditState | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setFeedback(msg);
    setErrorMsg(null);
    setTimeout(() => setFeedback(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Queries
  const { data: brands = [], refetch: refetchBrands } = useQuery({
    queryKey: ['inventory-catalogs-brands'],
    queryFn: inventoryApi.getBrands,
    enabled: isOpen,
  });

  const { data: models = [], refetch: refetchModels } = useQuery({
    queryKey: ['inventory-catalogs-models'],
    queryFn: inventoryApi.getModels,
    enabled: isOpen,
  });

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['inventory-catalogs-categories'],
    queryFn: inventoryApi.getCategories,
    enabled: isOpen,
  });

  const { data: manufacturers = [], refetch: refetchManufacturers } = useQuery({
    queryKey: ['inventory-catalogs-manufacturers'],
    queryFn: inventoryApi.getManufacturers,
    enabled: isOpen,
  });

  const { data: tags = [], refetch: refetchTags } = useQuery({
    queryKey: ['inventory-catalogs-tags'],
    queryFn: inventoryApi.getTags,
    enabled: isOpen,
  });

  const { data: sunatUnits = [] } = useQuery({
    queryKey: ['inventory-catalogs-units'],
    queryFn: inventoryApi.getUnits,
    enabled: isOpen,
  });

  // Mutaciones de Creación
  const createBrandMut = useMutation({
    mutationFn: () => inventoryApi.createBrand({ name: brandName, code: brandCode || undefined, description: brandDesc || undefined }),
    onSuccess: () => {
      setBrandName('');
      setBrandCode('');
      setBrandDesc('');
      refetchBrands();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-brands'] });
      showSuccess('Marca registrada y guardada en base de datos con éxito');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Error al registrar la marca'),
  });

  const createModelMut = useMutation({
    mutationFn: () => inventoryApi.createModel({
      name: modelName,
      code: modelCode || undefined,
      brand_name: modelBrand || undefined,
      description: modelDesc || undefined,
    }),
    onSuccess: () => {
      setModelName('');
      setModelCode('');
      setModelBrand('');
      setModelDesc('');
      refetchModels();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-models'] });
      showSuccess('Modelo registrado y guardado en base de datos con éxito');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Error al registrar el modelo'),
  });

  const createCatMut = useMutation({
    mutationFn: () => inventoryApi.createCategory({
      name: catName,
      code: catCode || undefined,
      sunat_code: catSunatCode || undefined,
      description: catDesc || undefined,
    }),
    onSuccess: () => {
      setCatName('');
      setCatCode('');
      setCatSunatCode('');
      setCatDesc('');
      refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-categories'] });
      showSuccess('Categoría registrada y guardada en base de datos con éxito');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Error al registrar la categoría'),
  });

  const createManufMut = useMutation({
    mutationFn: () => inventoryApi.createManufacturer({
      name: manufName,
      country_code: manufCountry,
      website: manufWeb || undefined,
      contact_info: manufContact || undefined,
    }),
    onSuccess: () => {
      setManufName('');
      setManufWeb('');
      setManufContact('');
      refetchManufacturers();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-manufacturers'] });
      showSuccess('Fabricante registrado y guardado en base de datos con éxito');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Error al registrar el fabricante'),
  });

  const createTagMut = useMutation({
    mutationFn: () => inventoryApi.createTag({ name: tagName, color: tagColor }),
    onSuccess: () => {
      setTagName('');
      refetchTags();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-tags'] });
      showSuccess('Etiqueta registrada y guardada en base de datos con éxito');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Error al registrar la etiqueta'),
  });

  // Mutaciones de Actualización (Edición)
  const updateBrandMut = useMutation({
    mutationFn: (data: { id: string; name?: string; code?: string; description?: string }) =>
      inventoryApi.updateBrand(data.id, { name: data.name, code: data.code, description: data.description }),
    onSuccess: () => {
      setEditingItem(null);
      refetchBrands();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-brands'] });
      showSuccess('Marca actualizada con éxito');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Error al actualizar la marca'),
  });

  const deleteBrandMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteBrand(id),
    onSuccess: () => {
      refetchBrands();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-brands'] });
      showSuccess('Marca desactivada correctamente');
    },
  });

  const updateModelMut = useMutation({
    mutationFn: (data: { id: string; name?: string; code?: string; brand_name?: string; description?: string }) =>
      inventoryApi.updateModel(data.id, {
        name: data.name,
        code: data.code,
        brand_name: data.brand_name,
        description: data.description,
      }),
    onSuccess: () => {
      setEditingItem(null);
      refetchModels();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-models'] });
      showSuccess('Modelo actualizado con éxito');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Error al actualizar el modelo'),
  });

  const deleteModelMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteModel(id),
    onSuccess: () => {
      refetchModels();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-models'] });
      showSuccess('Modelo desactivado correctamente');
    },
  });

  const updateCatMut = useMutation({
    mutationFn: (data: { id: string; name?: string; code?: string; sunat_code?: string; description?: string }) =>
      inventoryApi.updateCategory(data.id, {
        name: data.name,
        code: data.code,
        sunat_code: data.sunat_code,
        description: data.description,
      }),
    onSuccess: () => {
      setEditingItem(null);
      refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-categories'] });
      showSuccess('Categoría actualizada con éxito');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Error al actualizar la categoría'),
  });

  const deleteCatMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteCategory(id),
    onSuccess: () => {
      refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-categories'] });
      showSuccess('Categoría desactivada correctamente');
    },
  });

  const updateManufMut = useMutation({
    mutationFn: (data: { id: string; name?: string; country_code?: string; website?: string; contact_info?: string }) =>
      inventoryApi.updateManufacturer(data.id, {
        name: data.name,
        country_code: data.country_code,
        website: data.website,
        contact_info: data.contact_info,
      }),
    onSuccess: () => {
      setEditingItem(null);
      refetchManufacturers();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-manufacturers'] });
      showSuccess('Fabricante actualizado con éxito');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Error al actualizar el fabricante'),
  });

  const deleteManufMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteManufacturer(id),
    onSuccess: () => {
      refetchManufacturers();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-manufacturers'] });
      showSuccess('Fabricante desactivado correctamente');
    },
  });

  const updateTagMut = useMutation({
    mutationFn: (data: { id: string; name?: string; color?: string }) =>
      inventoryApi.updateTag(data.id, { name: data.name, color: data.color }),
    onSuccess: () => {
      setEditingItem(null);
      refetchTags();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-tags'] });
      showSuccess('Etiqueta actualizada con éxito');
    },
    onError: (err: any) => showError(err?.response?.data?.message || 'Error al actualizar la etiqueta'),
  });

  const deleteTagMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteTag(id),
    onSuccess: () => {
      refetchTags();
      queryClient.invalidateQueries({ queryKey: ['inventory-catalogs-tags'] });
      showSuccess('Etiqueta eliminada correctamente');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto text-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Mantenedores Oficiales de Inventario y Catálogo (SUNAT)
          </DialogTitle>
          <p className="text-muted-foreground text-xs">
            Gestión centralizada y editable de marcas, modelos, categorías, unidades de medida SUNAT, fabricantes y etiquetas clasificatorias.
          </p>
        </DialogHeader>

        {feedback && (
          <div className="bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 p-2.5 rounded-md flex items-center gap-2 text-xs">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" /> {feedback}
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-950/40 text-rose-300 border border-rose-500/40 p-2.5 rounded-md flex items-center gap-2 text-xs">
            <X className="h-4 w-4 shrink-0 text-rose-400" /> {errorMsg}
          </div>
        )}

        {/* Pestañas de navegación de mantenedores */}
        <div className="flex flex-wrap gap-1 border-b pb-2">
          <Button
            size="sm"
            variant={activeTab === 'brands' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('brands'); setEditingItem(null); }}
            className="h-8 text-xs gap-1.5"
          >
            <Building className="h-3.5 w-3.5" /> Marcas ({brands.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'categories' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('categories'); setEditingItem(null); }}
            className="h-8 text-xs gap-1.5"
          >
            <Layers className="h-3.5 w-3.5" /> Categorías ({categories.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'models' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('models'); setEditingItem(null); }}
            className="h-8 text-xs gap-1.5"
          >
            <Tag className="h-3.5 w-3.5" /> Modelos ({models.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'manufacturers' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('manufacturers'); setEditingItem(null); }}
            className="h-8 text-xs gap-1.5"
          >
            <Globe className="h-3.5 w-3.5" /> Fabricantes ({manufacturers.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'units' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('units'); setEditingItem(null); }}
            className="h-8 text-xs gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5" /> Unidades SUNAT ({sunatUnits.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'tags' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('tags'); setEditingItem(null); }}
            className="h-8 text-xs gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" /> Etiquetas ({tags.length})
          </Button>
        </div>

        {/* 1. MARCAS */}
        {activeTab === 'brands' && (
          <div className="space-y-4 pt-2">
            {editingItem?.type === 'brand' ? (
              <Card className="p-3 bg-amber-950/20 border-amber-600/40">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                    <Pencil className="h-3.5 w-3.5 text-amber-400" /> Editando Marca: {editingItem.name}
                  </h4>
                  <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="h-6 w-6 p-0 text-zinc-400">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-400">Nombre de la Marca *</label>
                    <Input
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Código Nemotécnico</label>
                    <Input
                      value={editingItem.code || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })}
                      className="h-8 text-xs mt-1 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Descripción / Rubro</label>
                    <Input
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="h-7 text-xs">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateBrandMut.mutate({
                      id: editingItem.id,
                      name: editingItem.name,
                      code: editingItem.code,
                      description: editingItem.description,
                    })}
                    disabled={!editingItem.name.trim() || updateBrandMut.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" /> Guardar Cambios
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-3 bg-muted/30">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5 text-emerald-600" /> Registrar Nueva Marca
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Nombre de la Marca *</label>
                    <Input
                      placeholder="ej: Siderperú, Bosch, Sol..."
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Código Nemotécnico</label>
                    <Input
                      placeholder="ej: SID, BOS..."
                      value={brandCode}
                      onChange={(e) => setBrandCode(e.target.value.toUpperCase())}
                      className="h-8 text-xs mt-1 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Descripción / Rubro</label>
                    <Input
                      placeholder="ej: Fierro corrugado y perfiles"
                      value={brandDesc}
                      onChange={(e) => setBrandDesc(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={() => createBrandMut.mutate()}
                    disabled={!brandName.trim() || createBrandMut.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                  >
                    Guardar Marca
                  </Button>
                </div>
              </Card>
            )}

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b">
                  <tr className="text-muted-foreground font-medium">
                    <th className="p-2 w-28">Código</th>
                    <th className="p-2">Marca</th>
                    <th className="p-2">Descripción</th>
                    <th className="p-2 text-center w-20">Estado</th>
                    <th className="p-2 text-right w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {brands.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20">
                      <td className="p-2 font-mono font-bold text-emerald-600">{b.code}</td>
                      <td className="p-2 font-medium">{b.name}</td>
                      <td className="p-2 text-muted-foreground">{b.description || '—'}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-[10px]">Activo</Badge>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-amber-400"
                            title="Editar marca"
                            onClick={() => setEditingItem({
                              type: 'brand',
                              id: b.id,
                              name: b.name,
                              code: b.code,
                              description: b.description || '',
                            })}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-rose-400"
                            title="Desactivar marca"
                            onClick={() => {
                              if (window.confirm(`¿Desactivar la marca "${b.name}"?`)) {
                                deleteBrandMut.mutate(b.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {brands.length === 0 && (
                    <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">Sin marcas registradas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. CATEGORÍAS */}
        {activeTab === 'categories' && (
          <div className="space-y-4 pt-2">
            {editingItem?.type === 'category' ? (
              <Card className="p-3 bg-amber-950/20 border-amber-600/40">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                    <Pencil className="h-3.5 w-3.5 text-amber-400" /> Editando Categoría: {editingItem.name}
                  </h4>
                  <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="h-6 w-6 p-0 text-zinc-400">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-400">Nombre de Categoría *</label>
                    <Input
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Código de Categoría</label>
                    <Input
                      value={editingItem.code || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })}
                      className="h-8 text-xs mt-1 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Código SUNAT (UNSPSC)</label>
                    <Input
                      value={editingItem.sunat_code || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, sunat_code: e.target.value })}
                      className="h-8 text-xs mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Descripción</label>
                    <Input
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="h-7 text-xs">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateCatMut.mutate({
                      id: editingItem.id,
                      name: editingItem.name,
                      code: editingItem.code,
                      sunat_code: editingItem.sunat_code,
                      description: editingItem.description,
                    })}
                    disabled={!editingItem.name.trim() || updateCatMut.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" /> Guardar Cambios
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-3 bg-muted/30">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5 text-emerald-600" /> Registrar Nueva Categoría
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Nombre de Categoría *</label>
                    <Input
                      placeholder="ej: Tuberías y Conexiones"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Código de Categoría</label>
                    <Input
                      placeholder="ej: TUB"
                      value={catCode}
                      onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                      className="h-8 text-xs mt-1 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Código SUNAT (UNSPSC)</label>
                    <Input
                      placeholder="ej: 40171500"
                      value={catSunatCode}
                      onChange={(e) => setCatSunatCode(e.target.value)}
                      className="h-8 text-xs mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Descripción</label>
                    <Input
                      placeholder="ej: Conexiones sanitarias y PVC"
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={() => createCatMut.mutate()}
                    disabled={!catName.trim() || createCatMut.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                  >
                    Guardar Categoría
                  </Button>
                </div>
              </Card>
            )}

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b">
                  <tr className="text-muted-foreground font-medium">
                    <th className="p-2 w-28">Código</th>
                    <th className="p-2">Categoría</th>
                    <th className="p-2">Cód. SUNAT</th>
                    <th className="p-2">Descripción</th>
                    <th className="p-2 text-center w-20">Estado</th>
                    <th className="p-2 text-right w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="p-2 font-mono font-bold text-emerald-600">{c.code}</td>
                      <td className="p-2 font-medium">{c.name}</td>
                      <td className="p-2 font-mono text-muted-foreground">{c.sunat_code || '—'}</td>
                      <td className="p-2 text-muted-foreground">{c.description || '—'}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-[10px]">Activo</Badge>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-amber-400"
                            title="Editar categoría"
                            onClick={() => setEditingItem({
                              type: 'category',
                              id: c.id,
                              name: c.name,
                              code: c.code,
                              sunat_code: c.sunat_code || '',
                              description: c.description || '',
                            })}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-rose-400"
                            title="Desactivar categoría"
                            onClick={() => {
                              if (window.confirm(`¿Desactivar la categoría "${c.name}"?`)) {
                                deleteCatMut.mutate(c.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">Sin categorías registradas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. MODELOS */}
        {activeTab === 'models' && (
          <div className="space-y-4 pt-2">
            {editingItem?.type === 'model' ? (
              <Card className="p-3 bg-amber-950/20 border-amber-600/40">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                    <Pencil className="h-3.5 w-3.5 text-amber-400" /> Editando Modelo: {editingItem.name}
                  </h4>
                  <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="h-6 w-6 p-0 text-zinc-400">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-400">Nombre del Modelo *</label>
                    <Input
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Código de Modelo</label>
                    <Input
                      value={editingItem.code || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })}
                      className="h-8 text-xs mt-1 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Marca Asociada</label>
                    <select
                      value={editingItem.brand_name || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, brand_name: e.target.value })}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                    >
                      <option value="">(Sin marca específica)</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Descripción</label>
                    <Input
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="h-7 text-xs">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateModelMut.mutate({
                      id: editingItem.id,
                      name: editingItem.name,
                      code: editingItem.code,
                      brand_name: editingItem.brand_name,
                      description: editingItem.description,
                    })}
                    disabled={!editingItem.name.trim() || updateModelMut.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" /> Guardar Cambios
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-3 bg-muted/30">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5 text-emerald-600" /> Registrar Nuevo Modelo
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Nombre del Modelo *</label>
                    <Input
                      placeholder="ej: GSB 13 RE, D-60..."
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Código de Modelo</label>
                    <Input
                      placeholder="ej: MOD-GSB13"
                      value={modelCode}
                      onChange={(e) => setModelCode(e.target.value.toUpperCase())}
                      className="h-8 text-xs mt-1 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Marca Asociada</label>
                    <select
                      value={modelBrand}
                      onChange={(e) => setModelBrand(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                    >
                      <option value="">(Sin marca específica)</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Descripción</label>
                    <Input
                      placeholder="ej: Taladro percutor mandril 1/2"
                      value={modelDesc}
                      onChange={(e) => setModelDesc(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={() => createModelMut.mutate()}
                    disabled={!modelName.trim() || createModelMut.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                  >
                    Guardar Modelo
                  </Button>
                </div>
              </Card>
            )}

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b">
                  <tr className="text-muted-foreground font-medium">
                    <th className="p-2 w-28">Código</th>
                    <th className="p-2">Modelo</th>
                    <th className="p-2">Marca</th>
                    <th className="p-2">Descripción</th>
                    <th className="p-2 text-right w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {models.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="p-2 font-mono font-bold text-emerald-600">{m.code}</td>
                      <td className="p-2 font-medium">{m.name}</td>
                      <td className="p-2 text-muted-foreground">
                        {m.brand_name ? <Badge variant="secondary" className="text-[10px]">{m.brand_name}</Badge> : '—'}
                      </td>
                      <td className="p-2 text-muted-foreground">{m.description || '—'}</td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-amber-400"
                            title="Editar modelo"
                            onClick={() => setEditingItem({
                              type: 'model',
                              id: m.id,
                              name: m.name,
                              code: m.code,
                              brand_name: m.brand_name || '',
                              description: m.description || '',
                            })}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-rose-400"
                            title="Desactivar modelo"
                            onClick={() => {
                              if (window.confirm(`¿Desactivar el modelo "${m.name}"?`)) {
                                deleteModelMut.mutate(m.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {models.length === 0 && (
                    <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">Sin modelos registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. FABRICANTES */}
        {activeTab === 'manufacturers' && (
          <div className="space-y-4 pt-2">
            {editingItem?.type === 'manufacturer' ? (
              <Card className="p-3 bg-amber-950/20 border-amber-600/40">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                    <Pencil className="h-3.5 w-3.5 text-amber-400" /> Editando Fabricante: {editingItem.name}
                  </h4>
                  <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="h-6 w-6 p-0 text-zinc-400">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-400">Razón Social / Nombre *</label>
                    <Input
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">País de Origen (ISO)</label>
                    <select
                      value={editingItem.country_code || 'PE'}
                      onChange={(e) => setEditingItem({ ...editingItem, country_code: e.target.value })}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                    >
                      <option value="PE">PE — Perú</option>
                      <option value="CN">CN — China</option>
                      <option value="US">US — Estados Unidos</option>
                      <option value="DE">DE — Alemania</option>
                      <option value="JP">JP — Japón</option>
                      <option value="BR">BR — Brasil</option>
                      <option value="IT">IT — Italia</option>
                      <option value="ES">ES — España</option>
                      <option value="MX">MX — México</option>
                      <option value="CO">CO — Colombia</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Sitio Web / Catálogo</label>
                    <Input
                      value={editingItem.website || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, website: e.target.value })}
                      className="h-8 text-xs mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Contacto / RUC / Info</label>
                    <Input
                      value={editingItem.contact_info || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, contact_info: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="h-7 text-xs">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateManufMut.mutate({
                      id: editingItem.id,
                      name: editingItem.name,
                      country_code: editingItem.country_code,
                      website: editingItem.website,
                      contact_info: editingItem.contact_info,
                    })}
                    disabled={!editingItem.name.trim() || updateManufMut.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" /> Guardar Cambios
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-3 bg-muted/30">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5 text-emerald-600" /> Registrar Nuevo Fabricante
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Razón Social / Nombre *</label>
                    <Input
                      placeholder="ej: UNACEM S.A.A., Mexichem..."
                      value={manufName}
                      onChange={(e) => setManufName(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">País de Origen (ISO)</label>
                    <select
                      value={manufCountry}
                      onChange={(e) => setManufCountry(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                    >
                      <option value="PE">PE — Perú</option>
                      <option value="CN">CN — China</option>
                      <option value="US">US — Estados Unidos</option>
                      <option value="DE">DE — Alemania</option>
                      <option value="JP">JP — Japón</option>
                      <option value="BR">BR — Brasil</option>
                      <option value="IT">IT — Italia</option>
                      <option value="ES">ES — España</option>
                      <option value="MX">MX — México</option>
                      <option value="CO">CO — Colombia</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Sitio Web / Catálogo</label>
                    <Input
                      placeholder="https://..."
                      value={manufWeb}
                      onChange={(e) => setManufWeb(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Contacto / RUC / Info</label>
                    <Input
                      placeholder="RUC 2010... / ventas@..."
                      value={manufContact}
                      onChange={(e) => setManufContact(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={() => createManufMut.mutate()}
                    disabled={!manufName.trim() || createManufMut.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                  >
                    Guardar Fabricante
                  </Button>
                </div>
              </Card>
            )}

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b">
                  <tr className="text-muted-foreground font-medium">
                    <th className="p-2">Fabricante</th>
                    <th className="p-2 w-20 text-center">País</th>
                    <th className="p-2">Sitio Web</th>
                    <th className="p-2">Contacto / Detalle</th>
                    <th className="p-2 text-right w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {manufacturers.map((mf) => (
                    <tr key={mf.id} className="hover:bg-muted/20">
                      <td className="p-2 font-medium">{mf.name}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="font-mono text-emerald-400 text-[10px]">
                          {mf.country_code}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground font-mono text-[11px]">
                        {mf.website ? (
                          <a href={mf.website.startsWith('http') ? mf.website : `https://${mf.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-400">
                            {mf.website}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="p-2 text-muted-foreground text-[11px]">{mf.contact_info || '—'}</td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-amber-400"
                            title="Editar fabricante"
                            onClick={() => setEditingItem({
                              type: 'manufacturer',
                              id: mf.id,
                              name: mf.name,
                              country_code: mf.country_code,
                              website: mf.website || '',
                              contact_info: mf.contact_info || '',
                            })}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-400 hover:text-rose-400"
                            title="Desactivar fabricante"
                            onClick={() => {
                              if (window.confirm(`¿Desactivar el fabricante "${mf.name}"?`)) {
                                deleteManufMut.mutate(mf.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {manufacturers.length === 0 && (
                    <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">Sin fabricantes registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. UNIDADES OFICIALES SUNAT */}
        {activeTab === 'units' && (
          <div className="space-y-3 pt-2">
            <div className="bg-muted/20 p-2.5 rounded border text-[11px] text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Catálogo normativo oficial según la <strong>Tabla 6 de la Resolución de Superintendencia SUNAT</strong> para Facturación Electrónica y Libros Electrónicos PLE 12.1 / 13.1.
              </span>
            </div>
            <div className="border rounded-md overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b sticky top-0">
                  <tr className="text-muted-foreground font-medium">
                    <th className="p-2 w-24">Código SUNAT</th>
                    <th className="p-2">Descripción Oficial</th>
                    <th className="p-2 w-24 text-center">Símbolo</th>
                    <th className="p-2 text-center w-20">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sunatUnits.map((u) => (
                    <tr key={u.code} className="hover:bg-muted/20">
                      <td className="p-2 font-mono font-bold text-emerald-600">{u.code}</td>
                      <td className="p-2 font-medium">{u.name}</td>
                      <td className="p-2 text-center font-mono text-muted-foreground">{u.symbol || '—'}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-[10px]">Vigente</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. ETIQUETAS / TAGS */}
        {activeTab === 'tags' && (
          <div className="space-y-4 pt-2">
            {editingItem?.type === 'tag' ? (
              <Card className="p-3 bg-amber-950/20 border-amber-600/40">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                    <Pencil className="h-3.5 w-3.5 text-amber-400" /> Editando Etiqueta: {editingItem.name}
                  </h4>
                  <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="h-6 w-6 p-0 text-zinc-400">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-400">Nombre de Etiqueta *</label>
                    <Input
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Color de Distintivo</label>
                    <select
                      value={editingItem.color || 'emerald'}
                      onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                    >
                      <option value="emerald">Verde Esmeralda (Activos / Alta Rotación)</option>
                      <option value="amber">Ámbar / Naranja (Alerta / En Tránsito / Pesado)</option>
                      <option value="blue">Azul (Comercial / Obra Civil)</option>
                      <option value="purple">Púrpura (Importaciones / Acabados Finos)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="h-7 text-xs">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateTagMut.mutate({
                      id: editingItem.id,
                      name: editingItem.name,
                      color: editingItem.color,
                    })}
                    disabled={!editingItem.name.trim() || updateTagMut.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" /> Guardar Cambios
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-3 bg-muted/30">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5 text-emerald-600" /> Crear Nueva Etiqueta
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Nombre de Etiqueta *</label>
                    <Input
                      placeholder="ej: rotacion-alta, importado-directo, obra-publica..."
                      value={tagName}
                      onChange={(e) => setTagName(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Color de Distintivo</label>
                    <select
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                    >
                      <option value="emerald">Verde Esmeralda (Activos / Alta Rotación)</option>
                      <option value="amber">Ámbar / Naranja (Alerta / En Tránsito / Pesado)</option>
                      <option value="blue">Azul (Comercial / Obra Civil)</option>
                      <option value="purple">Púrpura (Importaciones / Acabados Finos)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={() => createTagMut.mutate()}
                    disabled={!tagName.trim() || createTagMut.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                  >
                    Guardar Etiqueta
                  </Button>
                </div>
              </Card>
            )}

            <div className="flex flex-wrap gap-2 p-3 bg-card border rounded-md">
              {tags.map((t) => (
                <div key={t.id} className="flex items-center gap-1 bg-zinc-800/80 border border-zinc-700/80 rounded px-2.5 py-1 text-xs">
                  <span className={`h-2 w-2 rounded-full ${
                    t.color === 'purple' ? 'bg-purple-400' :
                    t.color === 'amber' ? 'bg-amber-400' :
                    t.color === 'blue' ? 'bg-blue-400' : 'bg-emerald-400'
                  }`} />
                  <span className="font-medium text-zinc-200">{t.name}</span>
                  <div className="flex items-center ml-2 border-l border-zinc-700 pl-1.5 gap-0.5">
                    <button
                      type="button"
                      className="text-zinc-400 hover:text-amber-400 p-0.5"
                      title="Editar etiqueta"
                      onClick={() => setEditingItem({
                        type: 'tag',
                        id: t.id,
                        name: t.name,
                        color: t.color || 'emerald',
                      })}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="text-zinc-400 hover:text-rose-400 p-0.5"
                      title="Eliminar etiqueta"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la etiqueta "${t.name}"?`)) {
                          deleteTagMut.mutate(t.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {tags.length === 0 && (
                <p className="text-muted-foreground text-xs">Sin etiquetas configuradas.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

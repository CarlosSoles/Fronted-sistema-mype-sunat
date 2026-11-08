import React, { useState, useEffect } from 'react';
import { Page, PageHeader, Button, Card, Badge, Input } from '@/components/ui';
import {
  Building2,
  Plus,
  Search,
  Globe,
  Ship,
  Landmark,
  Mail,
  Phone,
  Trash2,
  Edit2,
  Loader2,
} from 'lucide-react';
import { catalogsApi } from '../services/catalogsApi';
import type { ForeignSupplierSummary } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const INITIAL_FORM = {
  businessName: '',
  taxId: '',
  countryCode: 'CN',
  address: '',
  email: '',
  phone: '',
  contactName: '',
  paymentTerms: '30_DIAS',
  bankName: '',
  bankAccount: '',
  swiftCode: '',
  vesselName: '',
  voyageNumber: '',
  blNumber: '',
  portOrigin: '',
  isRelated: false,
};

export default function ForeignSuppliersPage() {
  const [suppliers, setSuppliers] = useState<ForeignSupplierSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const data = await catalogsApi.getForeignSuppliers();
      setSuppliers(data || []);
    } catch {
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSuppliers();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: ForeignSupplierSummary) => {
    setEditingId(sup.id);
    setForm({
      businessName: sup.business_name || '',
      taxId: sup.tax_id || '',
      countryCode: sup.country_code || 'CN',
      address: sup.address || '',
      email: sup.email || '',
      phone: sup.phone || '',
      contactName: sup.contact_name || '',
      paymentTerms: sup.payment_terms || '30_DIAS',
      bankName: sup.bank_name || '',
      bankAccount: sup.bank_account || '',
      swiftCode: sup.swift_code || '',
      vesselName: sup.vessel_name || '',
      voyageNumber: sup.voyage_number || '',
      blNumber: sup.bl_number || '',
      portOrigin: sup.port_origin || '',
      isRelated: !!sup.is_related,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el proveedor exterior "${name}"?`)) return;
    try {
      await catalogsApi.deleteForeignSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert('No se pudo eliminar el proveedor. Es posible que tenga órdenes o expedientes vinculados.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) {
      setError('La razón social es obligatoria.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      businessName: form.businessName.trim(),
      taxId: form.taxId.trim() || undefined,
      countryCode: form.countryCode.toUpperCase().trim(),
      address: form.address.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      contactName: form.contactName.trim() || undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      bankName: form.bankName.trim() || undefined,
      bankAccount: form.bankAccount.trim() || undefined,
      swiftCode: form.swiftCode.trim() || undefined,
      vesselName: form.vesselName.trim() || undefined,
      voyageNumber: form.voyageNumber.trim() || undefined,
      blNumber: form.blNumber.trim() || undefined,
      portOrigin: form.portOrigin.trim() || undefined,
      isRelated: form.isRelated,
    };

    try {
      if (editingId) {
        const updated = await catalogsApi.updateForeignSupplier(editingId, payload);
        setSuppliers((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...updated } : s)));
      } else {
        const created = await catalogsApi.createForeignSupplier(payload);
        setSuppliers((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error al guardar proveedor exterior.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.business_name?.toLowerCase().includes(q) ||
      s.tax_id?.toLowerCase().includes(q) ||
      s.country_code?.toLowerCase().includes(q) ||
      s.bank_name?.toLowerCase().includes(q) ||
      s.vessel_name?.toLowerCase().includes(q)
    );
  });

  const totalCountries = new Set(suppliers.map((s) => s.country_code).filter(Boolean)).size;
  const withBank = suppliers.filter((s) => s.bank_name || s.swift_code).length;
  const withVessel = suppliers.filter((s) => s.vessel_name || s.bl_number).length;

  return (
    <Page>
      <PageHeader
        title="Proveedores del Exterior"
        description="Maestro de proveedores internacionales, datos bancarios (SWIFT) y características de embarque aduanero."
      >
        <Button onClick={handleOpenCreate} className="gap-2 text-xs">
          <Plus className="h-4 w-4" />
          Nuevo Proveedor del Exterior
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-4">
        <Card className="p-3 bg-card border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Total Proveedores</p>
              <p className="text-xl font-bold">{suppliers.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-card border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Países de Origen</p>
              <p className="text-xl font-bold">{totalCountries}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-card border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Con Banco / SWIFT</p>
              <p className="text-xl font-bold">{withBank}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-card border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <Ship className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Logística / Buque</p>
              <p className="text-xl font-bold">{withVessel}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Barra de Filtro */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razón social, Tax ID, país, banco o buque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Tabla Principal */}
      <Card className="overflow-hidden border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Proveedor / Razón Social</th>
                <th className="py-2.5 px-3 font-semibold">País</th>
                <th className="py-2.5 px-3 font-semibold">Tax ID / VAT</th>
                <th className="py-2.5 px-3 font-semibold">Datos Bancarios (SWIFT)</th>
                <th className="py-2.5 px-3 font-semibold">Embarcación / Puerto</th>
                <th className="py-2.5 px-3 font-semibold">Contacto</th>
                <th className="py-2.5 px-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Cargando proveedores del exterior...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No se encontraron proveedores del exterior registrados.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{sup.business_name}</span>
                        {sup.is_related && (
                          <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-300">
                            Vinculado
                          </Badge>
                        )}
                      </div>
                      {sup.address && <p className="text-[10px] text-muted-foreground truncate max-w-xs">{sup.address}</p>}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{sup.country_code}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">
                      {sup.tax_id || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {sup.bank_name || sup.swift_code ? (
                        <div className="text-[11px]">
                          <p className="font-semibold text-foreground flex items-center gap-1">
                            <Landmark className="h-3 w-3 text-primary" />
                            {sup.bank_name || 'Banco no especificado'}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            SWIFT: {sup.swift_code || '—'} · Cta: {sup.bank_account || '—'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Sin banco registrado</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {sup.vessel_name || sup.port_origin ? (
                        <div className="text-[11px]">
                          <p className="font-semibold text-foreground flex items-center gap-1">
                            <Ship className="h-3 w-3 text-blue-500" />
                            {sup.vessel_name || 'Buque s/n'} {sup.voyage_number ? `(V.${sup.voyage_number})` : ''}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Pto: {sup.port_origin || '—'} · BL: {sup.bl_number || '—'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-[11px] space-y-0.5">
                        {sup.contact_name && <p className="font-medium">{sup.contact_name}</p>}
                        {sup.email && (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Mail className="h-2.5 w-2.5" />
                            {sup.email}
                          </p>
                        )}
                        {sup.phone && (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />
                            {sup.phone}
                          </p>
                        )}
                        {!sup.contact_name && !sup.email && !sup.phone && (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(sup)}
                          title="Editar Proveedor"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive"
                          onClick={() => handleDelete(sup.id, sup.business_name)}
                          title="Eliminar Proveedor"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Creación / Edición */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {editingId ? 'Editar Proveedor del Exterior' : 'Registrar Proveedor del Exterior'}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-4 text-xs">
              {error && (
                <div className="p-2.5 rounded bg-destructive/15 text-destructive border border-destructive/20 text-xs">
                  {error}
                </div>
              )}

              {/* Sección 1: Datos Generales */}
              <div className="border-b pb-3">
                <h4 className="font-semibold text-foreground uppercase text-[11px] mb-2">1. Datos Generales</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-medium block mb-1">Razón Social *</label>
                    <Input
                      placeholder="Ej: Shenzhen Yantian Electronics Co., Ltd."
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">País (ISO-2) *</label>
                    <Input
                      placeholder="CN, US, DE, JP..."
                      value={form.countryCode}
                      onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })}
                      required
                      maxLength={2}
                      className="h-8 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <div>
                    <label className="font-medium block mb-1">Tax ID / Código Fiscal Extranjero</label>
                    <Input
                      placeholder="91440300MA5..."
                      value={form.taxId}
                      onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">Términos de Pago</label>
                    <Input
                      placeholder="30_DIAS, CONTADO, CARTA_CREDITO..."
                      value={form.paymentTerms}
                      onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">Vinculación OMC (Art. 24)</label>
                    <select
                      value={form.isRelated ? 'SI' : 'NO'}
                      onChange={(e) => setForm({ ...form, isRelated: e.target.value === 'SI' })}
                      className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background"
                    >
                      <option value="NO">No Vinculado (Independiente)</option>
                      <option value="SI">Sí Vinculado (Filial / Matriz)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2">
                  <label className="font-medium block mb-1">Dirección en País de Origen</label>
                  <Input
                    placeholder="Calle, Parque Industrial, Ciudad, Código Postal..."
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Sección 2: Datos Bancarios Internacionales */}
              <div className="border-b pb-3">
                <h4 className="font-semibold text-foreground uppercase text-[11px] mb-2 flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-purple-600" />
                  2. Datos Bancarios Internacionales (Pagos al Exterior)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-medium block mb-1">Banco Receptor</label>
                    <Input
                      placeholder="Bank of China, HSBC, Wells Fargo..."
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">Código SWIFT / BIC</label>
                    <Input
                      placeholder="BKCHCNBJ..."
                      value={form.swiftCode}
                      onChange={(e) => setForm({ ...form, swiftCode: e.target.value.toUpperCase() })}
                      className="h-8 text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">N° de Cuenta / IBAN</label>
                    <Input
                      placeholder="Account / IBAN number..."
                      value={form.bankAccount}
                      onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Datos de Embarcación y Logística */}
              <div className="border-b pb-3">
                <h4 className="font-semibold text-foreground uppercase text-[11px] mb-2 flex items-center gap-1.5">
                  <Ship className="h-3.5 w-3.5 text-blue-600" />
                  3. Logística de Transporte y Embarcación
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-medium block mb-1">Nombre de Embarcación / Buque</label>
                    <Input
                      placeholder="MSC ARIES, EVER GIVEN..."
                      value={form.vesselName}
                      onChange={(e) => setForm({ ...form, vesselName: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">N° de Viaje / Vuelo</label>
                    <Input
                      placeholder="2601W, QR814..."
                      value={form.voyageNumber}
                      onChange={(e) => setForm({ ...form, voyageNumber: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">N° Documento Transporte (BL / AWB)</label>
                    <Input
                      placeholder="MSK-9901824..."
                      value={form.blNumber}
                      onChange={(e) => setForm({ ...form, blNumber: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">Puerto / Ciudad de Origen</label>
                    <Input
                      placeholder="SHANGHAI, NINGBO, MIAMI..."
                      value={form.portOrigin}
                      onChange={(e) => setForm({ ...form, portOrigin: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 4: Contacto Comercial */}
              <div>
                <h4 className="font-semibold text-foreground uppercase text-[11px] mb-2">4. Contacto Comercial</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-medium block mb-1">Nombre de Contacto</label>
                    <Input
                      placeholder="Mr. Chen Wei / John Doe"
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">Email de Contacto</label>
                    <Input
                      type="email"
                      placeholder="export@supplier.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-medium block mb-1">Teléfono / WhatsApp</label>
                    <Input
                      placeholder="+86 755 8888 9999"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar Proveedor' : 'Crear Proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
